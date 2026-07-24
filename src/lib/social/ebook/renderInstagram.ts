import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { EBOOK } from "./ebook";
import {
  buildFacebookEbookCaption,
  buildInstagramEbookCaption,
} from "./captions";
import { saveGeneratedInstagramImage } from "@/lib/social/core/generatedAssets";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "instagram");

const WIDTH = 1080;
const HEIGHT = 1080;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolvePublicFile(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

export async function renderInstagramEbookPromo() {
  ensureDir(OUTPUT);

  const coverPath = resolvePublicFile(EBOOK.coverImage);

  const cover = await sharp(coverPath)
    .resize(430, 620, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const panel = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#081318"/>
      <rect x="20" y="20" width="${WIDTH - 40}" height="${HEIGHT - 40}" rx="34" fill="none" stroke="#c8a646" stroke-width="2.5"/>

      <rect x="70" y="110" width="470" height="700" rx="30" fill="#0d171c" opacity="0.95"/>
      <rect x="570" y="110" width="440" height="700" rx="30" fill="#0d171c" opacity="0.65"/>

      <text x="610" y="210" fill="#c8a646" font-size="44" font-weight="700" font-family="Arial, sans-serif">
        Vegan Indian
      </text>
      <text x="610" y="268" fill="#c8a646" font-size="44" font-weight="700" font-family="Arial, sans-serif">
        Sweets Mini
      </text>
      <text x="610" y="326" fill="#c8a646" font-size="44" font-weight="700" font-family="Arial, sans-serif">
        Ebook
      </text>

      <text x="610" y="420" fill="#ffffff" font-size="28" font-family="Arial, sans-serif">
        6 sweet recipes
      </text>
      <text x="610" y="465" fill="#ffffff" font-size="28" font-family="Arial, sans-serif">
        Instant PDF download
      </text>
      <text x="610" y="510" fill="#ffffff" font-size="28" font-family="Arial, sans-serif">
        Beginner-friendly
      </text>
      <text x="610" y="555" fill="#ffffff" font-size="28" font-family="Arial, sans-serif">
        Pantry + troubleshooting notes
      </text>

      <rect x="610" y="635" width="170" height="64" rx="18" fill="#a33f3a"/>
      <text x="662" y="677" fill="#ffffff" font-size="34" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">
        ${EBOOK.price}
      </text>

      <text x="610" y="760" fill="#ffffff" font-size="25" font-family="Arial, sans-serif">
        vegan-masala.com/store
      </text>

      <text x="540" y="980" fill="#ffffff" font-size="24" text-anchor="middle" font-family="Arial, sans-serif">
        Comforting vegan Indian sweets in one beautifully designed guide
      </text>
    </svg>
  `);

  const finalPngBuffer = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: "#081318",
    },
  })
    .composite([
      { input: panel, left: 0, top: 0 },
      { input: cover, left: 92, top: 150 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  const out = path.join(OUTPUT, `${EBOOK.slug}.jpg`);
  fs.writeFileSync(out, finalPngBuffer);

  const saved = await saveGeneratedInstagramImage(EBOOK.slug, finalPngBuffer);

  return {
    success: true,
    slug: EBOOK.slug,
    image: saved.url,
    storage: saved.storage,
    path: saved.path,
    instagramCaption: buildInstagramEbookCaption(),
    facebookCaption: buildFacebookEbookCaption(),
  };
}