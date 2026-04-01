import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { findBrandLogo } from "./brand";
import type { ContentType } from "./content";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");

function imageExts() {
  return [".png", ".jpg", ".jpeg", ".webp"];
}

function exactCandidates(slug: string, type: ContentType) {
  const folder = type === "recipe" ? "recipes" : "guides";

  return imageExts().flatMap((ext) => [
    path.join(PUBLIC_DIR, "images", folder, `${slug}${ext}`),
    path.join(PUBLIC_DIR, "images", `${slug}${ext}`),
    path.join(PUBLIC_DIR, `${slug}${ext}`),
    path.join(PUBLIC_DIR, "generated", "instagram", `${slug}${ext}`),
    path.join(PUBLIC_DIR, "generated", "pinterest", `${slug}${ext}`),
  ]);
}

function findBrandBackground(): string | null {
  const candidates = [
    path.join(PUBLIC_DIR, "brand", "social-bg.png"),
    path.join(PUBLIC_DIR, "brand", "social-bg.jpg"),
    path.join(PUBLIC_DIR, "brand", "social-background.png"),
    path.join(PUBLIC_DIR, "brand", "social-background.jpg"),
    path.join(PUBLIC_DIR, "images", "header", "mandala-bg.jpg"),
    path.join(PUBLIC_DIR, "images", "header", "mandala-bg.png"),
    path.join(PUBLIC_DIR, "images", "social", "background.jpg"),
    path.join(PUBLIC_DIR, "images", "social", "background.png"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

export function findContentImage(
  slug: string,
  type: ContentType
): string | null {
  for (const candidate of exactCandidates(slug, type)) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const instagramGenerated = path.join(
    ROOT,
    "public",
    "generated",
    "instagram",
    `${slug}.png`
  );
  if (fs.existsSync(instagramGenerated)) return instagramGenerated;

  const pinterestGenerated = path.join(
    ROOT,
    "public",
    "generated",
    "pinterest",
    `${slug}.png`
  );
  if (fs.existsSync(pinterestGenerated)) return pinterestGenerated;

  return null;
}

export async function backgroundBuffer(
  width: number,
  height: number,
  img: string | null,
  bg = "#000000"
) {
  const source = img || findBrandBackground();

  if (!source) {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: bg,
      },
    })
      .png()
      .toBuffer();
  }

  return sharp(source)
    .resize(width, height, { fit: "cover" })
    .png()
    .toBuffer();
}

export async function logoBuffer(size: number) {
  const logo = findBrandLogo();
  if (!logo) return null;

  return sharp(logo)
    .trim({ threshold: 10 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}