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
AI Recipe Rewrite (Vegan Masala) — now enforces tags + prep/cook times

USAGE
  node scripts/ai-rewrite-recipe.mjs --latest
  node scripts/ai-rewrite-recipe.mjs --file content/recipes/chana-masala.mdx
  node scripts/ai-rewrite-recipe.mjs --slug chana-masala

OPTIONS
  Target:
    --latest                 Rewrite newest recipe file in content/recipes
    --file <path>            Rewrite an explicit .mdx/.md file
    --slug <slug>            Find recipe by filename slug or frontmatter slug

  AI:
    --model <name>           Model name (default: gpt-4o-mini)

  Behaviour:
    --dry-run                Don’t call OpenAI or write; just show selected file + extracted info
    --no-write               Call AI and print rewritten MDX to stdout, but do not overwrite file
    --no-backup              Don’t create a .bak copy before overwriting (default: backup ON)

EXAMPLES
  node scripts/ai-rewrite-recipe.mjs --latest
  node scripts/ai-rewrite-recipe.mjs --slug aloo-gobi --model gpt-4o-mini
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

  // 1) filename match
  for (const p of files) {
    const base = path.basename(p).replace(/\.mdx?$/i, "");
    if (base === slug) return p;
  }

  // 2) frontmatter slug match
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
    .map((s) => (s.startsWith("- ") ? s : `- ${s}`))
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
  const ing = ensureBullets(ingredients);
  const method = ensureNumbered(instructions);
  const n = ensureBullets(notes);

  return [
    `## Ingredients`,
    ing || `-`,
    ``,
    `## Method`,
    method || `1. `,
    ``,
    `## Notes`,
    n || `-`,
    ``,
  ].join("\n");
}

/**
 * Tag normalisation:
 * - lowercases
 * - strips punctuation
 * - removes duplicates
 * - removes junk/generic tags
 * - limits length
 */
const JUNK_TAGS = new Set([
  "lunch",
  "dinner",
  "breakfast",
  "snack",
  "easy",
  "quick",
  "recipe",
  "recipes",
  "vegan", // you already have diet for this
  "indian", // cuisine already
  "food",
  "curry recipe",
  "paneer recipe",
  "dinner party",
]);

function cleanTag(t) {
  return String(t)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/["']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 36);
}

function normaliseTags(tags) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(tags) ? tags : []) {
    const t = cleanTag(raw);
    if (!t) continue;
    if (JUNK_TAGS.has(t)) continue;
    if (t.length < 3) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Safe fallback time inference (if AI returns missing/invalid).
 * Keeps your recipe cards consistent (time badge always appears).
 */
function fallbackTimes({ ingredientsCount, stepsCount }) {
  // Prep: based on ingredient count, capped
  const prep = Math.max(10, Math.min(30, Math.round(ingredientsCount * 1.2)));
  // Cook: based on step count, capped
  const cook = Math.max(15, Math.min(75, Math.round(stepsCount * 6)));
  return { prepMinutes: prep, cookMinutes: cook };
}

function toInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const i = Math.round(v);
  if (i <= 0) return null;
  return i;
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
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : null;
  if (slugIdx !== -1 && !slug) die("Missing value for --slug");

  // Also allow passing a direct .mdx/.md path as positional
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
  const cuisine = data?.cuisine ? String(data.cuisine) : "Indian";
  const description = data?.description ? String(data.description) : "";

  if (!title) die("Missing frontmatter title.");

  const ingBlock = extractHeadingBlock(content, "Ingredients");
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

  const currentTags = normaliseTags(data?.tags ?? []);
  const currentPrep = toInt(data?.prepMinutes);
  const currentCook = toInt(data?.cookMinutes);
  const currentServings = toInt(data?.servings);

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

Non-vegan substitutions (examples):
- paneer → firm tofu cubes OR vegan paneer
- curd/yogurt → unsweetened plant-based yoghurt (coconut/soy)
- cream → coconut cream OR oat cream
- ghee/butter → vegan butter OR neutral oil
- milk → unsweetened plant milk
- honey → maple syrup or sugar
- eggs → flax egg or chickpea flour mixture (only if needed)
- chicken stock → vegetable stock

Ingredients rules:
- Keep simple ingredient phrases (no quantities needed if missing).
- Remove duplicates, fix weird casing, remove junk words.
- Use British English spellings (chilli, coriander, yoghurt).

Instructions rules:
- Clear, concise, British English, assume home cook.
- If substitutions affect method (e.g. tofu instead of paneer), adjust steps accordingly.
- Avoid fluff. Avoid brand names.

Notes rules:
- Useful tips, substitutions, storage/reheating, spice adjustments.
- Mention substitutions only if it matters.

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

  // ---- Extract + validate AI output ----
  const newDescription = String(rewritten.description || "").trim();

  const newIngredients = Array.isArray(rewritten.ingredients)
    ? rewritten.ingredients.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const newInstructions = Array.isArray(rewritten.instructions)
    ? rewritten.instructions.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const newNotes = Array.isArray(rewritten.notes)
    ? rewritten.notes.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const aiTagsRaw = Array.isArray(rewritten.tags) ? rewritten.tags : [];
  const newTags = normaliseTags(aiTagsRaw);

  let prepMinutes = toInt(rewritten.prepMinutes) ?? currentPrep;
  let cookMinutes = toInt(rewritten.cookMinutes) ?? currentCook;
  let servings = toInt(rewritten.servings) ?? currentServings ?? 4;

  // If any are missing/invalid, apply safe fallbacks so cards ALWAYS show time
  if (!prepMinutes || !cookMinutes) {
    const fb = fallbackTimes({
      ingredientsCount: newIngredients.length || ingredients.length,
      stepsCount: newInstructions.length || instructions.length,
    });
    prepMinutes = prepMinutes ?? fb.prepMinutes;
    cookMinutes = cookMinutes ?? fb.cookMinutes;
  }

  // Ensure tags ALWAYS exist (for card buttons)
  const finalTags =
    newTags.length >= 3
      ? newTags
      : // fallback tags if AI didn’t give enough
        normaliseTags([
          ...(newTags.length ? newTags : []),
          // lightweight defaults based on title words
          ...String(title)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .slice(0, 3),
          "weeknight curry",
          "indian mains",
        ]).slice(0, 8);

  if (!newDescription) warn("Model returned empty description; keeping existing.");
  if (!newIngredients.length) warn("Model returned no ingredients; keeping existing.");
  if (!newInstructions.length) warn("Model returned no instructions; keeping existing.");
  if (!newNotes.length) warn("Model returned no notes; keeping existing.");
  if (!finalTags.length) warn("No tags after normalisation; adding safe defaults.");
  if (!prepMinutes || !cookMinutes) warn("Missing prep/cook even after fallback (unexpected).");

  const finalDescription = newDescription || description;
  const finalIngredients = newIngredients.length ? newIngredients : ingredients;
  const finalInstructions = newInstructions.length ? newInstructions : instructions;
  const finalNotes = newNotes.length ? newNotes : notes;

  // ---- Write back to MDX (frontmatter + body) ----
  const fm = {
    ...data,
    description: finalDescription,
    cuisine: data?.cuisine ?? cuisine,

    // guaranteed for cards
    prepMinutes,
    cookMinutes,
    servings,

    // guaranteed for buttons
    tags: finalTags,

    // keep diet as-is, but ensure vegan is present
    diet: Array.isArray(data?.diet)
      ? Array.from(new Set([...data.diet.map(String), "vegan"]))
      : ["vegan"],

    // keep arrays in frontmatter for your loader/cards/schema
    ingredients: finalIngredients,
    instructions: finalInstructions,
    notes: finalNotes,
  };

  const nextMdx = matter.stringify(
    buildBody({
      ingredients: finalIngredients,
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
}

main().catch((err) => {
  console.error("\n❌ Script failed:\n", err);
  process.exit(1);
});