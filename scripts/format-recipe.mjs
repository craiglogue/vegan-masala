#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function getLatestRecipePath() {
  if (!fs.existsSync(RECIPES_DIR)) die(`Missing folder: ${RECIPES_DIR}`);
  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f));

  if (!files.length) die("No recipe files found.");

  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

function normStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

function asStringArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") {
    // allow "a, b, c" or "a\nb\nc"
    const parts = v.includes("\n") ? v.split("\n") : v.split(",");
    return parts.map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function titleCaseTag(s) {
  // keeps your canonical tags as-is if already slug-like
  const t = String(s).trim();
  return t;
}

function extractHeadingBlock(body, heading) {
  const re = new RegExp(
    `(^|\\n)##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|\\s*$)`,
    "i"
  );
  const m = re.exec(body);
  return m ? (m[2] || "").trim() : "";
}

function ensureBullets(lines) {
  // Ensure each item is "- ..."
  return lines
    .map((s) => String(s).trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("- ") ? s : `- ${s}`))
    .join("\n");
}

function ensureNumbered(lines) {
  // Ensure each step is "1. ..."
  return lines
    .map((s) => String(s).trim())
    .filter(Boolean)
    .map((s, i) => {
      const cleaned = s.replace(/^\d+\.\s+/, "");
      return `${i + 1}. ${cleaned}`;
    })
    .join("\n");
}

function buildHouseMdx(data, content) {
  // Pull existing section blocks (if any)
  const ingBlock = extractHeadingBlock(content, "Ingredients");
  const methodBlock = extractHeadingBlock(content, "Method|Instructions");
  const notesBlock = extractHeadingBlock(content, "Notes|Tips");

  // Prefer frontmatter arrays if present, else parse section blocks
  const ingredients = asStringArray(data.ingredients);
  const instructions = asStringArray(data.instructions);
  const notes = asStringArray(data.notes);

  const ingFromBody = ingBlock
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-+\s+/, "").trim());

  const methodFromBody = methodBlock
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim());

  const notesFromBody = notesBlock
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^-+\s+/, "").trim());

  const finalIngredients = ingredients.length ? ingredients : ingFromBody;
  const finalInstructions = instructions.length ? instructions : methodFromBody;
  const finalNotes = notes.length ? notes : notesFromBody;

  // House frontmatter order (keep it stable)
  const fm = {
    title: normStr(data.title),
    slug: normStr(data.slug),
    description: normStr(data.description) || undefined,
    cuisine: normStr(data.cuisine) || undefined,
    prepMinutes: data.prepMinutes ?? undefined,
    cookMinutes: data.cookMinutes ?? undefined,
    diet: asStringArray(data.diet).length ? asStringArray(data.diet) : undefined,
    tags: asStringArray(data.tags).map(titleCaseTag).length
      ? asStringArray(data.tags).map(titleCaseTag)
      : undefined,
    publishedAt: normStr(data.publishedAt) || undefined,
    serves: data.serves ?? undefined,
    servings: data.servings ?? undefined,
    spice: normStr(data.spice) || undefined,
    spiceLevel: normStr(data.spiceLevel) || undefined,
  };

  // Serialize YAML-ish frontmatter without extra deps
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${String(item)}`);
    } else {
      lines.push(`${k}: ${String(v)}`);
    }
  }
  lines.push("---", "");

  const bodyParts = [];

  bodyParts.push("## Ingredients", "", ensureBullets(finalIngredients), "");
  bodyParts.push("## Method", "", ensureNumbered(finalInstructions), "");
  bodyParts.push("## Notes", "", ensureBullets(finalNotes), "");

  return lines.join("\n") + bodyParts.join("\n").trim() + "\n";
}

function main() {
  const args = process.argv.slice(2);
  const useLatest = args.includes("--latest");

  let filePath = args.find((a) => a.endsWith(".mdx") || a.endsWith(".md"));
  if (!filePath && useLatest) filePath = getLatestRecipePath();
  if (!filePath) die(`Usage: node scripts/format-recipe.mjs --latest OR <path/to/file.mdx>`);

  if (!path.isAbsolute(filePath)) filePath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(filePath)) die(`File not found: ${filePath}`);

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data || {};
  const content = parsed.content || "";

  if (!data.title || !data.slug) {
    die("Missing frontmatter title or slug. Add them first.");
  }

  const out = buildHouseMdx(data, content);
  fs.writeFileSync(filePath, out, "utf8");
  console.log(`Formatted: ${path.relative(process.cwd(), filePath)}`);
}

main();