#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const RECIPES_DIR = path.join(ROOT, "content", "recipes");
const SCRIPTS_DIR = path.join(ROOT, "scripts");

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function info(msg) {
  console.log(`\n🔹 ${msg}`);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function printHelp() {
  console.log(`
Recipe Pipeline (Vegan Masala)

USAGE
  node scripts/recipe-pipeline.mjs --latest
  node scripts/recipe-pipeline.mjs --slug bombay-aloo
  node scripts/recipe-pipeline.mjs --file content/recipes/bombay-aloo.mdx
  node scripts/recipe-pipeline.mjs --all
  node scripts/recipe-pipeline.mjs --import-url "https://example.com/recipe"

WHAT IT DOES
  1) optionally imports a recipe
  2) runs AI rewrite
  3) fixes ingredient quantities
  4) normalises recipe structure
  5) fixes recipe images/frontmatter
  6) regenerates Midjourney prompt files

OPTIONS
  Target:
    --latest
    --slug <slug>
    --file <path>
    --all
    --import-url <url>

  Behaviour:
    --skip-rewrite
    --skip-quantities
    --skip-structure
    --skip-images
    --skip-prompts
    --dry-run
    --no-backup

EXAMPLES
  node scripts/recipe-pipeline.mjs --latest
  node scripts/recipe-pipeline.mjs --slug bombay-aloo
  node scripts/recipe-pipeline.mjs --all
  node scripts/recipe-pipeline.mjs --import-url "https://example.com/recipe"
`);
}

function scriptPath(name) {
  return path.join(SCRIPTS_DIR, name);
}

function requireScript(name) {
  const p = scriptPath(name);
  if (!fs.existsSync(p)) die(`Missing script: scripts/${name}`);
  return p;
}

function getAllRecipePaths() {
  if (!fs.existsSync(RECIPES_DIR)) die(`Missing recipes folder: ${RECIPES_DIR}`);
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

function runNodeScript(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [script, ...args], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script failed (${path.basename(script)}) with code ${code}`));
    });

    child.on("error", reject);
  });
}

async function runAiRewriteOnTargets(targets, { dryRun, noBackup }) {
  const rewriteScript = requireScript("ai-rewrite-recipe.mjs");

  for (const file of targets) {
    const args = ["--file", file];
    if (dryRun) args.push("--dry-run");
    if (noBackup) args.push("--no-backup");

    info(`AI rewrite: ${path.relative(ROOT, file)}`);
    await runNodeScript(rewriteScript, args);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const latest = args.includes("--latest");
  const all = args.includes("--all");
  const dryRun = args.includes("--dry-run");
  const noBackup = args.includes("--no-backup");

  const skipRewrite = args.includes("--skip-rewrite");
  const skipQuantities = args.includes("--skip-quantities");
  const skipStructure = args.includes("--skip-structure");
  const skipImages = args.includes("--skip-images");
  const skipPrompts = args.includes("--skip-prompts");

  const slugIdx = args.indexOf("--slug");
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : null;
  if (slugIdx !== -1 && !slug) die("Missing value for --slug");

  const fileIdx = args.indexOf("--file");
  let filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
  if (fileIdx !== -1 && !filePath) die("Missing value for --file");

  const urlIdx = args.indexOf("--import-url");
  const importUrl = urlIdx !== -1 ? args[urlIdx + 1] : null;
  if (urlIdx !== -1 && !importUrl) die("Missing value for --import-url");

  if (filePath && !path.isAbsolute(filePath)) {
    filePath = path.join(ROOT, filePath);
  }

  if (filePath && !fs.existsSync(filePath)) {
    die(`File not found: ${filePath}`);
  }

  // Validate the scripts that will be used
  if (importUrl) requireScript("import-recipe.mjs");
  if (!skipRewrite) requireScript("ai-rewrite-recipe.mjs");
  if (!skipQuantities) requireScript("fix-ingredient-quantities.mjs");
  if (!skipStructure) requireScript("fix-recipe-structure.mjs");
  if (!skipImages) requireScript("fix-recipe-images.mjs");
  if (!skipPrompts) requireScript("mj-prompts-batch.mjs");

  // Optional import first
  if (importUrl) {
    info(`Importing recipe from URL`);
    await runNodeScript(scriptPath("import-recipe.mjs"), [importUrl]);
    ok("Import complete.");
  }

  // Resolve targets
  let targets = [];

  if (all) {
    targets = getAllRecipePaths();
  } else if (filePath) {
    targets = [filePath];
  } else if (slug) {
    const hit = findRecipeBySlug(slug);
    if (!hit) die(`Could not find recipe with slug: ${slug}`);
    targets = [hit];
  } else if (latest || importUrl) {
    targets = [getLatestRecipePath()];
  } else {
    die(`Choose one target:
  --latest
  --slug <slug>
  --file <path>
  --all
  --import-url <url>`);
  }

  if (!targets.length) die("No targets resolved.");

  info(`Targets: ${targets.length}`);
  for (const t of targets.slice(0, 5)) {
    console.log(`   - ${path.relative(ROOT, t)}`);
  }
  if (targets.length > 5) {
    console.log(`   ...and ${targets.length - 5} more`);
  }

  // 1) AI rewrite target recipe(s)
  if (!skipRewrite) {
    await runAiRewriteOnTargets(targets, { dryRun, noBackup });
    ok("AI rewrite stage complete.");
  } else {
    warn("Skipping AI rewrite stage.");
  }

  // 2) Ingredient quantities fixer (global script)
  if (!skipQuantities) {
    info("Fixing ingredient quantities");
    const quantityArgs = dryRun ? ["--dry-run"] : [];
    await runNodeScript(scriptPath("fix-ingredient-quantities.mjs"), quantityArgs);
    ok("Ingredient quantities stage complete.");
  } else {
    warn("Skipping ingredient quantities stage.");
  }

  // 3) Structure fixer (global script)
  if (!skipStructure) {
    info("Normalising recipe structure");
    const structureArgs = dryRun ? ["--dry-run"] : [];
    await runNodeScript(scriptPath("fix-recipe-structure.mjs"), structureArgs);
    ok("Recipe structure stage complete.");
  } else {
    warn("Skipping recipe structure stage.");
  }

  // 4) Image/frontmatter fixer (global script)
  if (!skipImages) {
    info("Fixing recipe image mappings");
    const imageArgs = [];
    if (dryRun) imageArgs.push("--dry-run");
    imageArgs.push("--update-frontmatter");
    await runNodeScript(scriptPath("fix-recipe-images.mjs"), imageArgs);
    ok("Recipe image stage complete.");
  } else {
    warn("Skipping recipe image stage.");
  }

  // 5) Midjourney prompt generation
  if (!skipPrompts) {
    info("Generating Midjourney prompt files");
    const promptArgs = ["--all"];
    await runNodeScript(scriptPath("mj-prompts-batch.mjs"), promptArgs);
    ok("Midjourney prompts stage complete.");
  } else {
    warn("Skipping Midjourney prompts stage.");
  }

  console.log("\n🎉 Pipeline complete.\n");
}

main().catch((err) => {
  console.error(`\n❌ Pipeline failed:\n${err.message}\n`);
  process.exit(1);
});