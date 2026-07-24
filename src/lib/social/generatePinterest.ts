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
import { renderPinterestBySlug } from "./pinterest/render";

import { getRecipeBySlug } from "@/lib/recipes";
import { getGuideBySlug } from "@/lib/guides";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "pinterest");

const WIDTH = 1000;
const HEIGHT = 1500;
const FONT = getBrandFont();

const IMAGE_LEFT = 116;
const IMAGE_TOP = 288;
const IMAGE_WIDTH = 768;
const IMAGE_HEIGHT = 620;

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
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let maxLen = 16;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxLen) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;

      if (lines.length === 1) maxLen = 18;
      if (lines.length === 2) maxLen = 22;
      if (lines.length === 3) maxLen = 24;
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
    return words.slice(0, 12).join(" ");
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
    .modulate({ brightness: 1.18, saturation: 0.96 })
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
            <stop offset="0%" stop-color="black" stop-opacity="0.42"/>
            <stop offset="20%" stop-color="black" stop-opacity="0.20"/>
            <stop offset="45%" stop-color="black" stop-opacity="0.05"/>
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
            <stop offset="0%" stop-color="black" stop-opacity="0.20"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.07"/>
            <stop offset="34%" stop-color="black" stop-opacity="0.02"/>
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
  hook: string
) {
  const titleLinesOut = titleLines(title).slice(0, 4);
  const hookLines = wrapCopy(hook, 30, 2);
  const subtitleLines = wrapCopy(subtitle, 36, 3);

  let titleFontSize = 68;
  if (title.length > 24) titleFontSize = 62;
  if (title.length > 34) titleFontSize = 56;
  if (title.length > 46) titleFontSize = 50;

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
              top: 66,
              left: 66,
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
              top: 134,
              left: 60,
              width: 430,
              display: "flex",
              flexDirection: "column",
              color: BRAND.gold,
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 0.92,
              textShadow: "0 2px 8px rgba(0,0,0,0.18)",
            },
            children: titleLinesOut.map((line) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  marginBottom: 4,
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
              bottom: 232,
              left: 60,
              width: 420,
              color: BRAND.gold,
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.02,
              display: "flex",
              flexDirection: "column",
              textShadow: "0 2px 8px rgba(0,0,0,0.16)",
            },
            children: hookLines.map((line) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  marginBottom: 4,
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
              bottom: 132,
              left: 60,
              width: 470,
              color: "rgba(255,255,255,0.97)",
              fontSize: 19,
              fontWeight: 600,
              lineHeight: 1.05,
              display: "flex",
              flexDirection: "column",
              textShadow: "0 2px 8px rgba(0,0,0,0.16)",
            },
            children: subtitleLines.map((line) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  marginBottom: 3,
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
              bottom: 66,
              left: 60,
              color: "#ffffff",
              fontSize: 19,
              fontWeight: 600,
              display: "flex",
              textShadow: "0 2px 8px rgba(0,0,0,0.16)",
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
      <svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" rx="30" ry="30" fill="white"/>
      </svg>
    `);

    contentImage = await sharp(img)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
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
  const frame = await frameOverlay();
  const imageFrame = await imageFrameOverlay();
  const text = await textOverlay(
    editorial.title || title,
    buildNaturalSubtitle(editorial, type, slug),
    buildBadge(type),
    buildNaturalHook(editorial, type, slug)
  );
  const logo = await logoBuffer(170);

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
      left: IMAGE_LEFT - 14,
      top: IMAGE_TOP - 14,
    });
  }

  if (contentImage) {
    comp.push({
      input: contentImage,
      left: IMAGE_LEFT,
      top: IMAGE_TOP,
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
      top: HEIGHT - 170 - 58,
      left: WIDTH - 170 - 60,
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
  const items = allContent().filter((item) => item.type === "recipe");

  const results = [];
  for (const item of items) {
    const slug = slugFromFile(item.file);
    const result = await renderPinterestBySlug(slug);
    results.push(result);
  }

  return {
    success: true,
    count: results.length,
    results,
    generated: results,
    message: "Pinterest generated",
  };
}