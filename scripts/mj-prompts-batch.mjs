#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import matter from "gray-matter";

dotenv.config({ path: ".env.local" });

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function normSlug(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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
  if (!files.length) die("No recipes found.");
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

function findRecipeBySlug(slug) {
  const files = getAllRecipePaths();
  const want = normSlug(slug);

  // filename slug match
  for (const p of files) {
    const base = path.basename(p).replace(/\.mdx?$/i, "");
    if (normSlug(base) === want) return p;
  }

  // frontmatter slug match
  for (const p of files) {
    const raw = fs.readFileSync(p, "utf8");
    const fm = raw.match(/^---\s*[\s\S]*?\s*---/);
    if (!fm) continue;
    const m = fm[0].match(/^\s*slug\s*:\s*(.+)\s*$/im);
    if (!m) continue;
    const val = String(m[1] ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (normSlug(val) === want) return p;
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

function parseNumbered(block) {
  if (!block) return [];
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

function getHeroFromFrontmatter(data) {
  // try common keys you might use
  const candidates = [
    data?.image,
    data?.hero,
    data?.heroImage,
    data?.cover,
    data?.coverImage,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

function absolutifyImageUrl(siteUrl, hero) {
  if (!hero) return "";
  // already absolute
  if (/^https?:\/\//i.test(hero)) return hero;
  // treat as site-relative asset path
  if (hero.startsWith("/")) return `${siteUrl}${hero}`;
  // last resort: assume it’s intended as site-relative
  return `${siteUrl}/${hero}`;
}

function buildText({
  title,
  slug,
  fileRel,
  heroUrl,
  steps,
  style,
  v,
  arSquare,
  arPinterest,
  iw,
}) {
  const ref = heroUrl || "IMAGE_URL";

  const lines = [];
  lines.push(`# Midjourney Prompts — ${title}`);
  lines.push(`File: ${fileRel}`);
  lines.push(`Slug: ${slug}`);
  lines.push(`Hero reference: ${ref}`);
  lines.push("");

  lines.push(`## 1) HERO (generate first)`);
  lines.push(
    `${title}, Indian cooking, finished dish plated, rustic Indian home kitchen, natural window light, professional food photography, realistic textures, shot on 85mm lens --style ${style} --v ${v} --ar ${arSquare}`
  );
  lines.push("");
  lines.push(
    `Tip: Upload your chosen Recraft hero to Midjourney, copy its image URL, and replace the reference above.`
  );
  lines.push("");

  lines.push(`## 2) STEPS (use hero as reference image)`);
  if (!steps.length) {
    lines.push(`(No steps found in this recipe yet.)`);
  } else {
    steps.forEach((s, i) => {
      const n = i + 1;
      const clean = String(s).replace(/\s+/g, " ").trim();
      lines.push(`### Step ${n}`);
      lines.push(
        `${ref} ${title} cooking step ${n}: ${clean}, realistic Indian home kitchen, natural window light, professional food photography, shot on 85mm lens --style ${style} --v ${v} --ar ${arSquare} --iw ${iw}`
      );
      lines.push("");
    });
  }

  lines.push(`## 3) PINTEREST (optional ${arPinterest})`);
  lines.push(
    `${title}, Indian recipe, Pinterest-style recipe image, overhead shot, bold appetising colours, rustic Indian food styling, natural light, professional food photography --style ${style} --v ${v} --ar ${arPinterest}`
  );
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);

  const help = args.includes("--help") || args.includes("-h");
  if (help) {
    console.log(`
mj-prompts-batch.mjs

Creates ONE .txt file per recipe with Midjourney prompts, including hero reference URL.

USAGE
  node scripts/mj-prompts-batch.mjs --all
  node scripts/mj-prompts-batch.mjs --latest
  node scripts/mj-prompts-batch.mjs --slug bombay-aloo
  node scripts/mj-prompts-batch.mjs --file content/recipes/bombay-aloo.mdx

OPTIONS
  Target:
    --all                     Process every recipe in content/recipes
    --latest                   Process newest recipe file
    --slug <slug>              Process one recipe by slug
    --file <path>              Process one recipe by file path

  Output:
    --outdir <dir>             Output folder (default: mj-prompts)

  Prompt tuning:
    --style <raw|...>          MJ style (default: raw)
    --v <number>               MJ version (default: 6)
    --ar <ratio>               Square/hero aspect ratio (default: 1:1)
    --ar-pinterest <ratio>     Pinterest aspect ratio (default: 2:3)
    --iw <number>              Image weight when using reference (default: 1.5)
`);
    process.exit(0);
  }

  const siteUrl =
    (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://vegan-masala.com");

  const outIdx = args.indexOf("--outdir");
  const outDir = outIdx !== -1 ? args[outIdx + 1] : "mj-prompts";
  if (outIdx !== -1 && !outDir) die("Missing value for --outdir");

  const styleIdx = args.indexOf("--style");
  const style = styleIdx !== -1 ? args[styleIdx + 1] : "raw";
  if (styleIdx !== -1 && !style) die("Missing value for --style");

  const vIdx = args.indexOf("--v");
  const v = vIdx !== -1 ? String(args[vIdx + 1]) : "6";
  if (vIdx !== -1 && !v) die("Missing value for --v");

  const arIdx = args.indexOf("--ar");
  const arSquare = arIdx !== -1 ? String(args[arIdx + 1]) : "1:1";
  if (arIdx !== -1 && !arSquare) die("Missing value for --ar");

  const arpIdx = args.indexOf("--ar-pinterest");
  const arPinterest = arpIdx !== -1 ? String(args[arpIdx + 1]) : "2:3";
  if (arpIdx !== -1 && !arPinterest) die("Missing value for --ar-pinterest");

  const iwIdx = args.indexOf("--iw");
  const iw = iwIdx !== -1 ? String(args[iwIdx + 1]) : "1.5";
  if (iwIdx !== -1 && !iw) die("Missing value for --iw");

  const all = args.includes("--all");
  const latest = args.includes("--latest");

  const slugIdx = args.indexOf("--slug");
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : null;
  if (slugIdx !== -1 && !slug) die("Missing value for --slug");

  const fileIdx = args.indexOf("--file");
  let filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
  if (fileIdx !== -1 && !filePath) die("Missing value for --file");

  let targets = [];

  if (all) {
    targets = getAllRecipePaths();
  } else if (filePath) {
    if (!path.isAbsolute(filePath)) filePath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(filePath)) die(`File not found: ${filePath}`);
    targets = [filePath];
  } else if (slug) {
    const hit = findRecipeBySlug(slug);
    if (!hit) die(`Could not find recipe with slug: ${slug}`);
    targets = [hit];
  } else if (latest) {
    targets = [getLatestRecipePath()];
  } else {
    die(`Choose one:
  --all | --latest | --slug <slug> | --file <path>
Try: node scripts/mj-prompts-batch.mjs --all`);
  }

  const outAbs = path.isAbsolute(outDir)
    ? outDir
    : path.join(process.cwd(), outDir);

  ensureDir(outAbs);

  let count = 0;

  for (const p of targets) {
    const raw = fs.readFileSync(p, "utf8");
    const { data, content } = matter(raw);

    const title = String(data?.title ?? "").trim() || "Untitled Recipe";
    const fmSlug = String(data?.slug ?? "").trim();
    const baseSlug = path.basename(p).replace(/\.mdx?$/i, "");
    const slugFinal = normSlug(fmSlug || baseSlug) || normSlug(title) || "recipe";

    const hero = getHeroFromFrontmatter(data);
    const heroUrl = absolutifyImageUrl(siteUrl, hero);

    const steps =
      Array.isArray(data?.instructions) && data.instructions.length
        ? data.instructions.map(String).filter(Boolean)
        : parseNumbered(extractHeadingBlock(content, "Method|Instructions"));

    const fileRel = path.relative(process.cwd(), p);

    const text = buildText({
      title,
      slug: slugFinal,
      fileRel,
      heroUrl,
      steps,
      style,
      v,
      arSquare,
      arPinterest,
      iw,
    });

    const outFile = path.join(outAbs, `${slugFinal}.txt`);
    fs.writeFileSync(outFile, text, "utf8");

    count += 1;
    ok(`Wrote: ${path.relative(process.cwd(), outFile)}`);
  }

  ok(`Done. ${count} file(s) written to ${path.relative(process.cwd(), outAbs)}/`);
}

main().catch((err) => {
  console.error("\n❌ Script failed:\n", err);
  process.exit(1);
});