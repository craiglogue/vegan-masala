import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { findBrandLogo } from "./brand";
import type { ContentType } from "./content";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();

export function findContentImage(
  slug: string,
  type: ContentType
): string | null {
  const folder = type === "recipe" ? "recipes" : "guides";
  const base = path.join(ROOT, "public", "images", folder);
  const exts = ["png", "jpg", "jpeg", "webp"];

  for (const ext of exts) {
    const p = path.join(base, `${slug}.${ext}`);
    if (fs.existsSync(p)) return p;
  }

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

  return sharp(img).resize(width, height, { fit: "cover" }).png().toBuffer();
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