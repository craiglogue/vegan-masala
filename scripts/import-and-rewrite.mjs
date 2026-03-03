#!/usr/bin/env node
/**
 * scripts/import-and-rewrite.mjs
 *
 * One command pipeline:
 *   1) Import recipe from URL -> creates MDX in content/recipes/
 *   2) AI rewrite (typically on the latest file) -> normalizes format/style
 *   3) Optional prettier format
 *   4) Optional git add/commit/push
 *
 * Works by calling your existing scripts:
 *   - scripts/import-recipe.mjs
 *   - scripts/ai-rewrite-recipe.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function die(msg, code = 1) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(code);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (res.status !== 0) {
    const shown = [cmd, ...args].map(String).join(" ");
    die(`Command failed (${res.status}): ${shown}`, res.status ?? 1);
  }
}

function runCapture(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return {
    status: res.status ?? 0,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function isMdxOrMd(file) {
  return file.endsWith(".mdx") || file.endsWith(".md");
}

function getRecipesDir(cwd) {
  return path.join(cwd, "content", "recipes");
}

function newestRecipeFile(recipesDir) {
  if (!exists(recipesDir)) die(`Missing recipes dir: ${recipesDir}`);

  const files = fs
    .readdirSync(recipesDir)
    .filter(isMdxOrMd)
    .map((f) => path.join(recipesDir, f))
    .filter((p) => fs.statSync(p).isFile());

  if (!files.length) die(`No .mdx/.md files found in: ${recipesDir}`);

  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

function findRecipeBySlug(recipesDir, slug) {
  if (!exists(recipesDir)) die(`Missing recipes dir: ${recipesDir}`);

  const candidates = fs.readdirSync(recipesDir).filter(isMdxOrMd);

  // 1) exact filename match
  for (const f of candidates) {
    const base = f.replace(/\.mdx?$/i, "");
    if (base === slug) return path.join(recipesDir, f);
  }

  // 2) try to match frontmatter slug: "<slug>"
  for (const f of candidates) {
    const p = path.join(recipesDir, f);
    const raw = fs.readFileSync(p, "utf8");
    const fm = raw.match(/^---\s*[\s\S]*?\s*---/);
    if (!fm) continue;
    const slugLine = fm[0].match(/^\s*slug\s*:\s*(.+)\s*$/im);
    if (!slugLine) continue;
    const val = String(slugLine[1] ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (val === slug) return p;
  }

  return null;
}

function printHelp() {
  console.log(`
Vegan Masala — Import + AI Rewrite Pipeline

USAGE
  node scripts/import-and-rewrite.mjs "https://some.site/recipe"

COMMON
  node scripts/import-and-rewrite.mjs "URL" --latest
  node scripts/import-and-rewrite.mjs "URL" --git
  node scripts/import-and-rewrite.mjs --latest --rewrite-only
  node scripts/import-and-rewrite.mjs --slug chana-masala --rewrite-only

OPTIONS
  Target selection:
    --latest                 Rewrite the newest file in content/recipes (default after importing)
    --slug <slug>            Rewrite the recipe matching that slug
    --file <path>            Rewrite an explicit file path

  Pipeline toggles:
    --import-only            Only run import-recipe.mjs
    --rewrite-only           Only run ai-rewrite-recipe.mjs
    --no-prettier            Skip prettier formatting (default: runs prettier)
    --prettier               Force prettier formatting (default: on)
    --dry-run                Show what would run, but don't run commands

  Git:
    --git                    git add + commit + push after successful run
    --message <msg>          Commit message (default: "Add recipe")

  Advanced:
    --cwd <path>             Project root (default: current working directory)
    --help                   Show this help

NOTES
  - This script calls your existing scripts:
      scripts/import-recipe.mjs
      scripts/ai-rewrite-recipe.mjs
  - Prettier runs via: npx prettier --write "content/recipes/*.mdx"
`);
}

function parseArgs(argv) {
  const out = {
    url: null,
    latest: false,
    slug: null,
    file: null,
    importOnly: false,
    rewriteOnly: false,
    prettier: true,
    dryRun: false,
    git: false,
    message: "Add recipe",
    cwd: process.cwd(),
    help: false,
  };

  const args = [...argv];
  // positional URL (first arg that doesn't start with -)
  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--latest") out.latest = true;
    else if (a === "--slug") out.slug = args[++i] ?? null;
    else if (a === "--file") out.file = args[++i] ?? null;
    else if (a === "--import-only") out.importOnly = true;
    else if (a === "--rewrite-only") out.rewriteOnly = true;
    else if (a === "--no-prettier") out.prettier = false;
    else if (a === "--prettier") out.prettier = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--git") out.git = true;
    else if (a === "--message") out.message = args[++i] ?? out.message;
    else if (a === "--cwd") out.cwd = args[++i] ?? out.cwd;
    else if (!a.startsWith("-") && !out.url) out.url = a;
    else {
      // ignore unknown flags but warn
      warn(`Unknown arg ignored: ${a}`);
    }
  }

  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const cwd = path.resolve(opts.cwd);
  const scriptsDir = path.join(cwd, "scripts");
  const importScript = path.join(scriptsDir, "import-recipe.mjs");
  const rewriteScript = path.join(scriptsDir, "ai-rewrite-recipe.mjs");
  const recipesDir = getRecipesDir(cwd);

  if (!exists(importScript)) die(`Missing: ${importScript}`);
  if (!exists(rewriteScript)) die(`Missing: ${rewriteScript}`);
  if (!exists(recipesDir)) die(`Missing: ${recipesDir}`);

  if (opts.importOnly && opts.rewriteOnly) {
    die(`Pick one: --import-only OR --rewrite-only (not both)`);
  }

  // Determine what to run
  const willImport = !opts.rewriteOnly;
  const willRewrite = !opts.importOnly;

  if (willImport && !opts.url) {
    // Import needs a URL
    die(`No URL provided. Example:\n  node scripts/import-and-rewrite.mjs "https://some.site/recipe"`);
  }

  const plan = [];

  if (willImport) {
    plan.push({
      label: "Import recipe",
      cmd: "node",
      args: [importScript, opts.url],
      cwd,
    });
  }

  // Decide rewrite target (file / slug / latest)
  let rewriteTargetArgs = null;

  if (willRewrite) {
    if (opts.file) {
      const abs = path.isAbsolute(opts.file) ? opts.file : path.join(cwd, opts.file);
      if (!exists(abs)) die(`--file not found: ${abs}`);
      rewriteTargetArgs = ["--file", abs];
    } else if (opts.slug) {
      // if your ai script supports --slug, use it.
      // if it doesn't, we can resolve to a file and pass --file instead.
      const hit = findRecipeBySlug(recipesDir, opts.slug);
      if (!hit) die(`Could not find recipe for slug: ${opts.slug}`);
      rewriteTargetArgs = ["--file", hit];
    } else {
      // default behaviour:
      // after import we rewrite --latest (or if rewrite-only, still --latest)
      rewriteTargetArgs = ["--latest"];
    }

    plan.push({
      label: "AI rewrite",
      cmd: "node",
      args: [rewriteScript, ...rewriteTargetArgs],
      cwd,
    });
  }

  if (opts.prettier) {
    plan.push({
      label: "Prettier format",
      cmd: "npx",
      args: ["prettier", "--write", "content/recipes/*.mdx"],
      cwd,
      softFail: true, // don't kill pipeline if prettier isn't installed
    });
  }

  if (opts.git) {
    plan.push(
      {
        label: "Git add",
        cmd: "git",
        args: ["add", "content/recipes"],
        cwd,
      },
      {
        label: "Git commit",
        cmd: "git",
        args: ["commit", "-m", opts.message],
        cwd,
        softFail: true, // commit might fail if nothing changed
      },
      {
        label: "Git push",
        cmd: "git",
        args: ["push"],
        cwd,
      }
    );
  }

  // If rewrite-only without explicit target, show which file is "latest" for confidence
  if (willRewrite && !opts.file && !opts.slug) {
    const newest = newestRecipeFile(recipesDir);
    console.log(`ℹ️  Rewrite target (latest): ${path.relative(cwd, newest)}`);
  }

  // Dry run
  if (opts.dryRun) {
    console.log("\n🧪 DRY RUN — would run:\n");
    for (const step of plan) {
      console.log(`- ${step.label}: ${step.cmd} ${step.args.map(String).join(" ")}`);
    }
    console.log("");
    process.exit(0);
  }

  // Execute
  for (const step of plan) {
    console.log(`\n▶ ${step.label}`);
    if (step.softFail) {
      const r = runCapture(step.cmd, step.args, { cwd: step.cwd });
      if (r.status !== 0) {
        warn(`${step.label} failed (continuing).`);
        if (r.stderr) console.error(r.stderr);
      }
    } else {
      run(step.cmd, step.args, { cwd: step.cwd });
    }
  }

  ok("Done.");
}

main();