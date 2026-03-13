#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const RECIPES_DIR = path.join(ROOT, "content", "recipes");
const IMAGES_DIR = path.join(ROOT, "public", "images", "recipes");

function log(msg = "") {
  console.log(msg);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function relFromRoot(absPath) {
  return normalizePath(path.relative(ROOT, absPath));
}

function publicUrlFromImagePath(absPath) {
  const rel = normalizePath(path.relative(path.join(ROOT, "public"), absPath));
  return `/${rel}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    write: args.includes("--write"),
    noBackup: args.includes("--no-backup"),
    deleteUnusedImages: args.includes("--delete-unused-images"),
    deleteBak: args.includes("--delete-bak"),
    deleteDuplicateRecipes: args.includes("--delete-duplicate-recipes"),
    verbose: args.includes("--verbose"),
  };
}

function ensureDirs() {
  if (!fs.existsSync(RECIPES_DIR)) die(`Missing recipes dir: ${RECIPES_DIR}`);
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function getRecipeFiles() {
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f))
    .sort();
}

function getImageFiles() {
  if (!fs.existsSync(IMAGES_DIR)) return [];
  return fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
    .map((f) => path.join(IMAGES_DIR, f))
    .sort();
}

function safeString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function readRecipe(absPath) {
  const raw = fs.readFileSync(absPath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data ?? {};
  const fileName = path.basename(absPath);
  const ext = path.extname(fileName);
  const baseName = fileName.slice(0, -ext.length);
  const slug = safeString(data.slug) || slugify(baseName);
  const title = safeString(data.title) || baseName;
  const image = safeString(data.image);

  return {
    absPath,
    fileName,
    ext,
    baseName,
    raw,
    parsed,
    data,
    content: parsed.content ?? "",
    slug,
    title,
    image,
    normalizedBase: slugify(baseName),
    normalizedTitle: slugify(title),
  };
}

function exists(absPath) {
  return fs.existsSync(absPath);
}

function backupFile(absPath) {
  const bakPath = `${absPath}.bak`;
  if (!exists(bakPath)) {
    fs.copyFileSync(absPath, bakPath);
  }
}

function buildUniqueSlug(candidate, used) {
  let base = slugify(candidate) || "recipe";
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

function chooseCanonicalRecipe(group) {
  let chosen =
    group.find((r) => r.normalizedBase === r.slug) ||
    group.find((r) => r.normalizedTitle === r.slug) ||
    [...group].sort((a, b) => a.fileName.localeCompare(b.fileName))[0];

  return chosen;
}

function imageExt(absPath) {
  return path.extname(absPath).toLowerCase();
}

function basenameNoExt(absPath) {
  return path.basename(absPath, path.extname(absPath));
}

function getReferencedImageAbs(recipe) {
  if (!recipe.image) return null;
  const rel = recipe.image.replace(/^\//, "");
  const abs = path.join(ROOT, "public", rel);
  return exists(abs) ? abs : null;
}

function pickImageForRecipe(recipe, imageIndexByBase) {
  const direct = getReferencedImageAbs(recipe);
  if (direct) return direct;

  const candidates = [
    recipe.slug,
    recipe.normalizedBase,
    recipe.normalizedTitle,
  ].filter(Boolean);

  for (const c of candidates) {
    const hit = imageIndexByBase.get(c);
    if (hit) return hit;
  }

  return null;
}

function createImageIndex(images) {
  const map = new Map();
  for (const abs of images) {
    const key = slugify(basenameNoExt(abs));
    if (!map.has(key)) map.set(key, abs);
  }
  return map;
}

function findDuplicateSlugGroups(recipes) {
  const bySlug = new Map();
  for (const recipe of recipes) {
    const key = recipe.slug;
    if (!bySlug.has(key)) bySlug.set(key, []);
    bySlug.get(key).push(recipe);
  }
  return [...bySlug.entries()].filter(([, group]) => group.length > 1);
}

function writeRecipe(recipe, noBackup) {
  if (!noBackup) backupFile(recipe.absPath);
  const out = matter.stringify(recipe.content, recipe.data);
  fs.writeFileSync(recipe.absPath, out, "utf8");
}

function deleteFile(absPath, noBackup) {
  if (!exists(absPath)) return;
  if (!noBackup && !absPath.endsWith(".bak")) backupFile(absPath);
  fs.unlinkSync(absPath);
}

function renameFile(fromAbs, toAbs, noBackup) {
  if (fromAbs === toAbs) return;
  if (!exists(fromAbs)) return;
  if (exists(toAbs)) die(`Cannot rename because target exists:\n${toAbs}`);
  if (!noBackup) backupFile(fromAbs);
  fs.renameSync(fromAbs, toAbs);
}

function findBakFiles(dir) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".bak"))
    .map((f) => path.join(dir, f));
}

function main() {
  const opts = parseArgs();
  ensureDirs();

  let recipes = getRecipeFiles().map(readRecipe);
  let images = getImageFiles();

  const report = {
    duplicateSlugGroups: 0,
    slugChanges: [],
    recipeDeletes: [],
    imageRenames: [],
    imagePathUpdates: [],
    unusedImages: [],
    bakFiles: [],
  };

  const initialUsedSlugs = new Set(recipes.map((r) => r.slug));
  const duplicateGroups = findDuplicateSlugGroups(recipes);
  report.duplicateSlugGroups = duplicateGroups.length;

  if (duplicateGroups.length) {
    log(`Found ${duplicateGroups.length} duplicate slug group(s).`);
  } else {
    ok("No duplicate slugs found.");
  }

  for (const [slug, group] of duplicateGroups) {
    const canonical = chooseCanonicalRecipe(group);
    log(`\nDuplicate slug: ${slug}`);
    log(`Keeping slug on: ${canonical.fileName}`);

    for (const recipe of group) {
      if (recipe.absPath === canonical.absPath) continue;

      const newSlug = buildUniqueSlug(recipe.baseName, initialUsedSlugs);
      initialUsedSlugs.add(newSlug);

      report.slugChanges.push({
        file: recipe.fileName,
        oldSlug: recipe.slug,
        newSlug,
      });

      recipe.slug = newSlug;
      recipe.data.slug = newSlug;

      if (opts.deleteDuplicateRecipes) {
        report.recipeDeletes.push({
          file: recipe.fileName,
          reason: `duplicate slug (${slug})`,
        });
      }
    }
  }

  if (opts.deleteDuplicateRecipes && report.recipeDeletes.length) {
    const keepSet = new Set(report.recipeDeletes.map((x) => x.file));
    recipes = recipes.filter((r) => !keepSet.has(r.fileName));
  }

  images = getImageFiles();
  const imageIndexByBase = createImageIndex(images);

  for (const recipe of recipes) {
    const matchedImage = pickImageForRecipe(recipe, imageIndexByBase);
    if (!matchedImage) continue;

    const ext = imageExt(matchedImage);
    const desiredAbs = path.join(IMAGES_DIR, `${recipe.slug}${ext}`);
    const currentPublicUrl = publicUrlFromImagePath(matchedImage);
    const desiredPublicUrl = publicUrlFromImagePath(desiredAbs);

    if (matchedImage !== desiredAbs) {
      if (!exists(desiredAbs)) {
        report.imageRenames.push({
          from: relFromRoot(matchedImage),
          to: relFromRoot(desiredAbs),
        });

        if (opts.write) {
          renameFile(matchedImage, desiredAbs, opts.noBackup);
        }
      } else {
        warn(
          `Wanted to rename image but target already exists for ${recipe.fileName}: ${relFromRoot(
            desiredAbs
          )}`
        );
      }
    }

    const finalImageAbs = exists(desiredAbs) ? desiredAbs : matchedImage;
    const finalImageUrl = publicUrlFromImagePath(finalImageAbs);

    if (recipe.image !== finalImageUrl) {
      report.imagePathUpdates.push({
        file: recipe.fileName,
        from: recipe.image || "(empty)",
        to: finalImageUrl,
      });
      recipe.image = finalImageUrl;
      recipe.data.image = finalImageUrl;
    }
  }

  const imagesAfterPlanning = getImageFiles();
  const usedImageUrls = new Set(
    recipes
      .map((r) => (typeof r.data.image === "string" ? r.data.image.trim() : ""))
      .filter(Boolean)
  );

  for (const abs of imagesAfterPlanning) {
    const url = publicUrlFromImagePath(abs);
    if (!usedImageUrls.has(url)) {
      report.unusedImages.push(relFromRoot(abs));
    }
  }

  report.bakFiles = [
    ...findBakFiles(RECIPES_DIR).map(relFromRoot),
    ...findBakFiles(IMAGES_DIR).map(relFromRoot),
  ];

  log("\n--- Planned changes ---");

  if (report.slugChanges.length) {
    log(`\nSlug changes: ${report.slugChanges.length}`);
    for (const item of report.slugChanges) {
      log(`- ${item.file}: ${item.oldSlug} -> ${item.newSlug}`);
    }
  } else {
    log("\nSlug changes: 0");
  }

  if (report.recipeDeletes.length) {
    log(`\nDuplicate recipe deletions: ${report.recipeDeletes.length}`);
    for (const item of report.recipeDeletes) {
      log(`- ${item.file} (${item.reason})`);
    }
  }

  if (report.imageRenames.length) {
    log(`\nImage renames: ${report.imageRenames.length}`);
    for (const item of report.imageRenames) {
      log(`- ${item.from} -> ${item.to}`);
    }
  } else {
    log("\nImage renames: 0");
  }

  if (report.imagePathUpdates.length) {
    log(`\nMDX image path updates: ${report.imagePathUpdates.length}`);
    for (const item of report.imagePathUpdates) {
      log(`- ${item.file}: ${item.from} -> ${item.to}`);
    }
  } else {
    log("\nMDX image path updates: 0");
  }

  if (report.unusedImages.length) {
    log(`\nUnused images: ${report.unusedImages.length}`);
    for (const img of report.unusedImages) {
      log(`- ${img}`);
    }
  } else {
    log("\nUnused images: 0");
  }

  if (report.bakFiles.length) {
    log(`\n.bak files found: ${report.bakFiles.length}`);
    if (opts.verbose) {
      for (const file of report.bakFiles) log(`- ${file}`);
    }
  } else {
    log("\n.bak files found: 0");
  }

  if (!opts.write) {
    log("\nDry run only. Nothing changed.");
    log(
      "Run with --write to apply fixes. Optional flags: --delete-unused-images --delete-bak --delete-duplicate-recipes"
    );
    return;
  }

  for (const recipe of recipes) {
    writeRecipe(recipe, opts.noBackup);
  }

  if (opts.deleteDuplicateRecipes && report.recipeDeletes.length) {
    for (const item of report.recipeDeletes) {
      const abs = path.join(RECIPES_DIR, item.file);
      if (exists(abs)) {
        if (!opts.noBackup) backupFile(abs);
        fs.unlinkSync(abs);
      }
    }
  }

  if (opts.deleteUnusedImages && report.unusedImages.length) {
    for (const rel of report.unusedImages) {
      const abs = path.join(ROOT, rel);
      if (exists(abs)) {
        if (!opts.noBackup) backupFile(abs);
        fs.unlinkSync(abs);
      }
    }
  }

  if (opts.deleteBak && report.bakFiles.length) {
    for (const rel of report.bakFiles) {
      const abs = path.join(ROOT, rel);
      if (exists(abs)) fs.unlinkSync(abs);
    }
  }

  ok("Recipe maintenance complete.");

  log("\nRecommended next steps:");
  log("1. Restart dev server");
  log("2. Check /recipes and a few individual recipe pages");
  log("3. If everything looks good, rerun with cleanup flags if needed");
}

main();