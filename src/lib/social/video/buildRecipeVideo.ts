import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import sharp from "sharp";
import { put, list } from "@vercel/blob";
import ffmpegPath from "ffmpeg-static";
import opentype from "opentype.js";

import {
  detectContentTypeBySlug,
  titleFromSlug,
} from "@/lib/social/core/content";
import { BRAND } from "@/lib/social/core/brand";

const execFileAsync = promisify(execFile);

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const VIDEO_DIR = path.join(ROOT, "generated", "video");
const TEMP_DIR = path.join(ROOT, "generated", "video-temp");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const INTRO_DURATION = 6;
const MAIN_DURATION = 9;
const OUTRO_DURATION = 5;

function ensure(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN ||
    ""
  );
}

function getFfmpeg() {
  if (typeof ffmpegPath === "string") return ffmpegPath;
  throw new Error("ffmpeg missing");
}

async function run(args: string[]) {
  await execFileAsync(getFfmpeg(), args);
}

function wrap(text: string) {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;

    if (next.length < 18) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

async function resolveImage(slug: string) {
  const token = getBlobToken();

  if (!token) {
    throw new Error(
      "Vercel Blob: No token found. Either configure the `BLOB_READ_WRITE_TOKEN` environment variable, or pass a `token` option to your calls."
    );
  }

  const candidates = [`instagram/${slug}.jpg`, `instagram/${slug}.png`];

  for (const file of candidates) {
    const { blobs } = await list({
      token,
      prefix: file,
    });

    const match = blobs.find((b) => b.pathname === file);

    if (match?.url) {
      const res = await fetch(match.url, { cache: "no-store" });
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      const temp = path.join(TEMP_DIR, `${slug}.png`);

      await sharp(buffer).png().toFile(temp);
      return temp;
    }
  }

  throw new Error("No generated image");
}

function loadFont() {
  const localCandidates = [
    path.join(process.cwd(), "public", "fonts", "Rajdhani-Bold.ttf"),
    path.join(process.cwd(), "public", "fonts", "Rajdhani-Regular.ttf"),
    path.join(process.cwd(), "Rajdhani", "Rajdhani-Bold.ttf"),
    path.join(process.cwd(), "Rajdhani", "Rajdhani-Regular.ttf"),
  ];

  for (const local of localCandidates) {
    if (fs.existsSync(local)) {
      return opentype.loadSync(local);
    }
  }

  throw new Error("Font missing");
}

function textSvg(
  text: string,
  font: opentype.Font,
  size: number,
  color: string,
  center: number,
  y: number
) {
  let cursor = 0;
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;

  let min = Infinity;
  let max = -Infinity;
  const parts: string[] = [];

  for (const g of glyphs) {
    const p = g.getPath(cursor, y, size);
    const box = p.getBoundingBox();

    min = Math.min(min, box.x1);
    max = Math.max(max, box.x2);

    parts.push(p.toPathData(2));
    cursor += (g.advanceWidth || 500) * scale;
  }

  const width = max - min;
  const tx = center - (min + width / 2);

  return `
    <g transform="translate(${tx},0)">
      <path d="${parts.join(" ")}" fill="${color}" />
    </g>
  `;
}

async function renderCard(title: string, subtitle: string, out: string) {
  const font = loadFont();
  const lines = wrap(title);

  const titleSvg = lines
    .map((l, i) => textSvg(l, font, 84, BRAND.gold, 540, 860 + i * 100))
    .join("");

  const subSvg = textSvg(subtitle, font, 42, BRAND.soft, 540, 1210);

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#000" />
      <rect
        x="14"
        y="14"
        width="${WIDTH - 28}"
        height="${HEIGHT - 28}"
        rx="34"
        ry="34"
        fill="none"
        stroke="${BRAND.border}"
        stroke-width="3"
      />
      ${titleSvg}
      ${subSvg}
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(out);
}

async function still(image: string, out: string, duration: number) {
  await run([
    "-y",
    "-loop",
    "1",
    "-i",
    image,
    "-t",
    String(duration),
    "-vf",
    `scale=1080:1920,fade=t=in:st=0:d=0.6,fade=t=out:st=${duration - 0.6}:d=0.6,format=yuv420p`,
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    out,
  ]);
}

async function mainClip(image: string, out: string) {
  const card = path.join(TEMP_DIR, "card.png");
  const frame = path.join(TEMP_DIR, "frame.png");

  const mask = Buffer.from(`
    <svg width="820" height="820" xmlns="http://www.w3.org/2000/svg">
      <rect width="820" height="820" rx="34" ry="34" fill="white" />
    </svg>
  `);

  const frameSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="14"
        y="14"
        width="${WIDTH - 28}"
        height="${HEIGHT - 28}"
        rx="34"
        ry="34"
        fill="none"
        stroke="${BRAND.border}"
        stroke-width="3"
      />
    </svg>
  `;

  await sharp(Buffer.from(frameSvg)).png().toFile(frame);

  await sharp(image)
    .resize(820, 820, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .composite([
      {
        input: mask,
        blend: "dest-in",
      },
    ])
    .png()
    .toFile(card);

  const filter = [
    `[0:v]scale=1400:2488:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:12,zoompan=z='min(zoom+0.0012,1.18)':d=${MAIN_DURATION * FPS}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS}[bg]`,
    `[1:v]format=rgba[card]`,
    `[2:v]format=rgba[frame]`,
    `[bg][card]overlay=(W-w)/2:420[tmp1]`,
    `[tmp1][frame]overlay=0:0,format=yuv420p[outv]`,
  ].join(";");

  await run([
    "-y",
    "-loop",
    "1",
    "-i",
    image,
    "-loop",
    "1",
    "-i",
    card,
    "-loop",
    "1",
    "-i",
    frame,
    "-filter_complex",
    filter,
    "-map",
    "[outv]",
    "-t",
    String(MAIN_DURATION),
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    out,
  ]);
}

async function concat(intro: string, main: string, outro: string, final: string) {
  await run([
    "-y",
    "-i",
    intro,
    "-i",
    main,
    "-i",
    outro,
    "-filter_complex",
    "[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]",
    "-map",
    "[outv]",
    "-c:v",
    "libx264",
    final,
  ]);
}

export async function buildRecipeVideo(slug: string) {
  ensure(VIDEO_DIR);
  ensure(TEMP_DIR);

  const image = await resolveImage(slug);

  const introPng = path.join(TEMP_DIR, `${slug}-intro.png`);
  const outroPng = path.join(TEMP_DIR, `${slug}-outro.png`);

  const type = detectContentTypeBySlug(slug) || "recipe";
  const introSubtitle =
    type === "guide" ? "Vegan Indian Cooking Guide" : "Vegan Indian Recipe";

  await renderCard(titleFromSlug(slug), introSubtitle, introPng);
  await renderCard("Follow For More", "vegan-masala.com", outroPng);

  const introMp4 = path.join(TEMP_DIR, "intro.mp4");
  const mainMp4 = path.join(TEMP_DIR, "main.mp4");
  const outroMp4 = path.join(TEMP_DIR, "outro.mp4");

  const final = path.join(VIDEO_DIR, `${slug}.mp4`);

  await still(introPng, introMp4, INTRO_DURATION);
  await mainClip(image, mainMp4);
  await still(outroPng, outroMp4, OUTRO_DURATION);
  await concat(introMp4, mainMp4, outroMp4, final);

  const token = getBlobToken();

  if (!token) {
    throw new Error(
      "Vercel Blob: No token found. Either configure the `BLOB_READ_WRITE_TOKEN` environment variable, or pass a `token` option to your calls."
    );
  }

  const buffer = fs.readFileSync(final);

  const blob = await put(`videos/${slug}.mp4`, buffer, {
    access: "public",
    contentType: "video/mp4",
    token,
    allowOverwrite: true,
  });

  return {
    success: true,
    video: blob.url,
  };
}