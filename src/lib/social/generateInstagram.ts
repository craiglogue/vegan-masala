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

import {
  buildInstagramCaption,
  saveCaption,
} from "./core/captions";

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
  centerX: number,
  baselineY: number,
  letterSpacing = 0
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

  const width = maxX - minX;
  const translateX = centerX - (minX + width / 2);

  return `
    <g transform="translate(${translateX},0)">
      <path d="${parts.join(" ")}" fill="${fill}" />
    </g>
  `;
}

function wrapTitle(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= 16) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= 1) break;
    }
  }

  if (current && lines.length < 2) {
    lines.push(current);
  }

  return lines;
}

function buildBadge(type: ContentType) {
  return type === "recipe" ? "RECIPE" : "GUIDE";
}

function buildSubtitle(type: ContentType) {
  return type === "recipe"
    ? "Vegan Indian Recipe"
    : "Indian Cooking Guide";
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

  return sharp(source)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .png()
    .toBuffer();
}

async function topGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0.94"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.76"/>
            <stop offset="40%" stop-color="black" stop-opacity="0.38"/>
            <stop offset="68%" stop-color="black" stop-opacity="0.10"/>
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

async function vignetteOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v" cx="50%" cy="50%" r="75%">
            <stop offset="58%" stop-color="black" stop-opacity="0"/>
            <stop offset="100%" stop-color="black" stop-opacity="0.24"/>
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
          x="14"
          y="14"
          width="${WIDTH - 28}"
          height="${HEIGHT - 28}"
          rx="34"
          ry="34"
          fill="none"
          stroke="${BRAND.border}"
          stroke-opacity="0.9"
          stroke-width="2"
        />
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function badgeOverlay(
  badge: string,
  font: opentype.Font
) {
  const badgeText = makeTextPathSvg(
    badge,
    font,
    28,
    "#ffffff",
    155,
    107,
    0.6
  );

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="transparent"/>
      <rect
        x="70"
        y="70"
        rx="28"
        ry="28"
        width="170"
        height="56"
        fill="${BRAND.red}"
      />
      ${badgeText}
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function textOverlay(
  title: string,
  subtitle: string,
  font: opentype.Font
) {
  const lines = wrapTitle(title);

  const titlePaths = lines
    .map((line, i) =>
      makeTextPathSvg(line, font, 90, BRAND.gold, 540, 470 + i * 95, 1)
    )
    .join("");

  const subtitlePath = makeTextPathSvg(
    subtitle,
    font,
    42,
    BRAND.soft,
    540,
    470 + lines.length * 95 + 40,
    0.8
  );

  const sitePath = makeTextPathSvg(
    "vegan-masala.com",
    font,
    34,
    "#ffffff",
    540,
    970,
    0.8
  );

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="transparent"/>
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
    .resize(250, 250, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function createPost(
  slug: string,
  title: string,
  type: ContentType
) {
  ensureDir(OUTPUT);

  if (PUBLIC_OUTPUT) {
    ensureDir(PUBLIC_OUTPUT);
  }

  const sourceImage = await resolveSourceImage(slug, type);
  const fontPath = await resolveFontPath();
  const font = loadFontOrThrow(fontPath);
  const logo = await resolveLogo();

  const bg = await backgroundBufferFromSource(sourceImage);
  const grad = await topGradient();
  const vignette = await vignetteOverlay();
  const frame = await frameOverlay();
  const badge = await badgeOverlay(buildBadge(type), font);
  const text = await textOverlay(title, buildSubtitle(type), font);
  const logoPng = await logoOverlay(logo);

  const comps: sharp.OverlayOptions[] = [
    { input: bg, left: 0, top: 0 },
    { input: grad, left: 0, top: 0 },
    { input: vignette, left: 0, top: 0 },
    { input: badge, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 },
  ];

  if (logoPng) {
    comps.push({
      input: logoPng,
      top: HEIGHT - 290,
      left: WIDTH - 290,
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