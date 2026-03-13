#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import OpenAI from "openai";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function printHelp() {
  console.log(`
AI Recipe Rewrite (Vegan Masala)

USAGE
  node scripts/ai-rewrite-recipe.mjs --latest
  node scripts/ai-rewrite-recipe.mjs --file content/recipes/chana-masala.mdx
  node scripts/ai-rewrite-recipe.mjs --slug chana-masala

OPTIONS
  Target:
    --latest
    --file <path>
    --slug <slug>
    --only <slug>            Alias for --slug

  AI:
    --model <name>           Default: gpt-4o-mini

  Behaviour:
    --dry-run                Don’t call OpenAI or write anything
    --no-write               Call AI but print rewritten MDX instead of saving
    --no-backup              Don’t create .bak backup before overwriting

EXAMPLES
  node scripts/ai-rewrite-recipe.mjs --latest
  node scripts/ai-rewrite-recipe.mjs --slug bombay-aloo
  node scripts/ai-rewrite-recipe.mjs --file content/recipes/x.mdx --no-write
`);
}

function getAllRecipePaths() {
  if (!fs.existsSync(RECIPES_DIR)) die(`Missing folder: ${RECIPES_DIR}`);
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f))
    .filter((p) => fs.statSync(p).isFile());
}

function getLatestRecipePath() {
  const files = getAllRecipePaths();
  if (!files.length) die("No recipe files found.");
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

function findRecipeBySlug(slug) {
  const files = getAllRecipePaths();

  for (const p of files) {
    const base = path.basename(p).replace(/\.mdx?$/i, "");
    if (base === slug) return p;
  }

  for (const p of files) {
    const raw = fs.readFileSync(p, "utf8");
    const fm = raw.match(/^---\s*[\s\S]*?\s*---/);
    if (!fm) continue;
    const m = fm[0].match(/^\s*slug\s*:\s*(.+)\s*$/im);
    if (!m) continue;
    const val = String(m[1] ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (val === slug) return p;
  }

  return null;
}

function extractHeadingBlock(body, headingAlternativesRegex) {
  const re = new RegExp(
    `(^|\\n)##\\s+(${headingAlternativesRegex})\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|\\s*$)`,
    "i"
  );
  const m = re.exec(body);
  return m ? (m[3] || "").trim() : "";
}

function parseBullets(block) {
  if (!block) return [];
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-+\s+/, "").trim())
    .filter(Boolean);
}

function parseNumbered(block) {
  if (!block) return [];
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

function ensureBullets(items) {
  return items
    .map((s) => String(s).trim())
    .filter(Boolean)
    .map((s) => `- ${s}`)
    .join("\n");
}

function ensureNumbered(items) {
  return items
    .map((s) => String(s).trim())
    .filter(Boolean)
    .map((s, i) => `${i + 1}. ${s.replace(/^\d+\.\s+/, "")}`)
    .join("\n");
}

function jsonFromModel(text) {
  const cleaned = String(text)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function buildBody({ ingredients, instructions, notes }) {
  return [
    "## Ingredients",
    ingredients.length ? ensureBullets(ingredients) : "-",
    "",
    "## Method",
    instructions.length ? ensureNumbered(instructions) : "1. ",
    "",
    "## Notes",
    notes.length ? ensureBullets(notes) : "-",
    "",
  ].join("\n");
}

function cleanArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[()]/g, "")
    .replace(/[_]/g, " ")
    .replace(/\s+/g, " ");
}

function toInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const i = Math.round(v);
  return i > 0 ? i : null;
}

function reorderIngredientsByInstructions(ingredients, instructions) {
  const instructionText = instructions.join(" ").toLowerCase();

  const ranked = ingredients.map((ingredient, idx) => {
    const base = String(ingredient)
      .toLowerCase()
      .split(",")[0]
      .trim();

    const candidates = [
      base,
      base.replace(/\bfinely chopped\b/g, "").trim(),
      base.replace(/\bchopped\b/g, "").trim(),
      base.replace(/\bminced\b/g, "").trim(),
      base.replace(/\bgrated\b/g, "").trim(),
      base.replace(/\bcubed\b/g, "").trim(),
      base.replace(/^\d+([/.]\d+)?\s*(tsp|tbsp|cup|cups|g|kg|ml|l|clove|cloves|inch|inches)\s+/g, "").trim(),
    ].filter(Boolean);

    let found = 999999;
    for (const c of candidates) {
      const pos = instructionText.indexOf(c);
      if (pos !== -1 && pos < found) found = pos;
    }

    return { ingredient, pos: found, idx };
  });

  ranked.sort((a, b) => {
    if (a.pos === b.pos) return a.idx - b.idx;
    return a.pos - b.pos;
  });

  return ranked.map((r) => r.ingredient);
}

function generateFallbackNotes({ title, slug, tags }) {
  const txt = `${title ?? ""} ${slug ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase();
  const notes = [];

  if (/\bdal|dahl|lentil|moong|masoor|urad\b/.test(txt)) {
    notes.push("Add a splash of water when reheating if the dal thickens too much.");
  }

  if (/\bpotato|potatoes|aloo\b/.test(txt)) {
    notes.push("Cut the potatoes evenly so they cook at the same rate.");
  }

  if (/\beggplant|aubergine|brinjal|baingan\b/.test(txt)) {
    notes.push("Cook the aubergine until soft but still holding its shape for the best texture.");
  }

  if (/\btofu\b/.test(txt)) {
    notes.push("Use firm tofu for the best texture and avoid stirring too aggressively once added.");
  }

  if (/\bchickpea|chana|chole|rajma|bean|beans\b/.test(txt)) {
    notes.push("This dish often tastes even better the next day once the spices have had time to settle.");
  }

  if (/\bvindaloo\b/.test(txt)) {
    notes.push("Adjust the chilli level to suit your preferred heat.");
  }

  if (/\bcurry|masala|korma|vindaloo|sabzi|baingan|dal\b/.test(txt)) {
    notes.push("Serve with basmati rice, naan, or roti for a full meal.");
  }

  notes.push("Store leftovers in an airtight container in the fridge for up to 3 days.");

  return Array.from(new Set(notes)).slice(0, 4);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const useLatest = args.includes("--latest");
  const dryRun = args.includes("--dry-run");
  const noWrite = args.includes("--no-write");
  const noBackup = args.includes("--no-backup");

  const modelIdx = args.indexOf("--model");
  const model = modelIdx !== -1 ? args[modelIdx + 1] : "gpt-4o-mini";
  if (modelIdx !== -1 && !model) die("Missing value for --model");

  const fileIdx = args.indexOf("--file");
  let filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
  if (fileIdx !== -1 && !filePath) die("Missing value for --file");

  const slugIdx = args.indexOf("--slug");
  let slug = slugIdx !== -1 ? args[slugIdx + 1] : null;
  if (slugIdx !== -1 && !slug) die("Missing value for --slug");

  const onlyIdx = args.indexOf("--only");
  if (!slug && onlyIdx !== -1) {
    slug = args[onlyIdx + 1];
    if (!slug) die("Missing value for --only");
  }

  if (!filePath) {
    const positional = args.find((a) => a.endsWith(".mdx") || a.endsWith(".md"));
    if (positional) filePath = positional;
  }

  if (!filePath && slug) {
    const hit = findRecipeBySlug(slug);
    if (!hit) die(`Could not find recipe with slug: ${slug}`);
    filePath = hit;
  }

  if (!filePath && useLatest) filePath = getLatestRecipePath();

  if (!filePath) {
    die(`Usage:
  node scripts/ai-rewrite-recipe.mjs --latest
  node scripts/ai-rewrite-recipe.mjs --file content/recipes/x.mdx
  node scripts/ai-rewrite-recipe.mjs --slug some-slug`);
  }

  if (!path.isAbsolute(filePath)) filePath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(filePath)) die(`File not found: ${filePath}`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !dryRun) die("Missing OPENAI_API_KEY in environment (.env.local).");

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  const title = data?.title ? String(data.title) : null;
  const recipeSlug =
    typeof data?.slug === "string" && data.slug.trim()
      ? String(data.slug).trim()
      : path.basename(filePath).replace(/\.mdx?$/i, "");
  const cuisine = data?.cuisine ? String(data.cuisine) : "Indian";
  const description = data?.description ? String(data.description) : "";

  if (!title) die("Missing frontmatter title.");

  const ingBlock = extractHeadingBlock(content, "Ingredients|Ingredient");
  const methodBlock = extractHeadingBlock(content, "Method|Instructions");
  const notesBlock = extractHeadingBlock(content, "Notes|Tips");

  const ingredients =
    Array.isArray(data.ingredients) && data.ingredients.length
      ? data.ingredients.map(String)
      : parseBullets(ingBlock);

  const instructions =
    Array.isArray(data.instructions) && data.instructions.length
      ? data.instructions.map(String)
      : parseNumbered(methodBlock);

  const notes =
    Array.isArray(data.notes) && data.notes.length
      ? data.notes.map(String)
      : parseBullets(notesBlock);

  const currentTags = cleanArray(data?.tags ?? []);
  const currentPrep = toInt(data?.prepMinutes);
  const currentCook = toInt(data?.cookMinutes);
  const currentServings = toInt(data?.servings) ?? toInt(data?.serves);

  console.log(`\n📄 Target: ${path.relative(process.cwd(), filePath)}`);
  console.log(`🧾 Title: ${title}`);
  console.log(`🍛 Cuisine: ${cuisine}`);
  console.log(`🧺 Ingredients: ${ingredients.length}`);
  console.log(`🧑‍🍳 Steps: ${instructions.length}`);
  console.log(`📝 Notes: ${notes.length}`);
  console.log(`🏷️  Tags (current): ${currentTags.length}`);
  console.log(`⏱️  Prep/Cook (current): ${currentPrep ?? "—"} / ${currentCook ?? "—"}`);
  console.log(`🤖 Model: ${model}`);

  if (dryRun) {
    ok("Dry run complete (no AI call, no writing).");
    return;
  }

  const client = new OpenAI({ apiKey });

  const prompt = `
You are rewriting a Vegan Masala recipe entry in a consistent house style.

Return ONLY valid JSON with this shape:
{
  "title": "recipe title",
  "description": "1-2 sentence punchy description (Indian, practical, weeknight-friendly).",
  "ingredients": ["..."],
  "instructions": ["Step 1...", "Step 2...", "..."],
  "notes": ["Bullet 1...", "Bullet 2...", "..."],
  "tags": ["tag one", "tag two", "..."],
  "prepMinutes": 10,
  "cookMinutes": 20,
  "servings": 4
}

Rules:
- This site is 100% vegan. If ingredients contain ANY non-vegan items, you MUST replace them with realistic plant-based alternatives.
- Do NOT mention the word "vegan" repeatedly in the ingredients list. Just do substitutions.
- Keep the recipe authentic where possible.

Title rules:
- Keep the original dish recognisable.
- Improve clarity slightly if needed.
- Do not make the title excessively long.

Ingredients rules:
- Keep ingredients in the order they are used in the method.
- Do NOT sort alphabetically.
- If the recipe has a garnish or final finishing ingredient, place it near the end.
- Add realistic quantities and brief prep notes where helpful (for example: "1 large onion, finely chopped").
- Keep simple ingredient phrases.
- Remove duplicates and obvious junk.
- Use British English ingredient names (chilli, coriander, yoghurt).

Instructions rules:
- Clear, concise, British English, assume home cook.
- If substitutions affect method (e.g. tofu instead of paneer), adjust steps accordingly.
- Avoid fluff. Avoid brand names.
- Make sure the order of ingredients matches the order they first appear in the instructions.

Notes rules:
- Helpful tips, substitutions, storage/reheating, spice adjustments.
- Mention substitutions only if it matters.
- If the source recipe has no notes, still return 2-4 useful notes.

Tags rules:
- Provide 3 to 8 tags.
- Tags must be lower-case short phrases (2–4 words max).
- Remove generic tags like "easy", "recipe", "dinner", "lunch", "vegan", "indian".
- Prefer ingredients + dish style tags (e.g. "potato curry", "chickpeas", "one-pot").

Time rules:
- Always return prepMinutes and cookMinutes as integers.
- If times were provided, keep them unless clearly nonsensical.
- If missing, infer reasonable values from steps + ingredients (weeknight-friendly when possible).
- Do not return 0 or null.

Servings rules:
- Always return servings as an integer (default 4 if unknown).

Use ONLY the provided title/cuisine/ingredients/instructions/notes/tags/times as your source.
If something is missing, don’t invent loads of new ingredients — only tiny essentials if truly required (like oil/salt).
`.trim();

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: [{ type: "input_text", text: prompt }] },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(
              {
                title,
                slug: recipeSlug,
                cuisine,
                description,
                ingredients,
                instructions,
                notes,
                tags: currentTags,
                prepMinutes: currentPrep,
                cookMinutes: currentCook,
                servings: currentServings,
              },
              null,
              2
            ),
          },
        ],
      },
    ],
  });

  const outText = response.output_text;
  if (!outText) die("No output_text received from model.");

  let rewritten;
  try {
    rewritten = jsonFromModel(outText);
  } catch (e) {
    console.error("\nModel did not return valid JSON. Raw output:\n");
    console.error(outText);
    throw e;
  }

  const newTitle = String(rewritten.title || "").trim();
  const newDescription = String(rewritten.description || "").trim();

  const newIngredients = cleanArray(rewritten.ingredients);
  const newInstructions = cleanArray(rewritten.instructions);
  let newNotes = cleanArray(rewritten.notes);
  const newTags = cleanArray(rewritten.tags);

  let prepMinutes = toInt(rewritten.prepMinutes) ?? currentPrep ?? 10;
  let cookMinutes = toInt(rewritten.cookMinutes) ?? currentCook ?? 20;
  let servings = toInt(rewritten.servings) ?? currentServings ?? 4;

  if (!newTitle) warn("Model returned empty title; keeping existing.");
  if (!newDescription) warn("Model returned empty description; keeping existing.");
  if (!newIngredients.length) warn("Model returned no ingredients; keeping existing.");
  if (!newInstructions.length) warn("Model returned no instructions; keeping existing.");
  if (!newNotes.length) warn("Model returned no notes; generating fallback notes.");

  const finalTitle = newTitle || title;
  const finalDescription = newDescription || description;
  const finalIngredients = newIngredients.length ? newIngredients : ingredients;
  const finalInstructions = newInstructions.length ? newInstructions : instructions;

  if (!newNotes.length) {
    newNotes = generateFallbackNotes({
      title: finalTitle,
      slug: recipeSlug,
      tags: newTags.length ? newTags : currentTags,
    });
  }

  const finalNotes = newNotes.length ? newNotes : notes;
  const finalTags = newTags.length ? newTags : currentTags;
  const orderedIngredients = reorderIngredientsByInstructions(finalIngredients, finalInstructions);

  const fm = {
    ...data,
    title: finalTitle,
    description: finalDescription,
    cuisine: data?.cuisine ?? cuisine,
    prepMinutes,
    cookMinutes,
    servings,
    tags: finalTags,
    diet: Array.isArray(data?.diet)
      ? Array.from(new Set([...data.diet.map(String), "vegan"]))
      : ["vegan"],
    ingredients: orderedIngredients,
    instructions: finalInstructions,
    notes: finalNotes,
  };

  const nextMdx = matter.stringify(
    buildBody({
      ingredients: orderedIngredients,
      instructions: finalInstructions,
      notes: finalNotes,
    }),
    fm
  );

  if (noWrite) {
    console.log("\n--- REWRITTEN MDX (no-write) ---\n");
    process.stdout.write(nextMdx);
    console.log("\n--- END ---\n");
    ok("Done (no-write).");
    return;
  }

  if (!noBackup) {
    const bak = `${filePath}.bak`;
    fs.copyFileSync(filePath, bak);
    ok(`Backup created: ${path.relative(process.cwd(), bak)}`);
  }

  fs.writeFileSync(filePath, nextMdx, "utf8");
  ok(`Updated: ${path.relative(process.cwd(), filePath)}`);
  ok(`Tags ensured: ${finalTags.length}`);
  ok(`Times ensured: prep ${prepMinutes} min / cook ${cookMinutes} min`);
  ok(`Notes ensured: ${finalNotes.length}`);
}

main().catch((err) => {
  console.error("\n❌ Script failed:\n", err);
  process.exit(1);
});