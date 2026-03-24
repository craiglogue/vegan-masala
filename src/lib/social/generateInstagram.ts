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

import { findContentImage } from "./core/images";

import { buildInstagramCaption, saveCaption } from "./core/captions";

import { updateManifest } from "./core/manifest";
import { saveGeneratedInstagramImage } from "./core/generatedAssets";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "instagram");

const PUBLIC_OUTPUT = process.env.VERCEL
  ? null
  : path.join(process.cwd(), "public", "generated", "instagram");

const WIDTH = 1080;
const HEIGHT = 1080;

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
  shadowOpacity = 0.28,
  shadowOffsetY = 3,
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
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [text];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= 13) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  if (lines.length <= 3) return lines;

  const first = lines[0];
  const second = lines[1];
  const rest = lines.slice(2).join(" ");
  return [first, second, rest];
}

function buildBadge(type: ContentType) {
  return type === "recipe" ? "RECIPE" : "GUIDE";
}

function buildSubtitle(type: ContentType) {
  return type === "recipe" ? "Vegan Indian Recipe" : "Indian Cooking Guide";
}

async function backgroundBufferFromSource(source: string | Buffer | null) {
  if (!source) {
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

  return sharp(source).resize(WIDTH, HEIGHT, { fit: "cover" }).png().toBuffer();
}

async function topGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0.88"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.66"/>
            <stop offset="42%" stop-color="black" stop-opacity="0.28"/>
            <stop offset="72%" stop-color="black" stop-opacity="0.10"/>
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
            <stop offset="0%" stop-color="black" stop-opacity="0.62"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.34"/>
            <stop offset="38%" stop-color="black" stop-opacity="0.10"/>
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
            <stop offset="58%" stop-color="black" stop-opacity="0"/>
            <stop offset="100%" stop-color="black" stop-opacity="0.18"/>
          </radialGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#v)"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function cornerSoftMask() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="0"
          y="0"
          width="${WIDTH}"
          height="${HEIGHT}"
          rx="34"
          ry="34"
          fill="none"
          stroke="rgba(0,0,0,0.18)"
          stroke-width="28"
        />
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

async function textOverlay(
  title: string,
  subtitle: string,
  badge: string,
  font: opentype.Font
) {
  const lines = wrapTitle(title).slice(0, 3);

  const TEXT_LEFT = 88;
  const TEXT_RIGHT_SAFE = 910;
  const TITLE_START = 305;
  const LINE_HEIGHT = 68;

  let titleFontSize = 72;

  if (title.length > 28) titleFontSize = 64;
  if (title.length > 38) titleFontSize = 58;
  if (title.length > 52) titleFontSize = 52;

  const badgeWidth = badge === "GUIDE" ? 160 : 175;

  const badgeRect = `
    <rect
      x="${TEXT_LEFT}"
      y="84"
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
    TEXT_LEFT + badgeWidth / 2,
    118,
    0.75,
    0.18,
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
        TEXT_LEFT,
        TITLE_START + i * LINE_HEIGHT,
        0.6,
        0.28,
        3,
        "left"
      )
    )
    .join("");

  const subtitlePath = makeShadowedTextPathSvg(
    subtitle,
    font,
    32,
    "rgba(255,255,255,0.92)",
    TEXT_LEFT,
    TITLE_START + lines.length * LINE_HEIGHT + 20,
    0.35,
    0.18,
    2,
    "left"
  );

  const sitePath = makeShadowedTextPathSvg(
    "VM-TEST",
    font,
    30,
    "#ffffff",
    WIDTH / 2,
    HEIGHT - 82,
    0.45,
    0.18,
    2,
    "center"
  );

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="transparent"/>
      ${badgeRect}
      ${badgePath}
      ${titlePaths}
      ${subtitlePath}
      ${sitePath}
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function logoOverlay(logo: Buffer | null) {
  if (!logo) return null;

  return sharp(logo)
    .trim({ threshold: 10 })
    .resize(145, 145, {
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

  const sourceImage = await resolveSourceImage(slug, type);
  const fontPath = await resolveFontPath();
  const font = loadFontOrThrow(fontPath);
  const logo = await resolveLogo();

  const bg = await backgroundBufferFromSource(sourceImage);
    const gradTop = await topGradient();
  const gradBottom = await bottomGradient();
  const vignette = await vignetteOverlay();
  const cornerMask = await cornerSoftMask();
  const frame = await frameOverlay();
  const text = await textOverlay(
    title,
    buildSubtitle(type),
    buildBadge(type),
    font
  );
  const logoPng = await logoOverlay(logo);

  const comps: sharp.OverlayOptions[] = [
    { input: bg, left: 0, top: 0 },
    { input: gradTop, left: 0, top: 0 },
    { input: gradBottom, left: 0, top: 0 },
    { input: vignette, left: 0, top: 0 },
    { input: cornerMask, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 },
  ];

    if (logoPng) {
    comps.push({
      input: logoPng,
      top: HEIGHT - 210,
      left: WIDTH - 210,
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

  const result = await createPost(slug, titleFromSlug(slug), type);

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
  const result = await createPost(slug, titleFromSlug(slug), chosen.type);

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
  const items = allContent();
  let count = 0;
  const generated: Array<{
    slug: string;
    image: string;
    storage: "blob" | "local";
    path: string;
  }> = [];

  for (const item of items) {
    const slug = slugFromFile(item.file);
    const result = await createPost(slug, titleFromSlug(slug), item.type);

    generated.push({
      slug,
      image: result.image,
      storage: result.storage,
      path: result.path,
    });

    count++;
  }

  return {
    success: true,
    count,
    generated,
    message: "All generated",
  };
}