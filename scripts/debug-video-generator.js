#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const ROOT = process.cwd();

const TARGET_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  ".vercel",
  "dist",
  "build",
  "coverage",
  "out",
]);

function run(cmd) {
  try {
    return cp.execSync(cmd, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    }).trim();
  } catch (err) {
    return null;
  }
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (TARGET_EXTS.has(ext)) out.push(full);
  }

  return out;
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function grepFiles(files, regex) {
  const matches = [];

  for (const file of files) {
    const text = read(file);
    if (!text) continue;

    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (regex.test(line)) {
        matches.push({
          file: rel(file),
          line: i + 1,
          text: line.trim(),
        });
      }
      regex.lastIndex = 0;
    });
  }

  return matches;
}

function listByBasename(files, basename) {
  return files.filter((f) => path.basename(f) === basename).map(rel);
}

function gitTrackedContent(file) {
  const r = rel(file);
  const content = run(`git show HEAD:${r}`);
  return content ?? null;
}

function reportSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printMatches(matches) {
  if (!matches.length) {
    console.log("None found.");
    return;
  }

  for (const m of matches) {
    console.log(`- ${m.file}:${m.line}`);
    console.log(`  ${m.text}`);
  }
}

function fileChangedVsHead(file) {
  const r = rel(file);
  const status = run(`git diff --name-only HEAD -- "${r}"`);
  return Boolean(status);
}

function summarizeFileState(file) {
  const r = rel(file);
  const current = read(file);
  const head = gitTrackedContent(file);

  const currentHasSatoriImport = /import\s+.*\s+from\s+["']satori["']/.test(current);
  const currentHasAwaitSatori = /\bawait\s+satori\s*\(/.test(current);
  const currentCallsGenerateInstagram = /\bgenerateInstagramBySlug\s*\(/.test(current);
  const currentCallsBuildRecipeVideo = /\bbuildRecipeVideo\s*\(/.test(current);

  const headHasSatoriImport = head
    ? /import\s+.*\s+from\s+["']satori["']/.test(head)
    : null;
  const headHasAwaitSatori = head
    ? /\bawait\s+satori\s*\(/.test(head)
    : null;
  const headCallsGenerateInstagram = head
    ? /\bgenerateInstagramBySlug\s*\(/.test(head)
    : null;
  const headCallsBuildRecipeVideo = head
    ? /\bbuildRecipeVideo\s*\(/.test(head)
    : null;

  console.log(`\nFile: ${r}`);
  console.log(`  Exists: yes`);
  console.log(`  Changed vs HEAD: ${fileChangedVsHead(file) ? "YES" : "no"}`);

  console.log(`  Working tree:`);
  console.log(`    imports satori: ${currentHasSatoriImport ? "YES" : "no"}`);
  console.log(`    await satori(): ${currentHasAwaitSatori ? "YES" : "no"}`);
  console.log(`    calls generateInstagramBySlug(): ${currentCallsGenerateInstagram ? "YES" : "no"}`);
  console.log(`    calls buildRecipeVideo(): ${currentCallsBuildRecipeVideo ? "YES" : "no"}`);

  if (head == null) {
    console.log(`  HEAD version: not tracked or unavailable`);
  } else {
    console.log(`  HEAD commit version:`);
    console.log(`    imports satori: ${headHasSatoriImport ? "YES" : "no"}`);
    console.log(`    await satori(): ${headHasAwaitSatori ? "YES" : "no"}`);
    console.log(`    calls generateInstagramBySlug(): ${headCallsGenerateInstagram ? "YES" : "no"}`);
    console.log(`    calls buildRecipeVideo(): ${headCallsBuildRecipeVideo ? "YES" : "no"}`);
  }
}

function main() {
  const allFiles = walk(ROOT);

  const gitHead = run("git rev-parse --short HEAD");
  const gitStatus = run("git status --short");

  console.log("VIDEO GENERATOR DEBUG SCAN");
  console.log("==========================");
  console.log(`Root: ${ROOT}`);
  console.log(`Git HEAD: ${gitHead || "not available"}`);
  console.log(`Working tree dirty: ${gitStatus ? "YES" : "no"}`);

  reportSection("Duplicate likely-target files");
  const suspects = [
    "generateInstagram.ts",
    "generatePinterest.ts",
    "buildRecipeVideo.ts",
    "route.ts",
  ];

  for (const base of suspects) {
    const found = listByBasename(allFiles, base);
    console.log(`\n${base}:`);
    if (!found.length) {
      console.log("  None found");
    } else {
      for (const f of found) console.log(`  - ${f}`);
    }
  }

  reportSection("Search: import satori");
  printMatches(grepFiles(allFiles, /import\s+.*\s+from\s+["']satori["']/g));

  reportSection("Search: await satori(");
  printMatches(grepFiles(allFiles, /\bawait\s+satori\s*\(/g));

  reportSection("Search: generateInstagramBySlug(");
  printMatches(grepFiles(allFiles, /\bgenerateInstagramBySlug\s*\(/g));

  reportSection("Search: buildRecipeVideo(");
  printMatches(grepFiles(allFiles, /\bbuildRecipeVideo\s*\(/g));

  reportSection("Search: explicit video route");
  printMatches(
    grepFiles(
      allFiles,
      /\/api\/admin\/social\/video|admin\/social\/video|buildRecipeVideo\s*\(|generateInstagramBySlug\s*\(/g
    )
  );

  reportSection("Target file state");
  const targetFiles = [
    "src/lib/social/generateInstagram.ts",
    "src/lib/social/generatePinterest.ts",
    "src/lib/social/video/buildRecipeVideo.ts",
    "src/app/api/admin/social/video/route.ts",
  ]
    .map((p) => path.join(ROOT, p))
    .filter(exists);

  if (!targetFiles.length) {
    console.log("No target files found in expected locations.");
  } else {
    for (const file of targetFiles) summarizeFileState(file);
  }

  reportSection("Git changed files");
  if (!gitStatus) {
    console.log("Working tree clean.");
  } else {
    console.log(gitStatus);
  }

  reportSection("Quick diagnosis");
  const satoriImports = grepFiles(allFiles, /import\s+.*\s+from\s+["']satori["']/g);
  const satoriCalls = grepFiles(allFiles, /\bawait\s+satori\s*\(/g);
  const instaCalls = grepFiles(allFiles, /\bgenerateInstagramBySlug\s*\(/g);

  if (satoriImports.length || satoriCalls.length || instaCalls.length) {
    console.log("Potential live problem paths still exist:");
    if (satoriImports.length) console.log(`- satori import count: ${satoriImports.length}`);
    if (satoriCalls.length) console.log(`- await satori(...) count: ${satoriCalls.length}`);
    if (instaCalls.length) console.log(`- generateInstagramBySlug(...) call count: ${instaCalls.length}`);
    console.log("If these appear in HEAD commit output above, Vercel can still be deploying them.");
  } else {
    console.log("No obvious Satori/video problem paths found in scanned source files.");
    console.log("That would point more strongly to a different deployed project, branch, or runtime path.");
  }
}

main();