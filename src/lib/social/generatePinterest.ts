import path from "node:path";
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

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "pinterest");

const WIDTH = 1000;
const HEIGHT = 1500;
const FONT = getBrandFont();

async function topGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0.95"/>
            <stop offset="30%" stop-color="black" stop-opacity="0.65"/>
            <stop offset="60%" stop-color="black" stop-opacity="0.25"/>
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

function titleLines(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length < 20) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  return lines.slice(0, 3);
}

function buildSubtitle(type: ContentType) {
  return type === "recipe" ? "Vegan Indian Recipe" : "Beginner Guide";
}

function buildBadge(type: ContentType) {
  return type === "recipe" ? "RECIPE" : "GUIDE";
}

async function textOverlay(
  title: string,
  subtitle: string,
  badge: string
) {
  const titleLinesOut = titleLines(title);

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
              top: 70,
              left: 60,
              width: 760,
              display: "flex",
              flexDirection: "column",
              color: BRAND.gold,
              fontSize: 90,
              fontWeight: 700,
              lineHeight: 0.94,
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
              top: 320,
              left: 60,
              color: BRAND.soft,
              fontSize: 48,
              fontWeight: 600,
              display: "flex",
            },
            children: subtitle,
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 400,
              left: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: BRAND.red,
              color: "#fff",
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 18,
              paddingRight: 18,
              borderRadius: 20,
              fontSize: 30,
              fontWeight: 700,
            },
            children: badge,
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 60,
              left: 60,
              color: BRAND.soft,
              fontSize: 30,
              fontWeight: 600,
              display: "flex",
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

  const img = findContentImage(slug, type);
  const bg = await backgroundBuffer(WIDTH, HEIGHT, img, BRAND.bg);
  const grad = await topGradient();
  const frame = await frameOverlay();
  const text = await textOverlay(title, buildSubtitle(type), buildBadge(type));
  const logo = await logoBuffer(260);

  const out = path.join(OUTPUT, `${slug}.png`);

  const comp: sharp.OverlayOptions[] = [
    { input: bg, left: 0, top: 0 },
    { input: grad, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 },
  ];

  if (logo) {
    comp.push({
      input: logo,
      top: HEIGHT - 260 - 60,
      left: WIDTH - 260 - 60,
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
    .composite(comp)
    .png()
    .toFile(out);

  const caption = buildPinterestCaption(slug, type);
  saveCaption("pinterest", slug, caption);
  updateManifest(slug, "pinterest");

  return out;
}

export async function generateLatestPinterest() {
  const chosen = latestContent();

  if (!chosen) {
    return { success: false, count: 0, message: "No content found" };
  }

  const slug = slugFromFile(chosen.file);
  await createPost(slug, titleFromSlug(slug), chosen.type);

  return {
    success: true,
    count: 1,
    message: "Pinterest asset generated",
  };
}

export async function generatePinterestBySlug(slug: string) {
  const type = detectContentTypeBySlug(slug);

  if (!type) {
    throw new Error("Slug not found");
  }

  await createPost(slug, titleFromSlug(slug), type);

  return {
    success: true,
    count: 1,
    message: `Pinterest asset generated for ${slug}`,
  };
}

export async function generateAllPinterest() {
  const items = allContent();

  let count = 0;

  for (const item of items) {
    const slug = slugFromFile(item.file);
    await createPost(slug, titleFromSlug(slug), item.type);
    count++;
  }

  return {
    success: true,
    count,
    message: "Pinterest assets generated",
  };
}