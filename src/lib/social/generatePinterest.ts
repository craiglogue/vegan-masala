import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import satori from "satori";

import { BRAND, getBrandFont } from "./core/brand";
import {
  allContent,
  detectContentTypeBySlug,
  ensureDir,
  latestContent,
  slugFromFile,
  titleFromSlug,
  type ContentType,
} from "./core/content";
import { backgroundBuffer, findContentImage, logoBuffer } from "./core/images";
import { buildPinterestCaption, saveCaption } from "./core/captions";
import { updateManifest } from "./core/manifest";
import { saveGeneratedPinterestImage } from "./core/generatedAssets";

import { getRecipeBySlug } from "@/lib/recipes";
import { getGuideBySlug } from "@/lib/guides";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "pinterest");

const WIDTH = 1000;
const HEIGHT = 1500;
const FONT = getBrandFont();

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

function titleLines(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let maxLen = 17;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxLen) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;

      if (lines.length === 1) maxLen = 20;
      if (lines.length === 2) maxLen = 24;
    }
  }

  if (current) lines.push(current);

  if (lines.length <= 3) return lines;

  return [lines[0], lines[1], lines.slice(2).join(" ")];
}

function pickFromSeed(slug: string, options: string[]) {
  const sum = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[sum % options.length];
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

function shortenLine(text: string, max = 58) {
  const clean = cleanPromoText(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
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
  if (content.socialHook) return shortenLine(content.socialHook, 34);
  if (content.introNote) return shortenLine(content.introNote, 34);

  if (type === "guide") {
    return pickFromSeed(slug, [
      "Cook With More Confidence",
      "Simple, Practical Kitchen Help",
      "A Better Way To Learn",
      "Useful Guidance For Home Cooks",
      "Start With The Essentials",
    ]);
  }

  return pickFromSeed(slug, [
    "Cooked Properly, Served Hot",
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
  if (content.description) return shortenLine(content.description, 52);
  if (content.servingSuggestion) return shortenLine(content.servingSuggestion, 52);

  if (type === "guide") {
    return pickFromSeed(slug, [
      "Practical guidance for better everyday cooking",
      "Clear help for building confidence in the kitchen",
      "A simple guide for stronger flavour and technique",
    ]);
  }

  return pickFromSeed(slug, [
    "Vegan Indian cooking with depth, warmth and real flavour",
    "Built on proper masala, steady seasoning and patience",
    "The kind of cooking that earns a place at the table",
  ]);
}

function buildBadge(type: ContentType) {
  return type === "recipe" ? "RECIPE" : "GUIDE";
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
    .modulate({ brightness: 0.88, saturation: 0.6 })
    .png()
    .toBuffer();
}

async function brandWashOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${WIDTH}" height="${HEIGHT}" fill="#081318" fill-opacity="0.6"/>
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
            <stop offset="0%" stop-color="black" stop-opacity="0.95"/>
            <stop offset="28%" stop-color="black" stop-opacity="0.64"/>
            <stop offset="58%" stop-color="black" stop-opacity="0.24"/>
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
            <stop offset="0%" stop-color="black" stop-opacity="0.72"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.42"/>
            <stop offset="34%" stop-color="black" stop-opacity="0.16"/>
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

async function frameOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="14"
          y="14"
          width="${WIDTH - 28}"
          height="${HEIGHT - 28}"
          rx="40"
          ry="40"
          fill="none"
          stroke="${BRAND.border}"
          stroke-width="2"
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
          x="84"
          y="274"
          width="832"
          height="704"
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
  hook: string
) {
  const titleLinesOut = titleLines(title);
  let titleFontSize = 84;

  if (title.length > 28) titleFontSize = 76;
  if (title.length > 40) titleFontSize = 68;
  if (title.length > 56) titleFontSize = 60;

  const element = {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "Rajdhani",
        backgroundColor: "transparent",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 64,
              left: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: BRAND.red,
              color: "#fff",
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 22,
              paddingRight: 22,
              borderRadius: 20,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 1,
            },
            children: badge,
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 122,
              left: 60,
              width: 880,
              display: "flex",
              flexDirection: "column",
              color: BRAND.gold,
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 0.94,
              textShadow: "0 3px 12px rgba(0,0,0,0.55)",
            },
            children: titleLinesOut.map((line) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  marginBottom: 6,
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
              bottom: 164,
              left: 60,
              width: 420,
              color: BRAND.gold,
              fontSize: 44,
              fontWeight: 700,
              display: "flex",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            },
            children: hook,
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 108,
              left: 60,
              width: 420,
              color: BRAND.soft,
              fontSize: 28,
              fontWeight: 500,
              display: "flex",
              textShadow: "0 2px 10px rgba(0,0,0,0.45)",
            },
            children: subtitle,
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 60,
              left: 60,
              color: "#ffffff",
              fontSize: 26,
              fontWeight: 600,
              display: "flex",
              textShadow: "0 2px 10px rgba(0,0,0,0.45)",
            },
            children: "vegan-masala.com",
          },
        },
      ],
    },
  };

  const svg = await satori(element as any, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: "Rajdhani",
        data: FONT,
        weight: 700,
        style: "normal",
      },
    ],
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function createPost(slug: string, title: string, type: ContentType) {
  ensureDir(OUTPUT);

  const editorial = getEditorialContent(slug, type);

  const img = await resolveSourceImage(slug, type);
  const bg = await backgroundBuffer(WIDTH, HEIGHT, null, BRAND.bg);
  const texture = await brandedTextureOverlay();
  const wash = await brandWashOverlay();

  let contentImage: Buffer | null = null;
  let contentImageShadow: Buffer | null = null;

  if (img) {
    const roundedMask = Buffer.from(`
      <svg width="832" height="704" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="832" height="704" rx="30" ry="30" fill="white"/>
      </svg>
    `);

    contentImage = await sharp(img)
      .resize(832, 704, {
        fit: "cover",
      })
      .composite([
        {
          input: roundedMask,
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();

    contentImageShadow = await sharp(
      Buffer.from(`
        <svg width="860" height="732" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="black" flood-opacity="0.35"/>
            </filter>
          </defs>
          <rect
            x="14"
            y="14"
            width="832"
            height="704"
            rx="30"
            ry="30"
            fill="black"
            opacity="0.22"
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
  const frame = await frameOverlay();
  const imageFrame = await imageFrameOverlay();
  const text = await textOverlay(
    editorial.title || title,
    buildNaturalSubtitle(editorial, type, slug),
    buildBadge(type),
    buildNaturalHook(editorial, type, slug)
  );
  const logo = await logoBuffer(220);

  const comp: sharp.OverlayOptions[] = [{ input: bg, left: 0, top: 0 }];

  if (texture) {
    comp.push({ input: texture, left: 0, top: 0, blend: "overlay" });
  }

  if (wash) {
    comp.push({ input: wash, left: 0, top: 0 });
  }

  if (contentImageShadow) {
    comp.push({
      input: contentImageShadow,
      left: 70,
      top: 260,
    });
  }

  if (contentImage) {
    comp.push({
      input: contentImage,
      left: 84,
      top: 274,
    });
  }

  comp.push(
    { input: gradTop, left: 0, top: 0 },
    { input: gradBottom, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: imageFrame, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 }
  );

  if (logo) {
    comp.push({
      input: logo,
      top: HEIGHT - 220 - 56,
      left: WIDTH - 220 - 56,
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
    .composite(comp)
    .png()
    .toBuffer();

  const out = path.join(OUTPUT, `${slug}.png`);
  await sharp(finalPngBuffer).toFile(out);

  const saved = await saveGeneratedPinterestImage(slug, finalPngBuffer);

  const caption = buildPinterestCaption(slug, type);
  saveCaption("pinterest", slug, caption);
  updateManifest(slug, "pinterest");

  return {
    slug,
    localPath: out,
    image: saved.url,
    storage: saved.storage,
    path: saved.path,
    caption,
  };
}

export async function generateLatestPinterest() {
  const chosen = latestContent();

  if (!chosen) {
    return {
      success: false,
      count: 0,
      message: "No content found",
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
    message: "Pinterest asset generated",
  };
}

export async function generatePinterestBySlug(slug: string) {
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
    message: `Pinterest asset generated for ${slug}`,
  };
}

export async function generateAllPinterest() {
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
    const editorial = getEditorialContent(slug, item.type);
    const result = await createPost(
      slug,
      editorial.title || titleFromSlug(slug),
      item.type
    );

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
    message: "Pinterest assets generated",
  };
}