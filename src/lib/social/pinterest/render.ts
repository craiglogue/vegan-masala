import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import opentype from "opentype.js";

import { getRecipeBySlug } from "../../recipes";
import { getGuideBySlug } from "../../guides";
import { detectContentTypeBySlug, titleFromSlug } from "../core/content";
import { cleanPromoText, fitWrappedTextBlock, wrapWords } from "../core/text";
import {
  findBrandBackground,
  findBrandLogo,
  findContentImage,
  findFontPath,
} from "../core/assets";
import { saveGeneratedPinterestImage } from "../core/generatedAssets";
import { updateManifest } from "../core/manifest";
import { buildPinterestCaption, saveCaption } from "../core/captions";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "pinterest");
const PUBLIC_OUTPUT = process.env.VERCEL
  ? null
  : path.join(process.cwd(), "public", "generated", "pinterest");

const WIDTH = 1000;
const HEIGHT = 1500;

const BRAND = {
  bg: "#081318",
  red: "#a33f3a",
  gold: "#c8a646",
  border: "#c8a646",
  soft: "rgba(255,255,255,0.95)",
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFontOrThrow() {
  const fontPath = findFontPath();
  if (!fontPath) throw new Error("Rajdhani font not found");
  return opentype.loadSync(fontPath);
}

function getEditorialContent(slug: string, type: "recipe" | "guide") {
  if (type === "recipe") {
    const recipe: any = getRecipeBySlug(slug);
    if (recipe) {
      return {
        title: recipe.title || titleFromSlug(slug),
        description: recipe.description || "",
        socialHook: recipe.socialHook || "",
        introNote: recipe.introNote || "",
        servingSuggestion: recipe.servingSuggestion || "",
      };
    }
  }

  const guide: any = getGuideBySlug(slug);
  if (guide) {
    return {
      title: guide.title || titleFromSlug(slug),
      description: guide.description || "",
      socialHook: "",
      introNote: "",
      servingSuggestion: "",
    };
  }

  return {
    title: titleFromSlug(slug),
    description: "",
    socialHook: "",
    introNote: "",
    servingSuggestion: "",
  };
}

function buildHook(editorial: ReturnType<typeof getEditorialContent>) {
  return cleanPromoText(
    editorial.socialHook || editorial.introNote || editorial.description || editorial.title
  );
}

function buildSubtitle(editorial: ReturnType<typeof getEditorialContent>) {
  return cleanPromoText(
    editorial.description || editorial.servingSuggestion || editorial.title
  );
}

function makeTextPathSvg(
  text: string,
  font: opentype.Font,
  fontSize: number,
  fill: string,
  x: number,
  baselineY: number,
  letterSpacing = 0,
  align: "left" | "center" = "center"
) {
  if (!text.trim()) return "";

  let cursorX = 0;
  const glyphs = font.stringToGlyphs(text);
  const unitsPerEm = font.unitsPerEm || 1000;
  const scale = fontSize / unitsPerEm;

  const parts: string[] = [];
  let minX = Infinity;
  let maxX = -Infinity;

  for (const glyph of glyphs) {
    const pathObj = glyph.getPath(cursorX, baselineY, fontSize);
    const bbox = pathObj.getBoundingBox();

    if (Number.isFinite(bbox.x1) && Number.isFinite(bbox.x2)) {
      minX = Math.min(minX, bbox.x1);
      maxX = Math.max(maxX, bbox.x2);
    }

    parts.push(pathObj.toPathData(2));
    cursorX += (glyph.advanceWidth || unitsPerEm * 0.5) * scale + letterSpacing;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return "";

  let translateX = x;
  if (align === "center") {
    const width = maxX - minX;
    translateX = x - (minX + width / 2);
  } else {
    translateX = x - minX;
  }

  return `<g transform="translate(${translateX},0)"><path d="${parts.join(" ")}" fill="${fill}" /></g>`;
}

function makeShadowedTextPathSvg(
  text: string,
  font: opentype.Font,
  fontSize: number,
  fill: string,
  x: number,
  baselineY: number,
  letterSpacing = 0,
  shadowOpacity = 0.18,
  shadowOffsetY = 2,
  align: "left" | "center" = "center"
) {
  const shadow = makeTextPathSvg(
    text,
    font,
    fontSize,
    `rgba(0,0,0,${shadowOpacity})`,
    x,
    baselineY + shadowOffsetY,
    letterSpacing,
    align
  );

  const main = makeTextPathSvg(text, font, fontSize, fill, x, baselineY, letterSpacing, align);
  return `${shadow}${main}`;
}

async function backgroundLayer() {
  const bgPath = findBrandBackground();

  if (!bgPath) {
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

  return sharp(bgPath)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .modulate({ brightness: 1.7, saturation: 1.2 })
    .gamma(1.15)
    .png()
    .toBuffer();
}

async function darkOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${WIDTH}" height="${HEIGHT}" fill="#081318" fill-opacity="0.05"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function topGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0.30"/>
            <stop offset="22%" stop-color="black" stop-opacity="0.10"/>
            <stop offset="48%" stop-color="black" stop-opacity="0.02"/>
            <stop offset="100%" stop-color="black" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function bottomGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="black" stop-opacity="0.14"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.06"/>
            <stop offset="36%" stop-color="black" stop-opacity="0.01"/>
            <stop offset="100%" stop-color="black" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function outerFrame() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="18" width="${WIDTH - 36}" height="${HEIGHT - 36}" rx="38" ry="38"
          fill="none" stroke="${BRAND.border}" stroke-opacity="0.95" stroke-width="2.5" />
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function imageFrame() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect x="100" y="338" width="800" height="720" rx="30" ry="30"
          fill="none" stroke="${BRAND.border}" stroke-opacity="0.95" stroke-width="3" />
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function badgeLayer(font: opentype.Font, type: "recipe" | "guide") {
  const label = type === "recipe" ? "RECIPE" : "GUIDE";
  const badgeWidth = type === "recipe" ? 175 : 160;

  const rect = `
    <rect x="74" y="76" rx="22" ry="22" width="${badgeWidth}" height="54" fill="${BRAND.red}" />
  `;

  const text = makeShadowedTextPathSvg(
    label,
    font,
    28,
    "#ffffff",
    74 + badgeWidth / 2,
    112,
    0.7,
    0.15,
    2,
    "center"
  );

  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        ${rect}
        ${text}
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function textLayer(font: opentype.Font, title: string, hook: string, subtitle: string) {
  const titleLines = wrapWords(cleanPromoText(title), 18);

  const hookBlock = fitWrappedTextBlock({
    text: hook,
    baseChars: 34,
    baseFontSize: 34,
    baseLineHeight: 36,
    maxHeight: 130,
    minFontSize: 20,
  });

  const subtitleBlock = fitWrappedTextBlock({
    text: subtitle,
    baseChars: 46,
    baseFontSize: 24,
    baseLineHeight: 28,
    maxHeight: 150,
    minFontSize: 16,
  });

  const hookLines = hookBlock.lines;
  const subtitleLines = subtitleBlock.lines;

  let titleFont = 72;
  let titleLine = 62;

  if (title.length > 28) {
    titleFont = 64;
    titleLine = 56;
  }

  if (title.length > 40) {
    titleFont = 58;
    titleLine = 50;
  }

  const titleSvg = titleLines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        titleFont,
        BRAND.gold,
        74,
        205 + i * titleLine,
        0.4,
        0.18,
        3,
        "left"
      )
    )
    .join("");

  const hookBaseY = 1165;

  const hookSvg = hookLines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        hookBlock.fontSize,
        BRAND.gold,
        74,
        hookBaseY + i * hookBlock.lineHeight,
        0.08,
        0.14,
        2,
        "left"
      )
    )
    .join("");

  const subtitleBaseY = hookBaseY + hookLines.length * hookBlock.lineHeight + 18;

  const subtitleSvg = subtitleLines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        subtitleBlock.fontSize,
        BRAND.soft,
        74,
        subtitleBaseY + i * subtitleBlock.lineHeight,
        0.03,
        0.08,
        2,
        "left"
      )
    )
    .join("");

  const siteSvg = makeShadowedTextPathSvg(
    "vegan-masala.com",
    font,
    40,
    "#ffffff",
    WIDTH / 2,
    HEIGHT - 56,
    0.05,
    0.1,
    2,
    "center"
  );

  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        ${titleSvg}
        ${hookSvg}
        ${subtitleSvg}
        ${siteSvg}
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function logoLayer() {
  const logoPath = findBrandLogo();
  if (!logoPath) return null;

  return sharp(logoPath)
    .trim({ threshold: 10 })
    .resize(190, 190, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function heroImageLayer(slug: string, type: "recipe" | "guide") {
  const img = findContentImage(slug, type);
  if (!img) return { image: null, shadow: null };

  const roundedMask = Buffer.from(`
    <svg width="800" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="800" height="720" rx="30" ry="30" fill="white"/>
    </svg>
  `);

  const image = await sharp(img)
    .resize(800, 720, { fit: "cover" })
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const shadow = await sharp(
    Buffer.from(`
      <svg width="828" height="748" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="black" flood-opacity="0.20"/>
          </filter>
        </defs>
        <rect x="14" y="14" width="800" height="720" rx="30" ry="30"
          fill="black" opacity="0.14" filter="url(#shadow)" />
      </svg>
    `)
  )
    .png()
    .toBuffer();

  return { image, shadow };
}

export async function renderPinterestBySlug(slug: string) {
  const detected = detectContentTypeBySlug(slug);
  if (!detected) throw new Error("Slug not found");

  const type = detected as "recipe" | "guide";
  const editorial = getEditorialContent(slug, type);
  const font = loadFontOrThrow();

  ensureDir(OUTPUT);
  if (PUBLIC_OUTPUT) ensureDir(PUBLIC_OUTPUT);

  const bg = await backgroundLayer();
  const overlay = await darkOverlay();
  const top = await topGradient();
  const bottom = await bottomGradient();
  const frame = await outerFrame();
  const imgFrame = await imageFrame();
  const badge = await badgeLayer(font, type);
  const text = await textLayer(
    font,
    editorial.title,
    buildHook(editorial),
    buildSubtitle(editorial)
  );
  const logo = await logoLayer();
  const hero = await heroImageLayer(slug, type);

  const layers: sharp.OverlayOptions[] = [
    { input: bg, left: 0, top: 0 },
    { input: overlay, left: 0, top: 0 },
  ];

  if (hero.shadow) layers.push({ input: hero.shadow, left: 86, top: 324 });
  if (hero.image) layers.push({ input: hero.image, left: 100, top: 338 });

  layers.push(
    { input: top, left: 0, top: 0 },
    { input: bottom, left: 0, top: 0 },
    { input: badge, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: imgFrame, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 }
  );

  if (logo) {
    layers.push({ input: logo, left: WIDTH - 238, top: HEIGHT - 270 });
  }

  const finalPngBuffer = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: BRAND.bg,
    },
  })
    .composite(layers)
    .png()
    .toBuffer();

  const out = path.join(OUTPUT, `${slug}.png`);
  fs.writeFileSync(out, finalPngBuffer);

  if (PUBLIC_OUTPUT) {
    fs.writeFileSync(path.join(PUBLIC_OUTPUT, `${slug}.png`), finalPngBuffer);
  }

  const saved = await saveGeneratedPinterestImage(slug, finalPngBuffer);
  const caption = buildPinterestCaption(slug, type);
  saveCaption("pinterest", slug, caption);
  updateManifest(slug, "pinterest");

  return {
    success: true,
    count: 1,
    slug,
    image: saved.url,
    storage: saved.storage,
    path: saved.path,
    message: `Pinterest generated for ${slug}`,
  };
}