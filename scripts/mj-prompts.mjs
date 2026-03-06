#!/usr/bin/env node
/**
 * Midjourney Prompt Generator (Vegan Masala)
 *
 * Generates:
 *  - Hero prompt (to establish the "scene")
 *  - Step-by-step prompts using the SAME scene via IMAGE_URL (reference image)
 *  - Optional Pinterest prompt (2:3)
 *
 * Works with your MDX recipes in: content/recipes/*.mdx
 *
 * USAGE
 *   node scripts/mj-prompts.mjs --latest
 *   node scripts/mj-prompts.mjs --file content/recipes/bombay-aloo.mdx
 *   node scripts/mj-prompts.mjs --slug bombay-aloo
 *
 * OPTIONS
 *   Target:
 *     --latest                  Use newest recipe file in content/recipes
 *     --file <path>             Use a specific .mdx file
 *     --slug <slug>             Find by filename slug or frontmatter slug
 *
 *   Midjourney style:
 *     --ar <ratio>              Aspect ratio for hero/steps (default: 1:1)
 *     --style <name>            Midjourney style (default: raw)
 *     --v <version>             MJ version (default: 6)
 *     --seed <number>           Include --seed in prompts (optional)
 *
 *   Reference image:
 *     --img-url <url>           Include IMAGE_URL at start of each step prompt.
 *                               If not provided, script uses the placeholder "IMAGE_URL".
 *
 *   Output:
 *     --out <path>              Save prompts to a file (default: print to stdout)
 *     --no-pinterest            Don’t generate the Pinterest prompt
 *
 * NOTES
 *  1) Generate HERO first.
 *  2) Upscale & download.
 *  3) Re-upload hero into MJ as a reference image, then copy its URL.
 *  4) Re-run this script with --img-url "https://...".
 *  5) (Optional) Copy seed from MJ and rerun with --seed 123456 for extra consistency.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function printHelp() {
  console.log(
    `
MJ Prompt Generator (Vegan Masala)

USAGE
  node scripts/mj-prompts.mjs --latest
  node scripts/mj-prompts.mjs --file content/recipes/bombay-aloo.mdx
  node scripts/mj-prompts.mjs --slug bombay-aloo

OPTIONS
  Target:
    --latest
    --file <path>
    --slug <slug>

  Midjourney:
    --ar <ratio>          default: 1:1
    --style <name>        default: raw
    --v <version>         default: 6
    --seed <number>       optional

  Reference:
    --img-url <url>       optional. If omitted, prompts use "IMAGE_URL" placeholder.

  Output:
    --out <path>          optional, write prompts to file instead of stdout
    --no-pinterest        optional, skip Pinterest prompt
`.trim()
  );
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

/**
 * Extract numbered steps from the "## Method" / "## Instructions" section.
 * Falls back to frontmatter instructions: [ ... ]
 */
function extractStepsFromBody(body) {
  const re = /(^|\n)##\s+(Method|Instructions)\s*\n([\s\S]*?)(?=\n##\s+|\s*$)/i;
  const m = re.exec(body);
  if (!m) return [];

  const block = (m[3] || "").trim();
  if (!block) return [];

  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

function cleanStep(step) {
  return String(step).trim().replace(/\s+/g, " ").replace(/\.$/, "");
}

function titleCaseLoose(s) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function getCuisine(data) {
  const c = data?.cuisine ? String(data.cuisine).trim() : "";
  return c || "Indian";
}

function buildMjFlags({ ar, style, v, seed }) {
  const parts = [];
  if (style) parts.push(`--style ${style}`);
  if (v) parts.push(`--v ${v}`);
  if (ar) parts.push(`--ar ${ar}`);
  if (seed) parts.push(`--seed ${seed}`);
  return parts.join(" ");
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const useLatest = args.includes("--latest");

  const fileIdx = args.indexOf("--file");
  let filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
  if (fileIdx !== -1 && !filePath) die("Missing value for --file");

  const slugIdx = args.indexOf("--slug");
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : null;
  if (slugIdx !== -1 && !slug) die("Missing value for --slug");

  const arIdx = args.indexOf("--ar");
  const ar = arIdx !== -1 ? args[arIdx + 1] : "1:1";
  if (arIdx !== -1 && !ar) die("Missing value for --ar");

  const styleIdx = args.indexOf("--style");
  const style = styleIdx !== -1 ? args[styleIdx + 1] : "raw";
  if (styleIdx !== -1 && !style) die("Missing value for --style");

  const vIdx = args.indexOf("--v");
  const v = vIdx !== -1 ? args[vIdx + 1] : "6";
  if (vIdx !== -1 && !v) die("Missing value for --v");

  const seedIdx = args.indexOf("--seed");
  const seed = seedIdx !== -1 ? args[seedIdx + 1] : "";
  if (seedIdx !== -1 && !seed) die("Missing value for --seed");

  const imgIdx = args.indexOf("--img-url");
  const imgUrl = imgIdx !== -1 ? args[imgIdx + 1] : "IMAGE_URL";
  if (imgIdx !== -1 && !imgUrl) die("Missing value for --img-url");

  const outIdx = args.indexOf("--out");
  const outPath = outIdx !== -1 ? args[outIdx + 1] : "";
  if (outIdx !== -1 && !outPath) die("Missing value for --out");

  const noPinterest = args.includes("--no-pinterest");

  // Also allow passing a direct .mdx path as positional
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

  if (!filePath) die("Provide --latest OR --file <path> OR --slug <slug>");

  if (!path.isAbsolute(filePath)) filePath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(filePath)) die(`File not found: ${filePath}`);

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  const title = data?.title ? titleCaseLoose(String(data.title)) : null;
  if (!title) die("Missing frontmatter title.");

  const cuisine = getCuisine(data);
  const slugOut =
    data?.slug ? String(data.slug).trim() : path.basename(filePath).replace(/\.mdx?$/i, "");

  const stepsFromFm = Array.isArray(data?.instructions)
    ? data.instructions.map(String).filter(Boolean)
    : [];
  const stepsFromBody = extractStepsFromBody(content);

  const steps = (stepsFromFm.length ? stepsFromFm : stepsFromBody)
    .map(cleanStep)
    .filter(Boolean);

  if (!steps.length) {
    console.warn("⚠️  No steps found in frontmatter instructions or body Method/Instructions.");
  }

  const flagsHeroAndSteps = buildMjFlags({ ar, style, v, seed });
  const flagsPinterest = buildMjFlags({ ar: "2:3", style, v, seed });

  const heroPrompt = [
    `${title}, ${cuisine} cooking, finished dish in a black kadai pan, rustic Indian home kitchen, wooden table, natural window light, professional food photography, realistic textures, shot on 85mm lens`,
    flagsHeroAndSteps,
  ].join(" ");

  const stepPrompts = steps.map((s, i) => {
    return [
      `${imgUrl}`,
      `${title} cooking step ${i + 1}: ${s}, realistic Indian home kitchen, black kadai pan, natural window light, professional food photography, shot on 85mm lens`,
      flagsHeroAndSteps,
    ].join(" ");
  });

  const pinterestPrompt = [
    `${title}, ${cuisine} recipe, Pinterest-style recipe image, overhead shot, bold appetising colours, rustic Indian food styling, natural light, professional food photography`,
    flagsPinterest,
  ].join(" ");

  const lines = [];

  lines.push(`# Midjourney Prompts — ${title}`);
  lines.push(`File: ${path.relative(process.cwd(), filePath)}`);
  lines.push(`Slug: ${slugOut}`);
  lines.push(`Reference image: ${imgUrl === "IMAGE_URL" ? "IMAGE_URL (placeholder)" : imgUrl}`);
  lines.push("");

  lines.push(`## 1) HERO (generate first)`);
  lines.push(heroPrompt);
  lines.push("");
  lines.push(
    `Tip: After you pick the hero, use Midjourney "Copy Seed" and rerun with --seed <number> for tighter consistency.`
  );
  lines.push("");

  lines.push(`## 2) STEPS (use hero as reference image)`);
  if (!stepPrompts.length) {
    lines.push("(No steps found — add instructions to frontmatter or Method section.)");
  } else {
    stepPrompts.forEach((p, idx) => {
      lines.push(`### Step ${idx + 1}`);
      lines.push(p);
      lines.push("");
    });
  }

  if (!noPinterest) {
    lines.push(`## 3) PINTEREST (optional 2:3)`);
    lines.push(pinterestPrompt);
    lines.push("");
  }

  const outText = lines.join("\n").trim() + "\n";

  if (outPath) {
    const outAbs = path.isAbsolute(outPath) ? outPath : path.join(process.cwd(), outPath);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, outText, "utf8");
    console.log(`✅ Saved: ${path.relative(process.cwd(), outAbs)}`);
  } else {
    process.stdout.write(outText);
  }
}

main();