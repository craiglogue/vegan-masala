// scripts/promote-rewritten-recipes.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LIVE_DIR = path.join(ROOT, "content", "recipes");
const REWRITTEN_DIR = path.join(ROOT, "content", "recipes_rewritten");
const BACKUP_ROOT = path.join(ROOT, "content", "recipes_backup_promotions");

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "-",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFileSafe(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function main() {
  if (!fs.existsSync(LIVE_DIR)) {
    throw new Error(`Live recipes folder not found: ${LIVE_DIR}`);
  }

  if (!fs.existsSync(REWRITTEN_DIR)) {
    throw new Error(`Rewritten recipes folder not found: ${REWRITTEN_DIR}`);
  }

  const backupDir = path.join(BACKUP_ROOT, timestamp());
  ensureDir(backupDir);

  const rewrittenFiles = fs
    .readdirSync(REWRITTEN_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort();

  if (!rewrittenFiles.length) {
    throw new Error(`No rewritten .mdx files found in: ${REWRITTEN_DIR}`);
  }

  let backedUp = 0;
  let promoted = 0;

  for (const file of rewrittenFiles) {
    const livePath = path.join(LIVE_DIR, file);
    const rewrittenPath = path.join(REWRITTEN_DIR, file);
    const backupPath = path.join(backupDir, file);

    if (fs.existsSync(livePath)) {
      copyFileSafe(livePath, backupPath);
      backedUp += 1;
      console.log(`BACKUP ${file}`);
    } else {
      console.log(`NEW    ${file}`);
    }

    copyFileSafe(rewrittenPath, livePath);
    promoted += 1;
    console.log(`WRITE  ${file}`);
  }

  console.log("");
  console.log(`Done.`);
  console.log(`Backed up ${backedUp} files to: ${backupDir}`);
  console.log(`Promoted ${promoted} rewritten files into: ${LIVE_DIR}`);
}
main();