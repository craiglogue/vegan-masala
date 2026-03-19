import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

export const BRAND = {
  bg: "#000000",
  gold: "#D4AF37",
  soft: "#D8B45A",
  red: "#8B2C2C",
  border: "#9C7A1D",
} as const;

export function getBrandFont(): Buffer {
  const fontFile = path.join(ROOT, "public", "fonts", "Rajdhani-Bold.ttf");

  if (!fs.existsSync(fontFile)) {
    throw new Error("Rajdhani font missing at public/fonts/Rajdhani-Bold.ttf");
  }

  return fs.readFileSync(fontFile);
}

export function findBrandLogo(): string | null {
  const candidates = [
    path.join(ROOT, "public", "brand", "logo-flat.png"),
    path.join(ROOT, "public", "brand", "vegan-masala-logo.png"),
    path.join(ROOT, "public", "brand", "logo.png"),
    path.join(ROOT, "public", "images", "vegan-masala-logo.png"),
    path.join(ROOT, "public", "images", "logo.png"),
    path.join(ROOT, "public", "logo.png"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}