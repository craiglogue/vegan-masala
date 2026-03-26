#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const RECIPES_DIR = path.join(ROOT, "content", "recipes");
const OUT_DIR = path.join(ROOT, "public", "images", "recipes");

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getAllRecipePaths() {
  if (!fs.existsSync(RECIPES_DIR)) die(`Missing recipes folder: ${RECIPES_DIR}`);
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f));
}

function getLatestRecipePath() {
  const files = getAllRecipePaths();
  if (!files.length) die("No recipe files found.");
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

function findRecipeBySlug(slug) {
  for (const file of getAllRecipePaths()) {
    const raw = fs.readFileSync(file, "utf8");
    const { data } = matter(raw);
    if (String(data?.slug || "").trim() === slug) return file;
  }
  return null;
}

function buildPrompt(data) {
  const title = String(data.title || "Vegan Indian recipe").trim();
  const description = String(data.description || "").trim();
  const cuisine = String(data.cuisine || "Indian").trim();
  const tags = Array.isArray(data.tags) ? data.tags.join(", ") : "";
  const ingredients = Array.isArray(data.ingredients)
    ? data.ingredients.slice(0, 8).join(", ")
    : "";

  return [
    `A realistic editorial food photograph of ${title}.`,
    `Vegan ${cuisine} dish.`,
    description ? description : "",
    ingredients ? `Visible ingredients may include: ${ingredients}.` : "",
    tags ? `Keywords: ${tags}.` : "",
    `Premium, natural food styling.`,
    `Warm, rich, grounded lighting.`,
    `Family-table feel, elegant but not fussy.`,
    `Authentic looking Indian food presentation.`,
    `No text, no typography, no watermark, no collage, no split layout.`,
    `Not glossy AI fantasy food, not overly stylised, not cartoonish.`,
    `Suitable as a recipe hero image for a premium vegan Indian cooking website.`,
  ]
    .filter(Boolean)
    .join(" ");
}

async function generateImage({ prompt, model, styleId, token }) {
  const body = {
    prompt,
    model,
    ...(styleId ? { style_id: styleId } : {}),
  };

  const res = await fetch("https://external.api.recraft.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`Recraft image generation failed: ${JSON.stringify(json)}`);
  }

  const url =
    json?.data?.[0]?.url ||
    json?.image?.url ||
    null;

  if (!url) {
    throw new Error(`Recraft returned no image URL: ${JSON.stringify(json)}`);
  }

  return url;
}

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download generated image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const args = process.argv.slice(2);

  const dryRun = args.includes("--dry-run");
  const noWrite = args.includes("--no-write");

  const slugIdx = args.indexOf("--slug");
  const fileIdx = args.indexOf("--file");

  let filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : null;

  if (!filePath && slug) {
    filePath = findRecipeBySlug(slug);
    if (!filePath) die(`Could not find recipe with slug: ${slug}`);
  }

  if (!filePath && args.includes("--latest")) {
    filePath = getLatestRecipePath();
  }

  if (!filePath) {
    die("Use --latest, --file <path> or --slug <slug>.");
  }

  if (!path.isAbsolute(filePath)) {
    filePath = path.join(ROOT, filePath);
  }

  if (!fs.existsSync(filePath)) {
    die(`File not found: ${filePath}`);
  }

  const token = process.env.RECRAFT_API_TOKEN;
  const model = process.env.RECRAFT_MODEL || "recraftv4";
  const styleId = process.env.RECRAFT_STYLE_ID || "";

  if (!token && !dryRun) {
    die("Missing RECRAFT_API_TOKEN in .env.local");
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data || {};

  const recipeSlug = String(data.slug || path.basename(filePath).replace(/\.mdx?$/i, "")).trim();
  const prompt = buildPrompt(data);

  console.log(`\n🔹 Recraft prompt for ${recipeSlug}:\n`);
  console.log(prompt);
  console.log("");

  if (dryRun) {
    ok("Dry run complete.");
    return;
  }

  const imageUrl = await generateImage({
    prompt,
    model,
    styleId,
    token,
  });

  console.log(`🔹 Recraft image URL:\n${imageUrl}\n`);

  const buffer = await downloadBuffer(imageUrl);

  ensureDir(OUT_DIR);

  const outPath = path.join(OUT_DIR, `${recipeSlug}.png`);
  await (await import("sharp")).default(buffer)
    .resize(1600, 1200, { fit: "cover" })
    .png()
    .toFile(outPath);

  const publicPath = `/images/recipes/${recipeSlug}.png`;

  if (!noWrite) {
    const nextData = {
      ...parsed.data,
      image: publicPath,
    };

    const nextMdx = matter.stringify(parsed.content || "", nextData);
    fs.writeFileSync(filePath, nextMdx, "utf8");
    ok(`Updated frontmatter image: ${publicPath}`);
  }

  ok(`Saved image: ${outPath}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message || err}\n`);
  process.exit(1);
});