import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

import { BRAND } from "./core/brand";
import {
  allContent,
  detectContentTypeBySlug,
  ensureDir,
  latestContent,
  slugFromFile,
  titleFromSlug,
  type ContentType,
} from "./core/content";

import {
  backgroundBuffer,
  findContentImage,
  logoBuffer,
} from "./core/images";

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

function esc(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function textOverlay(
  title: string,
  subtitle: string,
  badge: string
) {
  const lines = wrapTitle(title);

  const lineSvgs = lines
    .map(
      (line, i) => `
        <text
          x="540"
          y="${470 + i * 95}"
          text-anchor="middle"
          font-size="90"
          font-weight="700"
          fill="${BRAND.gold}"
          font-family="Arial"
        >
          ${esc(line)}
        </text>
      `
    )
    .join("");

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

      <text
        x="155"
        y="107"
        text-anchor="middle"
        font-size="28"
        font-weight="700"
        fill="#ffffff"
        font-family="Arial"
      >
        ${esc(badge)}
      </text>

      ${lineSvgs}

      <text
        x="540"
        y="${470 + lines.length * 95 + 40}"
        text-anchor="middle"
        font-size="42"
        font-weight="600"
        fill="${BRAND.soft}"
        font-family="Arial"
      >
        ${esc(subtitle)}
      </text>

      <text
        x="540"
        y="970"
        text-anchor="middle"
        font-size="34"
        fill="#ffffff"
        font-family="Arial"
      >
        vegan-masala.com
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
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

  const img = findContentImage(slug, type);

  const bg = await backgroundBuffer(WIDTH, HEIGHT, img, BRAND.bg);
  const grad = await topGradient();
  const vignette = await vignetteOverlay();
  const frame = await frameOverlay();

  const text = await textOverlay(
    title,
    buildSubtitle(type),
    buildBadge(type)
  );

  const logo = await logoBuffer(250);

  const comps: sharp.OverlayOptions[] = [
    { input: bg, left: 0, top: 0 },
    { input: grad, left: 0, top: 0 },
    { input: vignette, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 },
  ];

  if (logo) {
    comps.push({
      input: logo,
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