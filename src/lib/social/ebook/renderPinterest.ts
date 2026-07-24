import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { EBOOK } from "./ebook";
import { buildPinterestEbookCaption } from "./captions";
import { saveGeneratedPinterestImage } from "@/lib/social/core/generatedAssets";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "pinterest");

const WIDTH = 1000;
const HEIGHT = 1500;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolvePublicFile(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

export async function renderPinterestEbookPromo() {
  ensureDir(OUTPUT);

  const coverPath = resolvePublicFile(EBOOK.coverImage);

  const cover = await sharp(coverPath)
    .resize(760, 940, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const panel = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#081318"/>
      <rect x="18" y="18" width="${WIDTH - 36}" height="${HEIGHT - 36}" rx="38" fill="none" stroke="#c8a646" stroke-width="2.5"/>

      <text x="70" y="90" fill="#a33f3a" font-size="28" font-weight="700" font-family="Arial, sans-serif">
        NEW DIGITAL EBOOK
      </text>

      <rect x="80" y="130" width="840" height="980" rx="34" fill="#0d171c" opacity="0.92"/>

      <text x="80" y="1185" fill="#c8a646" font-size="56" font-weight="700" font-family="Arial, sans-serif">
        Vegan Indian Sweets
      </text>
      <text x="80" y="1250" fill="#c8a646" font-size="56" font-weight="700" font-family="Arial, sans-serif">
        Mini Ebook
      </text>

      <text x="80" y="1318" fill="#ffffff" font-size="28" font-family="Arial, sans-serif">
        6 sweet recipes • instant PDF download
      </text>

      <text x="80" y="1362" fill="#ffffff" font-size="28" font-family="Arial, sans-serif">
        beginner-friendly • pantry + troubleshooting help
      </text>

      <rect x="80" y="1395" width="170" height="60" rx="18" fill="#a33f3a"/>
      <text x="165" y="1435" fill="#ffffff" font-size="32" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">
        ${EBOOK.price}
      </text>

      <text x="920" y="1438" fill="#ffffff" font-size="24" text-anchor="end" font-family="Arial, sans-serif">
        vegan-masala.com/store
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
      { input: cover, left: 120, top: 160 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  const out = path.join(OUTPUT, `${EBOOK.slug}.jpg`);
  fs.writeFileSync(out, finalPngBuffer);

  const saved = await saveGeneratedPinterestImage(EBOOK.slug, finalPngBuffer);

  return {
    success: true,
    slug: EBOOK.slug,
    image: saved.url,
    storage: saved.storage,
    path: saved.path,
    pinterestCaption: buildPinterestEbookCaption(),
  };
}
