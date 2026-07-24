import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import opentype from "opentype.js";

import { BRAND, findBrandLogo } from "./core/brand";
import {
  allContent,
  detectContentTypeBySlug,
  ensureDir,
  latestContent,
  slugFromFile,
  titleFromSlug,
  type ContentType,
} from "./core/content";
import { backgroundBuffer, findContentImage } from "./core/images";
import { buildInstagramCaption, saveCaption } from "./core/captions";
import { updateManifest } from "./core/manifest";
import { saveGeneratedInstagramImage } from "./core/generatedAssets";
import { renderInstagramBySlug } from "./instagram/render";

import { getRecipeBySlug } from "@/lib/recipes";
import { getGuideBySlug } from "@/lib/guides";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "instagram");

const PUBLIC_OUTPUT = process.env.VERCEL
  ? null
  : path.join(process.cwd(), "public", "generated", "instagram");

const WIDTH = 1080;
const HEIGHT = 1080;

const BADGE_LEFT = 84;
const BADGE_TOP = 66;

const TITLE_LEFT = 84;
const TITLE_TOP = 150;
const TITLE_WIDTH = 410;

const IMAGE_LEFT = 150;
const IMAGE_TOP = 290;
const IMAGE_WIDTH = 780;
const IMAGE_HEIGHT = 540;

const BOTTOM_LEFT = 84;
const HOOK_TOP = 880;
const SUBTITLE_TOP = 948;
const SITE_TOP = 1038;

const LOGO_SIZE = 124;
const LOGO_LEFT = WIDTH - LOGO_SIZE - 76;
const LOGO_TOP = HEIGHT - LOGO_SIZE - 64;

function getBaseUrl() {
  return (
    process.env.SOCIAL_ASSET_BASE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

async function fetchBuffer(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function resolveSourceImage(
  slug: string,
  type: ContentType
): Promise<string | Buffer | null> {
  if (!process.env.VERCEL) {
    return findContentImage(slug, type);
  }

  const folder = type === "recipe" ? "recipes" : "guides";
  const baseUrl = getBaseUrl();
  const exts = ["png", "jpg", "jpeg", "webp"];

  for (const ext of exts) {
    const url = `${baseUrl}/images/${folder}/${slug}.${ext}`;
    const buffer = await fetchBuffer(url);
    if (buffer) return buffer;
  }

  return null;
}

async function resolveLogo(): Promise<Buffer | null> {
  if (!process.env.VERCEL) {
    const local = findBrandLogo();
    if (!local || !fs.existsSync(local)) return null;
    return fs.readFileSync(local);
  }

  const baseUrl = getBaseUrl();
  const candidates = [
    `${baseUrl}/brand/logo-flat.png`,
    `${baseUrl}/brand/vegan-masala-logo.png`,
    `${baseUrl}/brand/logo.png`,
    `${baseUrl}/images/vegan-masala-logo.png`,
    `${baseUrl}/images/logo.png`,
    `${baseUrl}/logo.png`,
  ];

  for (const url of candidates) {
    const buffer = await fetchBuffer(url);
    if (buffer) return buffer;
  }

  return null;
}

async function resolveFontPath(): Promise<string | null> {
  if (!process.env.VERCEL) {
    const localCandidates = [
      path.join(process.cwd(), "public", "fonts", "Rajdhani-Bold.ttf"),
      path.join(process.cwd(), "public", "fonts", "Rajdhani-Regular.ttf"),
    ];

    for (const candidate of localCandidates) {
      if (fs.existsSync(candidate)) return candidate;
    }

    return null;
  }

  const baseUrl = getBaseUrl();
  const remoteCandidates = [
    `${baseUrl}/fonts/Rajdhani-Bold.ttf`,
    `${baseUrl}/fonts/Rajdhani-Regular.ttf`,
  ];

  for (const url of remoteCandidates) {
    const buffer = await fetchBuffer(url);
    if (buffer) {
      const out = path.join(
        ROOT,
        "generated",
        "instagram",
        path.basename(url)
      );
      ensureDir(path.dirname(out));
      fs.writeFileSync(out, buffer);
      return out;
    }
  }

  return null;
}

function loadFontOrThrow(fontPath: string | null) {
  if (!fontPath || !fs.existsSync(fontPath)) {
    throw new Error("Rajdhani font not found for Instagram rendering");
  }

  return opentype.loadSync(fontPath);
}

function pickFromSeed(slug: string, options: string[]) {
  const sum = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[sum % options.length];
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

    const advance =
      (glyph.advanceWidth || unitsPerEm * 0.5) * scale + letterSpacing;
    cursorX += advance;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return "";
  }

  let translateX = x;

  if (align === "center") {
    const width = maxX - minX;
    translateX = x - (minX + width / 2);
  } else {
    translateX = x - minX;
  }

  return `
    <g transform="translate(${translateX},0)">
      <path d="${parts.join(" ")}" fill="${fill}" />
    </g>
  `;
}

function makeShadowedTextPathSvg(
  text: string,
  font: opentype.Font,
  fontSize: number,
  fill: string,
  x: number,
  baselineY: number,
  letterSpacing = 0,
  shadowOpacity = 0.2,
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

  const main = makeTextPathSvg(
    text,
    font,
    fontSize,
    fill,
    x,
    baselineY,
    letterSpacing,
    align
  );

  return `${shadow}${main}`;
}

function wrapTitle(text: string) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [text];

  const lines: string[] = [];
  let current = "";
  let maxLen = 14;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxLen) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;

      if (lines.length === 1) maxLen = 16;
      if (lines.length === 2) maxLen = 18;
      if (lines.length === 3) maxLen = 20;
    }
  }

  if (current) lines.push(current);

  if (lines.length <= 4) return lines;
  return [lines[0], lines[1], lines[2], lines.slice(3).join(" ")];
}

function wrapCopy(text: string, maxChars: number, maxLines: number) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);

  const usedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (usedWords < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
  }

  return lines;
}

function buildBadge(type: ContentType) {
  return type === "recipe" ? "RECIPE" : "GUIDE";
}

function cleanPromoText(text?: string) {
  return String(text || "")
    .replace(/\bpacked with flavour\b/gi, "")
    .replace(/\bperfect weeknight meal\b/gi, "")
    .replace(/\brestaurant-quality\b/gi, "")
    .replace(/\bcomes together beautifully\b/gi, "")
    .replace(/\bwritten in the style of\b/gi, "")
    .replace(/\bflavour-packed\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getEditorialContent(slug: string, type: ContentType) {
  if (type === "recipe") {
    const recipe: any = getRecipeBySlug(slug);

    if (recipe) {
      return {
        title: recipe.title || titleFromSlug(slug),
        description: recipe.description || "",
        introNote: recipe.introNote || "",
        servingSuggestion: recipe.servingSuggestion || "",
        socialHook: recipe.socialHook || "",
      };
    }
  }

  const guide: any = getGuideBySlug(slug);

  if (guide) {
    return {
      title: guide.title || titleFromSlug(slug),
      description: guide.description || "",
      introNote: "",
      servingSuggestion: "",
      socialHook: "",
    };
  }

  return {
    title: titleFromSlug(slug),
    description: "",
    introNote: "",
    servingSuggestion: "",
    socialHook: "",
  };
}

function buildNaturalHook(
  content: {
    title?: string;
    description?: string;
    introNote?: string;
    servingSuggestion?: string;
    socialHook?: string;
  },
  type: ContentType,
  slug: string
) {
  const clean = content.socialHook || content.introNote || "";

  if (clean) {
    return cleanPromoText(clean)
      .split(/[.!?]/)[0]
      .trim()
      .replace(/\s+/g, " ");
  }

  if (type === "guide") {
    return pickFromSeed(slug, [
      "Cook With More Confidence",
      "Simple, Practical Kitchen Help",
      "Useful Guidance For Home Cooks",
      "Start With The Essentials",
    ]);
  }

  return pickFromSeed(slug, [
    "Family-Style Vegan Indian Food",
    "A Dish Worth Making Well",
    "Warm, Grounded, Full Of Character",
    "Made For The Centre Of The Table",
  ]);
}

function buildNaturalSubtitle(
  content: {
    description?: string;
    introNote?: string;
    servingSuggestion?: string;
  },
  type: ContentType,
  slug: string
) {
  const clean = content.description || content.servingSuggestion || "";

  if (clean) {
    const firstSentence = cleanPromoText(clean)
      .split(/[.!?]/)[0]
      .trim()
      .replace(/\s+/g, " ");

    const words = firstSentence.split(" ");
    return words.slice(0, 10).join(" ");
  }

  if (type === "guide") {
    return pickFromSeed(slug, [
      "Practical guidance for better everyday cooking",
      "Clear help for building confidence in the kitchen",
      "A simple guide for stronger flavour and technique",
    ]);
  }

  return pickFromSeed(slug, [
    "Vegan Indian cooking with depth and warmth",
    "Built on proper masala and steady seasoning",
    "The kind of cooking that earns a place at the table",
  ]);
}

async function brandedTextureOverlay() {
  const texturePath = path.join(
    process.cwd(),
    "public",
    "images",
    "page-background.jpg"
  );

  if (!fs.existsSync(texturePath)) return null;

  return sharp(texturePath)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .modulate({ brightness: 1.15, saturation: 0.92 })
    .gamma(1.08)
    .png()
    .toBuffer();
}

async function brandWashOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${WIDTH}" height="${HEIGHT}" fill="#081318" fill-opacity="0.10"/>
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
            <stop offset="0%" stop-color="black" stop-opacity="0.38"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.18"/>
            <stop offset="45%" stop-color="black" stop-opacity="0.04"/>
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
          <linearGradient id="bg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="black" stop-opacity="0.22"/>
            <stop offset="20%" stop-color="black" stop-opacity="0.08"/>
            <stop offset="40%" stop-color="black" stop-opacity="0.02"/>
            <stop offset="100%" stop-color="black" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function vignetteOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v" cx="50%" cy="50%" r="72%">
            <stop offset="68%" stop-color="black" stop-opacity="0"/>
            <stop offset="100%" stop-color="black" stop-opacity="0.05"/>
          </radialGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#v)"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function frameOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="18"
          y="18"
          width="${WIDTH - 36}"
          height="${HEIGHT - 36}"
          rx="34"
          ry="34"
          fill="none"
          stroke="${BRAND.border}"
          stroke-opacity="0.9"
          stroke-width="2.5"
        />
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function imageFrameOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="${IMAGE_LEFT}"
          y="${IMAGE_TOP}"
          width="${IMAGE_WIDTH}"
          height="${IMAGE_HEIGHT}"
          rx="34"
          ry="34"
          fill="none"
          stroke="${BRAND.border}"
          stroke-opacity="0.95"
          stroke-width="3"
        />
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function textOverlay(
  title: string,
  subtitle: string,
  badge: string,
  hook: string,
  font: opentype.Font
) {
  const lines = wrapTitle(title).slice(0, 4);
  const hookLines = wrapCopy(hook, 28, 2);
  const subtitleLines = wrapCopy(subtitle, 34, 3);

  let titleFontSize = 52;
  let lineHeight = 44;

  if (title.length > 24) {
    titleFontSize = 48;
    lineHeight = 40;
  }
  if (title.length > 34) {
    titleFontSize = 44;
    lineHeight = 36;
  }
  if (title.length > 46) {
    titleFontSize = 40;
    lineHeight = 34;
  }

  const badgeWidth = badge === "GUIDE" ? 160 : 175;

  const badgeRect = `
    <rect
      x="${BADGE_LEFT}"
      y="${BADGE_TOP}"
      rx="22"
      ry="22"
      width="${badgeWidth}"
      height="52"
      fill="${BRAND.red}"
    />
  `;

  const badgePath = makeShadowedTextPathSvg(
    badge,
    font,
    27,
    "#ffffff",
    BADGE_LEFT + badgeWidth / 2,
    BADGE_TOP + 34,
    0.75,
    0.16,
    2,
    "center"
  );

  const titlePaths = lines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        titleFontSize,
        BRAND.gold,
        TITLE_LEFT,
        TITLE_TOP + i * lineHeight,
        0.3,
        0.14,
        2,
        "left"
      )
    )
    .join("");

  const hookPaths = hookLines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        22,
        BRAND.gold,
        BOTTOM_LEFT,
        HOOK_TOP + i * 24,
        0.06,
        0.1,
        2,
        "left"
      )
    )
    .join("");

  const subtitlePaths = subtitleLines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        17,
        "rgba(255,255,255,0.96)",
        BOTTOM_LEFT,
        SUBTITLE_TOP + i * 20,
        0.02,
        0.08,
        2,
        "left"
      )
    )
    .join("");

  const sitePath = makeShadowedTextPathSvg(
    "vegan-masala.com",
    font,
    17,
    "#ffffff",
    BOTTOM_LEFT,
    SITE_TOP,
    0.02,
    0.08,
    2,
    "left"
  );

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="transparent"/>
      ${badgeRect}
      ${badgePath}
      ${titlePaths}
      ${hookPaths}
      ${subtitlePaths}
      ${sitePath}
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function logoOverlay(logo: Buffer | null) {
  if (!logo) return null;

  return sharp(logo)
    .trim({ threshold: 10 })
    .resize(LOGO_SIZE, LOGO_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function createPost(slug: string, title: string, type: ContentType) {
  ensureDir(OUTPUT);

  if (PUBLIC_OUTPUT) {
    ensureDir(PUBLIC_OUTPUT);
  }

  const editorial = getEditorialContent(slug, type);

  const sourceImage = await resolveSourceImage(slug, type);
  const fontPath = await resolveFontPath();
  const font = loadFontOrThrow(fontPath);
  const logo = await resolveLogo();

  const bg = await backgroundBuffer(WIDTH, HEIGHT, null, BRAND.bg);
  const texture = await brandedTextureOverlay();
  const wash = await brandWashOverlay();

  let contentImage: Buffer | null = null;
  let contentImageShadow: Buffer | null = null;

  if (sourceImage) {
    const roundedMask = Buffer.from(`
      <svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" rx="30" ry="30" fill="white"/>
      </svg>
    `);

    contentImage = await sharp(sourceImage)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "cover" })
      .composite([{ input: roundedMask, blend: "dest-in" }])
      .png()
      .toBuffer();

    contentImageShadow = await sharp(
      Buffer.from(`
        <svg width="${IMAGE_WIDTH + 28}" height="${IMAGE_HEIGHT + 28}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="black" flood-opacity="0.18"/>
            </filter>
          </defs>
          <rect
            x="14"
            y="14"
            width="${IMAGE_WIDTH}"
            height="${IMAGE_HEIGHT}"
            rx="30"
            ry="30"
            fill="black"
            opacity="0.14"
            filter="url(#shadow)"
          />
        </svg>
      `)
    )
      .png()
      .toBuffer();
  }

  const gradTop = await topGradient();
  const gradBottom = await bottomGradient();
  const vignette = await vignetteOverlay();
  const frame = await frameOverlay();
  const imageFrame = await imageFrameOverlay();
  const text = await textOverlay(
    editorial.title || title,
    buildNaturalSubtitle(editorial, type, slug),
    buildBadge(type),
    buildNaturalHook(editorial, type, slug),
    font
  );
  const logoPng = await logoOverlay(logo);

  const comps: sharp.OverlayOptions[] = [{ input: bg, left: 0, top: 0 }];

  if (texture) {
    comps.push({ input: texture, left: 0, top: 0, blend: "overlay" });
  }

  if (wash) {
    comps.push({ input: wash, left: 0, top: 0 });
  }

  if (contentImageShadow) {
    comps.push({
      input: contentImageShadow,
      left: IMAGE_LEFT - 14,
      top: IMAGE_TOP - 14,
    });
  }

  if (contentImage) {
    comps.push({
      input: contentImage,
      left: IMAGE_LEFT,
      top: IMAGE_TOP,
    });
  }

  comps.push(
    { input: gradTop, left: 0, top: 0 },
    { input: gradBottom, left: 0, top: 0 },
    { input: vignette, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: imageFrame, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 }
  );

  if (logoPng) {
    comps.push({
      input: logoPng,
      top: LOGO_TOP,
      left: LOGO_LEFT,
    });
  }

  const finalPngBuffer = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: BRAND.bg,
    },
  })
    .composite(comps)
    .png()
    .toBuffer();

  const out = path.join(OUTPUT, `${slug}.png`);
  fs.writeFileSync(out, finalPngBuffer);

  if (PUBLIC_OUTPUT) {
    const publicOut = path.join(PUBLIC_OUTPUT, `${slug}.png`);
    fs.writeFileSync(publicOut, finalPngBuffer);
  }

  const saved = await saveGeneratedInstagramImage(slug, finalPngBuffer);

  const caption = buildInstagramCaption(slug, type);
  saveCaption("instagram", slug, caption);
  updateManifest(slug, "instagram");

  return {
    slug,
    localPath: out,
    image: saved.url,
    storage: saved.storage,
    path: saved.path,
    caption,
  };
}

export async function generateInstagramBySlug(slug: string) {
  const type = detectContentTypeBySlug(slug);

  if (!type) {
    throw new Error("Slug not found");
  }

  const editorial = getEditorialContent(slug, type);
  const result = await createPost(
    slug,
    editorial.title || titleFromSlug(slug),
    type
  );

  return {
    success: true,
    count: 1,
    slug,
    image: result.image,
    storage: result.storage,
    path: result.path,
    message: `Instagram generated for ${slug}`,
  };
}

export async function generateLatestInstagram() {
  const chosen = latestContent();

  if (!chosen) {
    return {
      success: false,
      count: 0,
      message: "No content",
    };
  }

  const slug = slugFromFile(chosen.file);
  const editorial = getEditorialContent(slug, chosen.type);
  const result = await createPost(
    slug,
    editorial.title || titleFromSlug(slug),
    chosen.type
  );

  return {
    success: true,
    count: 1,
    slug,
    image: result.image,
    storage: result.storage,
    path: result.path,
    message: "Instagram generated",
  };
}

export async function generateAllInstagram() {
  const items = allContent().filter((item) => item.type === "recipe");

  const results = [];
  for (const item of items) {
    const slug = slugFromFile(item.file);
    const result = await renderInstagramBySlug(slug);
    results.push(result);
  }

  return {
    success: true,
    count: results.length,
    results,
    generated: results,
    message: "Instagram generated",
  };
}