#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const ROOT = process.cwd();

const RECIPES_DIR = path.join(ROOT, "content", "recipes");
const GUIDES_DIR = path.join(ROOT, "content", "guides");

const OUTPUT_DIR = path.join(ROOT, "generated", "instagram");
const RECIPES_OUT = path.join(OUTPUT_DIR, "recipes");
const GUIDES_OUT = path.join(OUTPUT_DIR, "guides");
const CSV_OUT = path.join(OUTPUT_DIR, "instagram-posts.csv");

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

const WIDTH = 1080;
const HEIGHT = 1080;

const FONT_FILE = path.join(ROOT, "public", "fonts", "Rajdhani-Bold.ttf");

const BRAND = {
  bg: "#000000",
  gold: "#D4AF37",
  softGold: "#D8B45A",
  red: "#8B2C2C",
  white: "#FFFFFF",
};

let RAJDHANI_FONT = null;
if (fs.existsSync(FONT_FILE)) {
  RAJDHANI_FONT = fs.readFileSync(FONT_FILE);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileExists(absPath) {
  try {
    return !!absPath && fs.existsSync(absPath);
  } catch {
    return false;
  }
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

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ensureLeadingSlash(p) {
  if (!p) return "";
  return p.startsWith("/") ? p : `/${p}`;
}

function toPublicAbs(publicPath) {
  const clean = ensureLeadingSlash(publicPath);
  return path.join(ROOT, "public", clean.replace(/^\//, ""));
}

function findContentFiles(dir) {
  if (!fileExists(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(dir, f))
    .sort();
}

function readMdx(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const fileName = path.basename(filePath);
  const baseName = fileName.replace(/\.mdx?$/i, "");

  return {
    filePath,
    fileName,
    baseName,
    data: parsed.data ?? {},
    content: parsed.content ?? "",
  };
}

function getAllImageFiles(dir) {
  if (!fileExists(dir)) return [];
  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...getAllImageFiles(abs));
    } else if (/\.(png|jpe?g|webp|avif)$/i.test(entry.name)) {
      out.push(abs);
    }
  }

  return out;
}

function resolveGuideHeroPublicPath(slug, image) {
  const legacyMap = {
    spices: "/images/guides/indian-spices-guide.png",
    "vegan-dairy-alternatives": "/images/guides/dairy.jpg",
    equipment: "/images/guides/equipment.jpg",
    herbs: "/images/guides/herbs.jpg",
    "vegan-indian-pantry-staples": "/images/guides/vegan-indian-pantry-staples.png",
  };

  const candidates = [
    image,
    legacyMap[slug],
    `/images/guides/${slug}.png`,
    `/images/guides/${slug}.jpg`,
    `/images/guides/${slug}.jpeg`,
    `/images/guides/${slug}.webp`,
    `/images/guides/${slug}/${slug}.png`,
    `/images/guides/${slug}/${slug}.jpg`,
    `/images/guides/${slug}/${slug}.jpeg`,
    `/images/guides/${slug}/${slug}.webp`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const abs = toPublicAbs(candidate);
    if (fileExists(abs)) return candidate;
  }

  return null;
}

function resolveRecipeHeroPublicPath(slug, image) {
  const overrides = {
    "easy-butter-bean-curry": "/images/recipes/butterbean-curry.png",
    "eggplant-curry-south-indian-brinjal-curry": "/images/recipes/egg-plant-curry.png",
    "veg-kurma-recipe-hotel-style-vegetable-korma": "/images/recipes/veg-kurma.png",
    "sweet-potato-chickpea-spinach-curry":
      "/images/recipes/sweetpotato-chickpea-spinach-recipe.png",
    "instant-pot-chana-masala": "/images/recipes/instant-pot-chana-masala.png",
  };

  const candidates = [
    image,
    overrides[slug],
    `/images/recipes/${slug}.png`,
    `/images/recipes/${slug}.jpg`,
    `/images/recipes/${slug}.jpeg`,
    `/images/recipes/${slug}.webp`,
    `/recipes/${slug}.png`,
    `/recipes/${slug}.jpg`,
    `/recipes/${slug}.jpeg`,
    `/recipes/${slug}.webp`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const abs = toPublicAbs(candidate);
    if (fileExists(abs)) return candidate;
  }

  return null;
}

function findAnyImageBySlug(slug, type) {
  const baseDir = path.join(ROOT, "public");
  const files = getAllImageFiles(baseDir);
  const slugKey = slugify(slug);

  const hit = files.find((abs) => {
    const rel = path.relative(baseDir, abs).replace(/\\/g, "/").toLowerCase();

    if (type === "guide" && !rel.includes("guides")) return false;
    if (type === "recipe" && !(rel.includes("recipes") || rel.startsWith("recipes/"))) {
      return false;
    }

    const fileKey = slugify(path.basename(abs, path.extname(abs)));
    return fileKey === slugKey;
  });

  if (!hit) return null;
  return `/${path.relative(baseDir, hit).replace(/\\/g, "/")}`;
}

function getPrimaryImageAbs(item, type) {
  const slug = String(item.data.slug || item.baseName).trim();

  let publicPath =
    type === "guide"
      ? resolveGuideHeroPublicPath(slug, item.data.image)
      : resolveRecipeHeroPublicPath(slug, item.data.image);

  if (!publicPath) publicPath = findAnyImageBySlug(slug, type);
  if (!publicPath) return null;

  const abs = toPublicAbs(publicPath);
  return fileExists(abs) ? abs : null;
}

function findLogoAbs() {
  const candidates = [
    path.join(ROOT, "public", "brand", "vegan-masala-logo.png"),
    path.join(ROOT, "public", "brand", "logo.png"),
    path.join(ROOT, "public", "images", "vegan-masala-logo.png"),
    path.join(ROOT, "public", "images", "logo.png"),
    path.join(ROOT, "public", "logo.png"),
  ];

  for (const p of candidates) {
    if (fileExists(p)) return p;
  }

  const all = getAllImageFiles(path.join(ROOT, "public"));
  return all.find((p) => /vegan.*masala|logo/i.test(path.basename(p))) || null;
}

function totalMinutes(item) {
  const prep = Number(item.data.prepMinutes ?? 0) || 0;
  const cook = Number(item.data.cookMinutes ?? 0) || 0;
  const total = prep + cook;
  return total > 0 ? total : null;
}

function pickTitle(item) {
  return String(item.data.title || item.baseName).trim();
}

function pickSubtitle(type) {
  return type === "recipe" ? "Vegan Indian Recipe" : "Beginner Guide";
}

function getUrl(item, type) {
  const slug = String(item.data.slug || item.baseName).trim();
  return `${SITE_URL}/${type === "guide" ? "guides" : "recipes"}/${slug}`;
}

function fitTitleLines(text, maxCharsPerLine = 16, maxLines = 2) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);

  const usedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (usedWords < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
  }

  return lines;
}

async function resizeLogo(logoAbs) {
  if (!logoAbs || !fileExists(logoAbs)) return null;

  const trimmed = await sharp(logoAbs)
    .trim({ threshold: 20 })
    .png()
    .toBuffer();

  return sharp(trimmed)
    .resize({
      width: 230,
      height: 230,
      fit: "contain",
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .trim({ threshold: 20 })
    .png()
    .toBuffer();
}

async function makeBackgroundImage(imageAbs) {
  if (!imageAbs || !fileExists(imageAbs)) {
    return sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: BRAND.bg,
      },
    })
      .png()
      .toBuffer();
  }

  return sharp(imageAbs)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function makeGradientOverlay() {
  const svg = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.88"/>
          <stop offset="18%" stop-color="#000000" stop-opacity="0.62"/>
          <stop offset="42%" stop-color="#000000" stop-opacity="0.28"/>
          <stop offset="65%" stop-color="#000000" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#topFade)"/>
    </svg>
  `);

  return sharp(svg).png().toBuffer();
}

async function renderTextOverlay({ title, subtitle, badgeText }) {
  const fonts = [
    {
      name: "Rajdhani",
      data: RAJDHANI_FONT,
      weight: 700,
      style: "normal",
    },
  ];

  const titleLines = fitTitleLines(title, 16, 2);
  const titleFontSize = titleLines.length === 1 ? 110 : 86;
  const subtitleTop = titleLines.length === 1 ? 168 : 214;

  const element = {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: "transparent",
        fontFamily: "Rajdhani",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 24,
              left: 34,
              width: 760,
              display: "flex",
              flexDirection: "column",
              color: BRAND.gold,
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 0.92,
            },
            children: titleLines.map((line) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  marginBottom: 2,
                },
                children: line,
              },
            })),
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: subtitleTop,
              left: 36,
              display: "flex",
              color: BRAND.softGold,
              fontSize: 50,
              fontWeight: 400,
              lineHeight: 1,
            },
            children: subtitle,
          },
        },
        badgeText
          ? {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  bottom: 92,
                  right: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: BRAND.red,
                  color: BRAND.white,
                  borderRadius: 18,
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 18,
                  paddingRight: 18,
                  fontSize: 28,
                  fontWeight: 700,
                },
                children: badgeText,
              },
            }
          : null,
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 30,
              left: 36,
              display: "flex",
              color: BRAND.softGold,
              fontSize: 28,
              fontWeight: 500,
            },
            children: "vegan-masala.com",
          },
        },
      ].filter(Boolean),
    },
  };

  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: WIDTH,
    },
  });

  return resvg.render().asPng();
}

function buildCaption(item, type) {
  const title = pickTitle(item);
  const url = getUrl(item, type);

  if (type === "recipe") {
    return `${title} 🌱

A vegan Indian recipe from Vegan Masala.

Full recipe:
${url}

#veganrecipes #indiancooking #veganindian #plantbased #vegandinner`;
  }

  return `${title} ✨

A beginner-friendly Vegan Masala guide to help you cook vegan Indian food with confidence.

Read more:
${url}

#indiancooking #veganindian #plantbased #cookingguide #veganrecipes`;
}

async function generateInstagramPost({ item, type, outDir, logoAbs }) {
  const slug = String(item.data.slug || item.baseName).trim();
  const title = pickTitle(item);
  const subtitle = pickSubtitle(type);
  const url = getUrl(item, type);
  const mins = totalMinutes(item);
  const badgeText = type === "recipe" && mins ? `${mins} MIN RECIPE` : null;

  const imageAbs = getPrimaryImageAbs(item, type);
  const bg = await makeBackgroundImage(imageAbs);
  const gradient = await makeGradientOverlay();
  const textOverlay = await renderTextOverlay({ title, subtitle, badgeText });
  const logoBuf = await resizeLogo(logoAbs);

  const outPath = path.join(outDir, `${slug}.png`);

  const composites = [
    { input: bg, left: 0, top: 0 },
    { input: gradient, left: 0, top: 0, blend: "over" },
    { input: textOverlay, left: 0, top: 0, blend: "over" },
  ];

  if (logoBuf) {
    composites.push({
      input: logoBuf,
      left: 820,
      top: 26,
      blend: "over",
    });
  }

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: BRAND.bg,
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  return {
    slug,
    title,
    caption: buildCaption(item, type),
    url,
    imagePath: outPath,
    type,
  };
}

function buildCsv(rows) {
  const header = ["type", "slug", "title", "caption", "url", "image_path"];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.type,
        row.slug,
        row.title,
        row.caption,
        row.url,
        path.relative(ROOT, row.imagePath).replace(/\\/g, "/"),
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  if (!RAJDHANI_FONT) {
    console.log("❌ Rajdhani font missing. Put it here:");
    console.log("public/fonts/Rajdhani-Bold.ttf");
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);
  ensureDir(RECIPES_OUT);
  ensureDir(GUIDES_OUT);

  const recipeFiles = findContentFiles(RECIPES_DIR).map(readMdx);
  const guideFiles = findContentFiles(GUIDES_DIR).map(readMdx);
  const logoAbs = findLogoAbs();

  const rows = [];

  for (const item of recipeFiles) {
    rows.push(
      await generateInstagramPost({
        item,
        type: "recipe",
        outDir: RECIPES_OUT,
        logoAbs,
      })
    );
  }

  for (const item of guideFiles) {
    rows.push(
      await generateInstagramPost({
        item,
        type: "guide",
        outDir: GUIDES_OUT,
        logoAbs,
      })
    );
  }

  fs.writeFileSync(CSV_OUT, buildCsv(rows), "utf8");

  console.log(`✅ Generated ${rows.length} Instagram posts`);
  console.log(`📁 Posts saved to: ${path.relative(ROOT, OUTPUT_DIR)}`);
  console.log(`📝 CSV saved to: ${path.relative(ROOT, CSV_OUT)}`);
}

main().catch((err) => {
  console.error("\n❌ Instagram generation failed\n");
  console.error(err);
  process.exit(1);
});