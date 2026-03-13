// src/lib/recipeimages.ts
import fs from "node:fs";
import path from "node:path";

const PLACEHOLDER = "/brand/image-coming-soon.jpg";

// Manual overrides for slugs that don't match filenames cleanly
const OVERRIDES: Record<string, string> = {
  "easy-butter-bean-curry": "/images/recipes/butterbean-curry.png",
  "eggplant-curry-south-indian-brinjal-curry": "/images/recipes/egg-plant-curry.png",
  "veg-kurma-recipe-hotel-style-vegetable-korma": "/images/recipes/veg-kurma.png",
  "sweet-potato-chickpea-spinach-curry": "/images/recipes/sweetpotato-chickpea-spinach-recipe.png",
  "instant-pot-chana-masala": "/images/recipes/instant-pot-chana-masala.png",
  "dal-makhani-recipe-authentic-punjabi-style": "/images/recipes/dahl-makhani.png",
};

function norm(input: string) {
  return input
    .toLowerCase()
    .replace(/\.(png|jpe?g|webp|avif)$/i, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function existsPublic(assetPath: string) {
  const full = path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
  return fs.existsSync(full);
}

type ImgEntry = {
  file: string;
  rel: string;
  key: string;
};

let IMAGES: ImgEntry[] | null = null;

function loadImages(): ImgEntry[] {
  const dir = path.join(process.cwd(), "public", "images", "recipes");
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f));

  return files.map((file) => ({
    file,
    rel: `/images/recipes/${file}`,
    key: norm(file),
  }));
}

function getImages() {
  if (!IMAGES) IMAGES = loadImages();
  return IMAGES;
}

function buildSafeCandidates(slug: string): string[] {
  const s = norm(slug);

  const variants = new Set<string>([
    s,
    s.replace(/-recipe$/g, ""),
    s.replace(/-recipe/g, ""),
    s.replace(/-authentic/g, ""),
    s.replace(/-restaurant-style/g, ""),
    s.replace(/-hotel-style/g, ""),
  ]);

  return Array.from(variants).filter(Boolean);
}

function buildDirectPathCandidates(base: string): string[] {
  return [
    `/images/recipes/${base}.png`,
    `/images/recipes/${base}.jpg`,
    `/images/recipes/${base}.jpeg`,
    `/images/recipes/${base}.webp`,
    `/images/recipes/${base}.avif`,
  ];
}

export function getRecipeImage(slug: string): string {
  // 0) manual override first
  const override = OVERRIDES[slug];
  if (override && existsPublic(override)) return override;

  const images = getImages();
  if (!images.length) return PLACEHOLDER;

  // 1) direct exact file path candidates
  const bases = buildSafeCandidates(slug);
  for (const base of bases) {
    const directCandidates = buildDirectPathCandidates(base);
    for (const candidate of directCandidates) {
      if (existsPublic(candidate)) return candidate;
    }
  }

  // 2) exact normalized filename match only
  const imageMap = new Map(images.map((img) => [img.key, img.rel]));
  for (const base of bases) {
    const hit = imageMap.get(base);
    if (hit && existsPublic(hit)) return hit;
  }

  // 3) very safe alias-only matches
  // Only allow these when one side is basically a cleaned version of the other.
  for (const img of images) {
    for (const base of bases) {
      if (
        img.key === base ||
        img.key === `${base}-recipe` ||
        base === `${img.key}-recipe`
      ) {
        if (existsPublic(img.rel)) return img.rel;
      }
    }
  }

  // 4) no fuzzy guessing — better to show placeholder than the wrong dish
  return PLACEHOLDER;
}

export function isPlaceholderImage(src: string) {
  return src === PLACEHOLDER;
}

export function resetRecipeImageIndex() {
  IMAGES = null;
}