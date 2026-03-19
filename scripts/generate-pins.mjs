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

const OUTPUT_DIR = path.join(ROOT, "generated", "pins");
const RECIPES_OUT = path.join(OUTPUT_DIR, "recipes");
const GUIDES_OUT = path.join(OUTPUT_DIR, "guides");
const CSV_OUT = path.join(OUTPUT_DIR, "pinterest-posts.csv");

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

const WIDTH = 1000;
const HEIGHT = 1500;

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
} else {
  console.log("⚠ Rajdhani font not found:", FONT_FILE);
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

function pickFooterLines(type) {
  if (type === "recipe") {
    return ["Vegan Indian Cooking", "vegan-masala.com"];
  }

  return ["Beginner Guide", "vegan-masala.com"];
}

function getUrl(item, type) {
  const slug = String(item.data.slug || item.baseName).trim();
  return `${SITE_URL}/${type === "guide" ? "guides" : "recipes"}/${slug}`;
}

function fitTitleLinesBetter(text, maxCharsPerLine = 16, maxLines = 3) {
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

function getTitleFontSize(lineCount) {
  if (lineCount <= 1) return 74;
  if (lineCount === 2) return 66;
  return 58;
}

function getTitleTop(lineCount) {
  if (lineCount <= 1) return 60;
  if (lineCount === 2) return 54;
  return 46;
}

async function resizeLogo(logoAbs) {
  if (!logoAbs || !fileExists(logoAbs)) return null;

  return sharp(logoAbs)
    .resize({
      width: 360,
      height: 250,
      fit: "contain",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}

async function makeRoundedImagePanel(imageAbs) {
  const panelW = 730;
  const panelH = 680;
  const radius = 30;

  const borderSvg = Buffer.from(`
    <svg width="${panelW}" height="${panelH}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="2"
        width="${panelW - 4}"
        height="${panelH - 4}"
        rx="${radius}"
        ry="${radius}"
        fill="none"
        stroke="${BRAND.gold}"
        stroke-width="4"
      />
    </svg>
  `);

  const base = sharp({
    create: {
      width: panelW,
      height: panelH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  if (!imageAbs || !fileExists(imageAbs)) {
    return base.composite([{ input: borderSvg, left: 0, top: 0 }]).png().toBuffer();
  }

  const innerW = panelW - 8;
  const innerH = panelH - 8;

  const img = await sharp(imageAbs)
    .resize(innerW, innerH, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const mask = Buffer.from(`
    <svg width="${innerW}" height="${innerH}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="0"
        y="0"
        width="${innerW}"
        height="${innerH}"
        rx="${radius - 2}"
        ry="${radius - 2}"
        fill="white"
      />
    </svg>
  `);

  const rounded = await sharp(img)
    .composite([{ input: mask, left: 0, top: 0, blend: "dest-in" }])
    .png()
    .toBuffer();

  return base
    .composite([
      { input: rounded, left: 4, top: 4 },
      { input: borderSvg, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function renderTextBlockToPng({ title, footerLines, badgeText }) {
  const fonts = [
    {
      name: "Rajdhani",
      data: RAJDHANI_FONT,
      weight: 700,
      style: "normal",
    },
  ];

  const titleLines = fitTitleLinesBetter(title, 16, 3);
  const titleFontSize = getTitleFontSize(titleLines.length);
  const titleTop = getTitleTop(titleLines.length);

  const titleChildren = titleLines.map((line) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "center",
        width: "100%",
        marginBottom: 2,
      },
      children: line,
    },
  }));

  const badgeNode = badgeText
    ? {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: 1146,
            left: 670,
            width: 240,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: BRAND.red,
            color: BRAND.white,
            borderRadius: 20,
            fontSize: 28,
            fontWeight: 700,
          },
          children: badgeText,
        },
      }
    : null;

  const element = {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "transparent",
        position: "relative",
        fontFamily: "Rajdhani",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: titleTop,
              left: 100,
              width: 800,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              color: BRAND.gold,
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 1.02,
            },
            children: titleChildren,
          },
        },
        badgeNode,
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: 610,
              top: 1305,
              width: 330,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              color: BRAND.softGold,
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.12,
              gap: 10,
            },
            children: footerLines.map((line) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  width: "100%",
                },
                children: line,
              },
            })),
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

async function generatePin({ item, type, outDir, logoAbs }) {
  const slug = String(item.data.slug || item.baseName).trim();
  const title = pickTitle(item);
  const footerLines = pickFooterLines(type);
  const url = getUrl(item, type);
  const mins = totalMinutes(item);

  const badgeText = type === "recipe" && mins ? `${mins} Minute Recipe` : null;

  const imageAbs = getPrimaryImageAbs(item, type);
  const imagePanel = await makeRoundedImagePanel(imageAbs);
  const textBlock = await renderTextBlockToPng({ title, footerLines, badgeText });
  const logoBuf = await resizeLogo(logoAbs);

  const outPath = path.join(outDir, `${slug}.png`);

  const composites = [
    { input: textBlock, left: 0, top: 0 },
    { input: imagePanel, left: 135, top: 310 },
  ];

  if (logoBuf) {
    composites.push({ input: logoBuf, left: 22, top: 1188 });
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
    description: String(item.data.description || "").trim(),
    url,
    imagePath: outPath,
    type,
  };
}

function buildCsv(rows) {
  const header = ["type", "slug", "title", "description", "url", "image_path"];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.type,
        row.slug,
        row.title,
        row.description,
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
    rows.push(await generatePin({ item, type: "recipe", outDir: RECIPES_OUT, logoAbs }));
  }

  for (const item of guideFiles) {
    rows.push(await generatePin({ item, type: "guide", outDir: GUIDES_OUT, logoAbs }));
  }

  fs.writeFileSync(CSV_OUT, buildCsv(rows), "utf8");

  console.log(`✅ Generated ${rows.length} pins`);
  console.log(`📁 Pins saved to: ${path.relative(ROOT, OUTPUT_DIR)}`);
  console.log(`📝 CSV saved to: ${path.relative(ROOT, CSV_OUT)}`);
  console.log(`🔤 Using Rajdhani font from: ${FONT_FILE}`);
}

main().catch((err) => {
  console.error("\n❌ Pin generation failed\n");
  console.error(err);
  process.exit(1);
});