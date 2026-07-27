// src/lib/recipeimages.ts

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const PLACEHOLDER = "/brand/image-coming-soon.jpg";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");
const PUBLIC_DIR = path.join(process.cwd(), "public");

// Only keep true exceptions here
const OVERRIDES: Record<string, string> = {
  "easy-butter-bean-curry": "/images/recipes/butterbean-curry.png",
  "eggplant-curry-south-indian-brinjal-curry": "/images/recipes/egg-plant-curry.png",
  "veg-kurma-recipe-hotel-style-vegetable-korma": "/images/recipes/veg-kurma.png",
  "sweet-potato-chickpea-spinach-curry": "/images/recipes/sweetpotato-chickpea-spinach-recipe.png",
  "instant-pot-chana-masala": "/images/recipes/instant-pot-chana-masala.png",
};

let frontmatterImageBySlug: Map<string, string> | null = null;

function isRemoteUrl(src: string) {
  return /^https?:\/\//i.test(src);
}

function localPathExists(src: string) {
  const normalized = src.startsWith("/") ? src.slice(1) : src;
  return fs.existsSync(path.join(PUBLIC_DIR, normalized));
}

function isUsableImage(src?: string) {
  if (!src) return false;

  const value = src.trim();
  if (!value) return false;

  if (isRemoteUrl(value)) return true;
  return localPathExists(value);
}

function buildFrontmatterImageIndex() {
  const out = new Map<string, string>();

  if (!fs.existsSync(RECIPES_DIR)) return out;

  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(RECIPES_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const { data } = matter(raw);

    const slug =
      typeof data.slug === "string" && data.slug.trim()
        ? data.slug.trim()
        : file.replace(/\.mdx?$/i, "");

    const image = typeof data.image === "string" ? data.image.trim() : "";

    if (slug && image && isUsableImage(image)) {
      out.set(slug, image);
    }
  }

  return out;
}

function getFrontmatterImage(slug: string) {
  if (!frontmatterImageBySlug) {
    frontmatterImageBySlug = buildFrontmatterImageIndex();
  }

  return frontmatterImageBySlug.get(slug);
}

export function getRecipeImage(slug: string): string {
  if (!slug) return PLACEHOLDER;

  const frontmatterImage = getFrontmatterImage(slug);
  if (frontmatterImage) return frontmatterImage;

  const overrideImage = OVERRIDES[slug];
  if (isUsableImage(overrideImage)) return overrideImage;

  const slugFallback = `/images/recipes/${slug}.png`;
  if (isUsableImage(slugFallback)) return slugFallback;

  return PLACEHOLDER;
}

export function isPlaceholderImage(src: string) {
  return src === PLACEHOLDER;
}

export function resetRecipeImageIndex() {
  frontmatterImageBySlug = null;
}