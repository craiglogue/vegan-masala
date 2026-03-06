#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

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

function getAllRecipePaths() {
  if (!fs.existsSync(RECIPES_DIR)) die(`Missing folder: ${RECIPES_DIR}`);
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f))
    .filter((p) => fs.statSync(p).isFile());
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

function uniq(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const v = String(item ?? "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function cleanIngredients(items) {
  return uniq(
    items.map((s) =>
      String(s)
        .replace(/\s+/g, " ")
        .replace(/\s+,/g, ",")
        .trim()
    )
  );
}

function cleanInstructions(items) {
  return items
    .map((s) =>
      String(s)
        .replace(/\s+/g, " ")
        .replace(/^\d+\.\s+/, "")
        .trim()
    )
    .filter(Boolean);
}

function cleanNotes(items) {
  return uniq(
    items.map((s) =>
      String(s)
        .replace(/\s+/g, " ")
        .trim()
    )
  );
}

function ensureBullets(items) {
  return items.map((s) => `- ${s}`).join("\n");
}

function ensureNumbered(items) {
  return items.map((s, i) => `${i + 1}. ${s}`).join("\n");
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

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.round(n);
  return i > 0 ? i : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const files = getAllRecipePaths();
  if (!files.length) die("No recipe files found.");

  let updated = 0;
  let skipped = 0;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = matter(raw);
    const data = parsed.data || {};
    const body = parsed.content || "";

    const ingBlock = extractHeadingBlock(body, "Ingredients|Ingredient");
    const methodBlock = extractHeadingBlock(body, "Method|Instructions|Instruction");
    const notesBlock = extractHeadingBlock(body, "Notes|Tips");

    const ingredients =
      Array.isArray(data.ingredients) && data.ingredients.length
        ? cleanIngredients(data.ingredients)
        : cleanIngredients(parseBullets(ingBlock));

    const instructions =
      Array.isArray(data.instructions) && data.instructions.length
        ? cleanInstructions(data.instructions)
        : cleanInstructions(parseNumbered(methodBlock));

    const notes =
      Array.isArray(data.notes) && data.notes.length
        ? cleanNotes(data.notes)
        : cleanNotes(parseBullets(notesBlock));

    if (!ingredients.length || !instructions.length) {
      warn(`Skipping incomplete recipe: ${path.basename(filePath)}`);
      skipped++;
      continue;
    }

    const nextData = {
      ...data,
      ingredients,
      instructions,
      notes,
      prepMinutes: toPositiveInt(data.prepMinutes, undefined),
      cookMinutes: toPositiveInt(data.cookMinutes, undefined),
      servings: toPositiveInt(data.servings, data.serves ?? 2),
    };

    // remove undefined keys so frontmatter stays tidy
    for (const k of Object.keys(nextData)) {
      if (nextData[k] === undefined) delete nextData[k];
    }

    const nextBody = buildBody({ ingredients, instructions, notes });
    const nextMdx = matter.stringify(nextBody, nextData);

    if (nextMdx === raw) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      const backup = `${filePath}.bak-structure`;
      if (!fs.existsSync(backup)) {
        fs.copyFileSync(filePath, backup);
      }
      fs.writeFileSync(filePath, nextMdx, "utf8");
    }

    ok(`${dryRun ? "[dry-run] Would update" : "Updated"}: ${path.relative(process.cwd(), filePath)}`);
    updated++;
  }

  console.log("\n--- Summary ---");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Script failed:\n", err);
  process.exit(1);
});