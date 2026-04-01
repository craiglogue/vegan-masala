import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");

function imageExts() {
  return [".png", ".jpg", ".jpeg", ".webp"];
}

export function findBrandLogo(): string | null {
  const candidates = [
    path.join(PUBLIC_DIR, "brand", "logo-flat.png"),
    path.join(PUBLIC_DIR, "brand", "logo.png"),
    path.join(PUBLIC_DIR, "images", "logo.png"),
    path.join(PUBLIC_DIR, "logo.png"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

export function findBrandBackground(): string | null {
  const candidates = [
    path.join(PUBLIC_DIR, "images", "page-background.jpg"),
    path.join(PUBLIC_DIR, "images", "page-background.png"),
    path.join(PUBLIC_DIR, "images", "header", "mandala-bg.jpg"),
    path.join(PUBLIC_DIR, "images", "header", "mandala-bg.png"),
    path.join(PUBLIC_DIR, "brand", "social-bg.jpg"),
    path.join(PUBLIC_DIR, "brand", "social-bg.png"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

export function findFontPath(): string | null {
  const candidates = [
    path.join(PUBLIC_DIR, "fonts", "Rajdhani-Bold.ttf"),
    path.join(PUBLIC_DIR, "fonts", "Rajdhani-Regular.ttf"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

export function findContentImage(slug: string, type: "recipe" | "guide"): string | null {
  const folder = type === "recipe" ? "recipes" : "guides";

  const candidates = imageExts().flatMap((ext) => [
    path.join(PUBLIC_DIR, "images", folder, `${slug}${ext}`),
    path.join(PUBLIC_DIR, "images", `${slug}${ext}`),
    path.join(PUBLIC_DIR, "generated", "instagram", `${slug}${ext}`),
    path.join(PUBLIC_DIR, "generated", "pinterest", `${slug}${ext}`),
  ]);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}