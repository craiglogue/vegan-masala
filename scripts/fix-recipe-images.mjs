#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");
const IMAGES_DIR_DEFAULT = path.join(process.cwd(), "public", "images", "recipes");

const EXT_OK = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

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

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\.(png|jpe?g|webp|avif)$/i, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function tokens(s) {
  return new Set(norm(s).split("-").filter(Boolean));
}

function scoreMatch(slug, file) {
  const a = tokens(slug);
  const b = tokens(file);

  if (norm(slug) === norm(file)) return 999;

  let overlap = 0;
  for (const t of b) if (a.has(t)) overlap++;

  const union = new Set([...a, ...b]).size || 1;
  const jaccard = overlap / union;

  const slugKey = norm(slug);
  const fileKey = norm(file);

  const containsBonus =
    slugKey.includes(fileKey) || fileKey.includes(slugKey) ? 0.25 : 0;

  return jaccard + containsBonus;
}

function getAllRecipePaths() {
  if (!fs.existsSync(RECIPES_DIR)) die(`Missing folder: ${RECIPES_DIR}`);
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f))
    .filter((p) => fs.statSync(p).isFile());
}

function listImages(imagesDir) {
  if (!fs.existsSync(imagesDir)) return [];
  return fs
    .readdirSync(imagesDir)
    .filter((f) => EXT_OK.includes(path.extname(f).toLowerCase()))
    .filter((f) => fs.statSync(path.join(imagesDir, f)).isFile());
}

function getHeroFromFrontmatter(data) {
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

function stripToRecipesRel(heroStr) {
  // Accept:
  // /images/recipes/x.png
  // images/recipes/x.png
  // https://domain/images/recipes/x.png
  const s = String(heroStr || "").trim();
  if (!s) return "";

  const m = s.match(/\/images\/recipes\/[^?#]+/i);
  if (m?.[0]) return m[0];

  if (s.startsWith("/images/recipes/")) return s;

  // If it's just a filename, treat it as in /images/recipes
  if (!s.includes("/") && EXT_OK.includes(path.extname(s).toLowerCase())) {
    return `/images/recipes/${s}`;
  }

  return "";
}

function ensureFrontmatterImage(rawMdx, newRel) {
  const parsed = matter(rawMdx);
  const nextData = { ...parsed.data, image: newRel };
  const next = matter.stringify(parsed.content, nextData);
  return next;
}

function pickBestImageForSlug(slug, images) {
  // Prefer exact match slug.ext first
  for (const ext of EXT_OK) {
    const direct = `${slug}${ext}`;
    if (images.includes(direct)) return direct;
  }

  // Otherwise fuzzy best match
  let best = null;
  for (const f of images) {
    const s = scoreMatch(slug, f);
    if (!best || s > best.score) best = { file: f, score: s };
  }

  // Guard: don’t do risky renames on weak matches
  if (best && best.score >= 0.28) return best.file;
  return null;
}

async function main() {
  const args = process.argv.slice(2);

  const help = args.includes("--help") || args.includes("-h");
  if (help) {
    console.log(`
fix-recipe-images.mjs

Ensures recipe hero images are named to match slug: <slug>.<ext>
and optionally updates MDX frontmatter "image:" to /images/recipes/<slug>.<ext>

USAGE
  node scripts/fix-recipe-images.mjs --check
  node scripts/fix-recipe-images.mjs --fix
  node scripts/fix-recipe-images.mjs --fix --update-frontmatter
  node scripts/fix-recipe-images.mjs --fix --update-frontmatter --dry-run

OPTIONS
  --check                 Only report (no renames, no MDX changes)
  --fix                   Rename image files to match slug (safe, no overwrite)
  --update-frontmatter    Write/replace frontmatter image: to canonical path
  --dry-run               Show what would happen but do not change anything
  --images-dir <path>     Override images directory (default: public/images/recipes)
`);
    process.exit(0);
  }

  const doCheck = args.includes("--check");
  const doFix = args.includes("--fix");
  const updateFM = args.includes("--update-frontmatter");
  const dryRun = args.includes("--dry-run");

  if (!doCheck && !doFix && !updateFM) {
    die(`Pick at least one: --check OR --fix OR --update-frontmatter
Try: node scripts/fix-recipe-images.mjs --check`);
  }

  const dirIdx = args.indexOf("--images-dir");
  const imagesDir = dirIdx !== -1 ? args[dirIdx + 1] : IMAGES_DIR_DEFAULT;
  if (dirIdx !== -1 && !imagesDir) die("Missing value for --images-dir");

  const recipePaths = getAllRecipePaths();
  const images = listImages(imagesDir);

  if (!images.length) warn(`No images found in: ${imagesDir}`);

  let changedImages = 0;
  let changedMdx = 0;
  let problems = 0;

  console.log(`\n📁 Recipes: ${recipePaths.length}`);
  console.log(`🖼️  Images: ${images.length} (${path.relative(process.cwd(), imagesDir)})`);
  console.log(`🔧 Mode: ${doFix ? "fix" : "check"}${updateFM ? " + update-frontmatter" : ""}${dryRun ? " (dry-run)" : ""}\n`);

  // Work on a mutable copy of image list so renames reflect for later recipes
  const imageSet = new Set(images);

  for (const recipePath of recipePaths) {
    const raw = fs.readFileSync(recipePath, "utf8");
    const parsed = matter(raw);

    const fmSlug = typeof parsed.data?.slug === "string" ? parsed.data.slug : "";
    const fileSlug = path.basename(recipePath).replace(/\.mdx?$/i, "");
    const slug = norm(fmSlug || fileSlug);

    if (!slug) {
      warn(`Skipping (no slug): ${path.relative(process.cwd(), recipePath)}`);
      problems++;
      continue;
    }

    const hero = getHeroFromFrontmatter(parsed.data);
    const heroRel = stripToRecipesRel(hero); // e.g. /images/recipes/foo.png
    const heroFileFromFM = heroRel ? path.basename(heroRel) : "";

    const currentBest = pickBestImageForSlug(slug, Array.from(imageSet));

    // Determine the source image file to use:
    // 1) if frontmatter points to an existing file, use that
    // 2) else use best match
    let sourceFile = "";
    if (heroFileFromFM && imageSet.has(heroFileFromFM)) sourceFile = heroFileFromFM;
    else if (currentBest) sourceFile = currentBest;

    // Determine target filename:
    const sourceExt = sourceFile ? path.extname(sourceFile).toLowerCase() : "";
    const targetFile = sourceFile ? `${slug}${sourceExt}` : "";

    const relRecipe = path.relative(process.cwd(), recipePath);

    if (!sourceFile) {
      warn(`No image match for ${slug} (${relRecipe})`);
      problems++;
      continue;
    }

    const alreadyCorrect = sourceFile === targetFile;

    // Report
    if (doCheck) {
      console.log(
        `${alreadyCorrect ? "✅" : "⚠️"} ${slug}\n    image: ${sourceFile}${alreadyCorrect ? "" : `  →  ${targetFile}`}\n    recipe: ${relRecipe}\n`
      );
    }

    // Fix rename
    if (doFix && !alreadyCorrect) {
      const from = path.join(imagesDir, sourceFile);
      const to = path.join(imagesDir, targetFile);

      if (fs.existsSync(to)) {
        warn(
          `Target exists, skipping rename for ${slug}:\n    ${path.relative(process.cwd(), to)}`
        );
        problems++;
      } else {
        if (dryRun) {
          ok(`[dry-run] Would rename: ${sourceFile} → ${targetFile}`);
        } else {
          fs.renameSync(from, to);
          ok(`Renamed: ${sourceFile} → ${targetFile}`);
          changedImages++;
          imageSet.delete(sourceFile);
          imageSet.add(targetFile);
        }
      }
    }

    // Update MDX frontmatter image
    if (updateFM) {
      // Prefer the final target name if we are fixing; else use sourceFile
      const finalFileName = doFix ? (alreadyCorrect ? sourceFile : targetFile) : sourceFile;
      const newRel = `/images/recipes/${finalFileName}`;

      const currentImage = stripToRecipesRel(getHeroFromFrontmatter(parsed.data)) || "";
      const needsUpdate = currentImage !== newRel;

      if (needsUpdate) {
        if (dryRun) {
          ok(`[dry-run] Would update frontmatter image for ${slug}: ${currentImage || "(none)"} → ${newRel}`);
        } else {
          const nextMdx = ensureFrontmatterImage(raw, newRel);
          fs.writeFileSync(recipePath, nextMdx, "utf8");
          ok(`Updated frontmatter image for ${slug}: ${newRel}`);
          changedMdx++;
        }
      }
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Images renamed: ${changedImages}`);
  console.log(`MDX updated:    ${changedMdx}`);
  console.log(`Problems:       ${problems}`);
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Script failed:\n", err);
  process.exit(1);
});