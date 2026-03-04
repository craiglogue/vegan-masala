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

function toSlugTag(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqLower(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr || []) {
    const v = String(x ?? "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function safeInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  const i = Math.round(n);
  return i > 0 ? i : undefined;
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
    Array.isArray(data.notes) && data.notes.length ? data.notes.map(String) : parseBullets(notesBlock);

  const existingPrep = safeInt(data?.prepMinutes);
  const existingCook = safeInt(data?.cookMinutes);
  const existingTags = Array.isArray(data?.tags) ? data.tags.map(String) : [];

  console.log(`\n📄 Target: ${path.relative(process.cwd(), filePath)}`);
  console.log(`🧾 Title: ${title}`);
  console.log(`🍛 Cuisine: ${cuisine}`);
  console.log(`🧺 Ingredients: ${ingredients.length}`);
  console.log(`🧑‍🍳 Steps: ${instructions.length}`);
  console.log(`📝 Notes: ${notes.length}`);
  console.log(`⏱️  Existing times: prep=${existingPrep ?? "—"} cook=${existingCook ?? "—"}`);
  console.log(`🏷️  Existing tags: ${existingTags.length}`);
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
  "description": "1-2 sentence punchy description (vegan, Indian, practical, weeknight-friendly).",
  "ingredients": ["..."],
  "instructions": ["Step 1...", "Step 2...", "..."],
  "notes": ["Bullet 1...", "Bullet 2...", "..."],
  "tags": ["short tag", "short tag", "..."],
  "prepMinutes": 10,
  "cookMinutes": 20
}

Rules:
- This site is 100% vegan. If the ingredients contain ANY non-vegan items, you MUST replace them with a realistic plant-based alternative.
- Do NOT repeatedly say "vegan" in the ingredients list. Just do the substitutions.
- Keep the recipe authentic where possible.

Non-vegan substitution rules (examples):
- paneer → firm tofu cubes OR vegan paneer
- curd/yogurt → unsweetened plant-based yogurt (coconut/soy)
- cream → coconut cream OR oat cream
- ghee/butter → vegan butter OR neutral oil
- milk → unsweetened plant milk
- honey → maple syrup or sugar
- eggs → flax egg or chickpea flour mixture (only if needed)
- chicken stock → vegetable stock
- fish sauce → soy sauce + lime (or vegan fish sauce)

Ingredients:
- Keep simple bullet-style ingredient phrases (no quantities needed if missing).
- Remove duplicates and obvious junk (e.g. repeated “salt”, weird casing).
- Use British English (chilli, coriander).
- Do NOT invent lots of new ingredients — only add tiny essentials if truly required (like “oil” or “salt”).

Instructions:
- Clear, concise, British English, assume a home cook.
- Avoid fluff. Avoid brand names unless essential.

Notes:
- Helpful tips, substitutions, storage/reheating, spice adjustments.
- Mention key substitutions if it matters (e.g. tofu instead of paneer) but keep it friendly.

Tags:
- Provide 3–6 useful, short tags. Prefer canonical categories like:
  "curries", "dal and lentils", "chickpeas", "beans", "tofu", "potatoes", "rice", "one-pot", "instant pot", "gluten-free"
- Keep tags lowercase, 1–3 words max, avoid duplicates and avoid the full recipe title as a tag.

Times:
- If prepMinutes/cookMinutes are already provided, DO NOT change them.
- If missing, estimate realistic minutes based on the method steps and typical Indian cooking.
- Use whole numbers, keep them reasonable (prep 5–25, cook 10–60 usually).

Use only the provided recipe title/cuisine/ingredients/instructions/notes as your source.
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
                prepMinutes: existingPrep ?? null,
                cookMinutes: existingCook ?? null,
                tags: existingTags,
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

  const newTagsRaw = Array.isArray(rewritten.tags)
    ? rewritten.tags.map((s) => String(s).trim()).filter(Boolean)
    : [];

  // Times: keep existing if present; otherwise adopt AI
  const aiPrep = safeInt(rewritten.prepMinutes);
  const aiCook = safeInt(rewritten.cookMinutes);
  const finalPrep = existingPrep ?? aiPrep;
  const finalCook = existingCook ?? aiCook;

  if (!newDescription) warn("Model returned empty description; keeping existing.");
  if (!newInstructions.length) warn("Model returned no instructions; keeping existing.");
  if (!newNotes.length) warn("Model returned no notes; keeping existing.");
  if (!newIngredients.length) warn("Model returned no ingredients; keeping existing.");
  if (!newTagsRaw.length) warn("Model returned no tags; keeping existing (or none).");

  const finalDescription = newDescription || description;
  const finalIngredients = newIngredients.length ? newIngredients : ingredients;
  const finalInstructions = newInstructions.length ? newInstructions : instructions;
  const finalNotes = newNotes.length ? newNotes : notes;

  // Tags: normalise, de-dupe, keep short set (3–8)
  const finalTags = (() => {
    const cleaned = uniqLower(newTagsRaw.map((t) => toSlugTag(t)).filter(Boolean));
    // Convert sluggy tags back to nicer spacing for display on cards
    const nice = cleaned.map((t) => t.replace(/-/g, " "));
    return nice.slice(0, 8);
  })();

  // ✅ Write arrays + tags + minutes into frontmatter
  const fm = {
    ...data,
    description: finalDescription,
    prepMinutes: finalPrep ?? data.prepMinutes,
    cookMinutes: finalCook ?? data.cookMinutes,
    tags: finalTags.length ? finalTags : data.tags,
    ingredients: finalIngredients,
    instructions: finalInstructions,
    notes: finalNotes,
  };

  const nextMdx = matter.stringify(
    buildBody({ ingredients: finalIngredients, instructions: finalInstructions, notes: finalNotes }),
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

  // Helpful console output
  console.log(
    `\n🏷️  Tags: ${Array.isArray(fm.tags) ? fm.tags.join(", ") : "—"}\n⏱️  Total: ${
      safeInt(fm.prepMinutes) || 0
    } + ${safeInt(fm.cookMinutes) || 0} min\n`
  );
}

main().catch((err) => {
  console.error("\n❌ Script failed:\n", err);
  process.exit(1);
});