#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
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

function compactText(s, max = 180) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function buildPrompt(data) {
  const title = compactText(data.title || "Vegan Indian recipe", 80);
  const description = compactText(data.description || "", 180);
  const cuisine = compactText(data.cuisine || "Indian", 40);

  const tags = Array.isArray(data.tags)
    ? data.tags
        .slice(0, 4)
        .map((t) => String(t).trim())
        .filter(Boolean)
        .join(", ")
    : "";

  const ingredients = Array.isArray(data.ingredients)
    ? data.ingredients
        .slice(0, 4)
        .map((i) => String(i).replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(", ")
    : "";

  return [
    `${title}.`,
    `Vegan ${cuisine} dish.`,
    description,
    ingredients ? `Ingredients visible: ${ingredients}.` : "",
    tags ? `Keywords: ${tags}.` : "",
    `Realistic editorial food photography.`,
    `Natural plating, warm light, authentic Indian presentation.`,
    `No text, no watermark, not cartoonish, not glossy AI food.`,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 900);
}

function buildReferencePrompt(data) {
  return [
    buildPrompt(data),
    `Use the reference image for realism, composition and plating inspiration only.`,
    `Create a fresh original Vegan Masala hero image.`,
  ]
    .join(" ")
    .slice(0, 950);
}

function getCurrentImagePath(recipeSlug, parsed) {
  const fmImage = String(parsed?.data?.image || "").trim();

  const directCandidates = [
    fmImage.startsWith("/") ? path.join(ROOT, "public", fmImage.replace(/^\//, "")) : "",
    path.join(OUT_DIR, `${recipeSlug}.png`),
    path.join(OUT_DIR, `${recipeSlug}.jpg`),
    path.join(OUT_DIR, `${recipeSlug}.jpeg`),
    path.join(OUT_DIR, `${recipeSlug}.webp`),
  ].filter(Boolean);

  for (const candidate of directCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
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

  const url = json?.data?.[0]?.url || json?.image?.url || null;

  if (!url) {
    throw new Error(`Recraft returned no image URL: ${JSON.stringify(json)}`);
  }

  return url;
}

async function remixImage({ imagePath, prompt, strength, model, styleId, token }) {
  const form = new FormData();
  const imageBuffer = fs.readFileSync(imagePath);
  const imageName = path.basename(imagePath);

  form.set("image", new Blob([imageBuffer], { type: "image/png" }), imageName);
  form.set("prompt", prompt);
  form.set("strength", String(strength));
  form.set("model", model);

  if (styleId) {
    form.set("style_id", styleId);
  }

  const res = await fetch("https://external.api.recraft.ai/v1/images/imageToImage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`Recraft remix failed: ${JSON.stringify(json)}`);
  }

  const url = json?.data?.[0]?.url || json?.image?.url || null;

  if (!url) {
    throw new Error(`Recraft returned no remixed image URL: ${JSON.stringify(json)}`);
  }

  return url;
}

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download generated image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function downloadSourceImageToTemp(sourceUrl, recipeSlug) {
  const res = await fetch(sourceUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      referer: sourceUrl,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download source image: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const tempPath = path.join(os.tmpdir(), `${recipeSlug}-source-image`);

  await (await import("sharp")).default(buffer).png().toFile(`${tempPath}.png`);
  return `${tempPath}.png`;
}

async function main() {
  const args = process.argv.slice(2);

  const dryRun = args.includes("--dry-run");
  const noWrite = args.includes("--no-write");

  const slugIdx = args.indexOf("--slug");
  const fileIdx = args.indexOf("--file");
  const remixPromptIdx = args.indexOf("--remix-prompt");
  const strengthIdx = args.indexOf("--strength");
  const remixModelIdx = args.indexOf("--remix-model");
  const referenceStrengthIdx = args.indexOf("--reference-strength");

  let filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : null;
  const remixPrompt = remixPromptIdx !== -1 ? String(args[remixPromptIdx + 1] || "").trim() : "";
  const strength = strengthIdx !== -1 ? Number(args[strengthIdx + 1]) : 0.35;
  const remixModel =
    remixModelIdx !== -1 ? String(args[remixModelIdx + 1] || "").trim() : "recraftv3";
  const referenceStrength =
    referenceStrengthIdx !== -1
      ? Number(args[referenceStrengthIdx + 1])
      : Number(process.env.RECRAFT_REFERENCE_STRENGTH || 0.28);

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
  const sourceImage = String(data.sourceImage || "").trim();

  ensureDir(OUT_DIR);
  const outPath = path.join(OUT_DIR, `${recipeSlug}.png`);
  const publicPath = `/images/recipes/${recipeSlug}.png`;

  let imageUrl = "";
  let modeLabel = "";
  let tempReferenceImagePath = "";

  try {
    if (remixPrompt) {
      const currentImagePath = getCurrentImagePath(recipeSlug, parsed);
      if (!currentImagePath) {
        die(
          `No current image found for ${recipeSlug}. Generate the first image before using --remix-prompt.`
        );
      }

      if (!(strength >= 0 && strength <= 1)) {
        die("Strength must be between 0 and 1.");
      }

      console.log(`\n🔹 Remixing image for ${recipeSlug}\n`);
      console.log(`Using source image: ${currentImagePath}`);
      console.log(`Remix model: ${remixModel}`);
      console.log(`Strength: ${strength}`);
      console.log(`Prompt: ${remixPrompt}\n`);

      if (dryRun) {
        ok("Dry run complete.");
        return;
      }

      imageUrl = await remixImage({
        imagePath: currentImagePath,
        prompt: remixPrompt,
        strength,
        model: remixModel,
        styleId,
        token,
      });

      modeLabel = "remixed";
    } else if (sourceImage) {
      if (!(referenceStrength >= 0 && referenceStrength <= 1)) {
        die("Reference strength must be between 0 and 1.");
      }

      const prompt = buildReferencePrompt(data);

      console.log(`\n🔹 Recraft reference generation for ${recipeSlug}\n`);
      console.log(`Using imported source image: ${sourceImage}`);
      console.log(`Reference model: ${remixModel}`);
      console.log(`Reference strength: ${referenceStrength}`);
      console.log(`Prompt length: ${prompt.length}`);
      console.log(`Prompt:\n${prompt}\n`);

      if (dryRun) {
        ok("Dry run complete.");
        return;
      }

      tempReferenceImagePath = await downloadSourceImageToTemp(sourceImage, recipeSlug);

      imageUrl = await remixImage({
        imagePath: tempReferenceImagePath,
        prompt,
        strength: referenceStrength,
        model: remixModel,
        styleId,
        token,
      });

      modeLabel = "generated from reference image";
    } else {
      const prompt = buildPrompt(data);

      console.log(`\n🔹 Recraft prompt for ${recipeSlug}:\n`);
      console.log(`Prompt length: ${prompt.length}`);
      console.log(prompt);
      console.log("");

      if (dryRun) {
        ok("Dry run complete.");
        return;
      }

      imageUrl = await generateImage({
        prompt,
        model,
        styleId,
        token,
      });

      modeLabel = "generated";
    }

    console.log(`🔹 Recraft image URL:\n${imageUrl}\n`);

    const buffer = await downloadBuffer(imageUrl);

    await (await import("sharp")).default(buffer)
      .resize(1600, 1200, { fit: "cover" })
      .png()
      .toFile(outPath);

    if (!noWrite) {
      const nextData = {
        ...parsed.data,
        image: publicPath,
        imageVersion: Date.now(),
      };

      const nextMdx = matter.stringify(parsed.content || "", nextData);
      fs.writeFileSync(filePath, nextMdx, "utf8");
      ok(`Updated frontmatter image: ${publicPath}`);
      ok(`Updated frontmatter imageVersion: ${nextData.imageVersion}`);
    }

    ok(`${modeLabel === "remixed" ? "Remixed" : "Saved"} image: ${outPath}`);
  } finally {
    if (tempReferenceImagePath && fs.existsSync(tempReferenceImagePath)) {
      try {
        fs.unlinkSync(tempReferenceImagePath);
      } catch {
        // ignore cleanup failure
      }
    }
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err.message || err}\n`);
  process.exit(1);
});