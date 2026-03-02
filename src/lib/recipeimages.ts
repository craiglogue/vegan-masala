// src/lib/recipeimages.ts
import fs from "node:fs";
import path from "node:path";

const PLACEHOLDER = "/brand/image-coming-soon.jpg";

// ✅ Manual overrides for slugs that won't match filenames cleanly
const OVERRIDES: Record<string, string> = {
  "easy-butter-bean-curry": "/images/recipes/butterbean-curry.png",
  "eggplant-curry-south-indian-brinjal-curry": "/images/recipes/egg-plant-curry.png",
  "veg-kurma-recipe-hotel-style-vegetable-korma": "/images/recipes/veg-kurma.png",
  "sweet-potato-chickpea-spinach-curry": "/images/recipes/sweetpotato-chickpea-spinach-recipe.png",
    "instant-pot-chana-masala": "/images/recipes/instant-pot-chana-masala.png",

  // ✅ FIX: dal makhani was fuzzy-matching to moong dal image
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

function tokens(s: string) {
  return new Set(norm(s).split("-").filter(Boolean));
}

function existsPublic(assetPath: string) {
  const full = path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
  return fs.existsSync(full);
}

type ImgEntry = {
  file: string;
  rel: string;
  key: string;
  toks: Set<string>;
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
    toks: tokens(file),
  }));
}

function getImages() {
  if (!IMAGES) IMAGES = loadImages();
  return IMAGES;
}

function scoreMatch(slug: string, entry: ImgEntry) {
  const slugKey = norm(slug);
  const slugToks = tokens(slug);

  if (slugKey === entry.key) return 999;

  let overlap = 0;
  for (const t of entry.toks) {
    if (slugToks.has(t)) overlap += 1;
  }

  const union = new Set([...slugToks, ...entry.toks]).size || 1;
  const jaccard = overlap / union;

  const containsBonus =
    slugKey.includes(entry.key) || entry.key.includes(slugKey) ? 0.25 : 0;

  const simplifiedSlug = slugKey
    .replace(/-recipe$/g, "")
    .replace(/-recipe/g, "")
    .replace(/-authentic/g, "")
    .replace(/-restaurant-style/g, "")
    .replace(/-hotel-style/g, "");

  const simplifiedBonus =
    simplifiedSlug.includes(entry.key) || entry.key.includes(simplifiedSlug)
      ? 0.2
      : 0;

  const dalBonus =
    (slugKey.includes("dal") && entry.key.includes("dahl")) ||
    (slugKey.includes("dahl") && entry.key.includes("dal"))
      ? 0.1
      : 0;

  return jaccard + containsBonus + simplifiedBonus + dalBonus;
}

export function getRecipeImage(slug: string): string {
  // 0) manual override first
  const override = OVERRIDES[slug];
  if (override && existsPublic(override)) return override;

  const images = getImages();
  if (!images.length) return PLACEHOLDER;

  // 1) direct slug.png/jpg fast path
  const directCandidates = [
    `/images/recipes/${slug}.png`,
    `/images/recipes/${slug}.jpg`,
    `/images/recipes/${slug}.jpeg`,
    `/images/recipes/${slug}.webp`,
  ];
  for (const c of directCandidates) {
    if (existsPublic(c)) return c;
  }

  // 2) fuzzy best match
  let best: { rel: string; score: number } | null = null;
  for (const img of images) {
    const s = scoreMatch(slug, img);
    if (!best || s > best.score) best = { rel: img.rel, score: s };
  }

  if (best && best.score >= 0.22 && existsPublic(best.rel)) return best.rel;

  return PLACEHOLDER;
}

export function isPlaceholderImage(src: string) {
  return src === PLACEHOLDER;
}

export function resetRecipeImageIndex() {
  IMAGES = null;
}