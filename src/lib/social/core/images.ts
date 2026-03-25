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

function walk(dir: string, results: string[] = []) {
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, results);
    } else {
      results.push(full);
    }
  }

  return results;
}

function exactCandidates(slug: string, type: ContentType) {
  const folder = type === "recipe" ? "recipes" : "guides";

  return imageExts().flatMap((ext) => [
    path.join(PUBLIC_DIR, "images", folder, `${slug}${ext}`),
    path.join(PUBLIC_DIR, "images", `${slug}${ext}`),
    path.join(PUBLIC_DIR, `${slug}${ext}`),
    path.join(PUBLIC_DIR, "generated", "instagram", `${slug}${ext}`),
  ]);
}

export function findContentImage(
  slug: string,
  type: ContentType
): string | null {
  for (const candidate of exactCandidates(slug, type)) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const generated = path.join(ROOT, "public", "generated", "instagram", `${slug}.png`);
  if (fs.existsSync(generated)) return generated;

  return null;
}

export async function backgroundBuffer(
  width: number,
  height: number,
  img: string | null,
  bg = "#000000"
) {
  if (!img) {
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

  return sharp(img)
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