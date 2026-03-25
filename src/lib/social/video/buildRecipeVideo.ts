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

function getBaseUrl() {
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

function getFfmpeg() {
  if (typeof ffmpegPath === "string") return ffmpegPath;
  throw new Error("ffmpeg missing");
}

async function run(args: string[]) {
  await execFileAsync(getFfmpeg(), args);
}

async function fetchBuffer(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

function wrap(text: string, maxLength = 18, maxLines = 3) {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length < maxLength) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function pickFromSeed(slug: string, options: string[]) {
  const sum = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[sum % options.length];
}

function buildRecipeSubtitle(slug: string) {
  return pickFromSeed(slug, [
    "Rich, cosy and full of flavour",
    "Easy vegan comfort food",
    "A hearty homemade dinner idea",
    "Simple ingredients, big flavour",
    "Warm, satisfying and comforting",
    "A flavour-packed vegan classic",
    "Cosy, hearty and seriously tasty",
    "Homemade comfort in every bite",
  ]);
}

function buildGuideSubtitle(slug: string) {
  return pickFromSeed(slug, [
    "A simple beginner-friendly guide",
    "Cook with more confidence",
    "Make vegan Indian cooking easier",
    "Learn the essentials clearly",
    "Practical tips for better flavour",
    "A clearer way to understand it",
    "Simple guidance you can use",
    "An easy guide for home cooks",
  ]);
}

function buildOutroTitle(type: "recipe" | "guide", slug: string) {
  if (type === "guide") {
    return pickFromSeed(slug, [
      "Cook With Confidence",
      "Keep Learning",
      "Make Cooking Easier",
      "Build Kitchen Confidence",
    ]);
  }

  return pickFromSeed(slug, [
    "Get The Full Recipe",
    "Cook This At Home",
    "Save This For Later",
    "Make This Tonight",
  ]);
}

function buildOutroSubtitle(type: "recipe" | "guide", slug: string) {
  if (type === "guide") {
    return pickFromSeed(slug, [
      "More vegan Indian guides on Vegan Masala",
      "Simple cooking help on Vegan Masala",
      "Learn more on Vegan Masala",
      "More practical guides on Vegan Masala",
    ]);
  }

  return pickFromSeed(slug, [
    "More cosy vegan Indian cooking",
    "Find the full recipe on Vegan Masala",
    "More flavour-packed recipes on Vegan Masala",
    "Discover more on Vegan Masala",
  ]);
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

async function resolveLogo() {
  const localCandidates = [
    path.join(process.cwd(), "public", "brand", "logo-flat.png"),
    path.join(process.cwd(), "public", "brand", "logo-primary.png"),
    path.join(process.cwd(), "public", "brand", "logo-mark.png"),
    path.join(process.cwd(), "public", "images", "logo.png"),
    path.join(process.cwd(), "public", "logo.png"),
  ];

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  const remoteCandidates = [
    `${baseUrl}/brand/logo-flat.png`,
    `${baseUrl}/brand/logo-primary.png`,
    `${baseUrl}/brand/logo-mark.png`,
    `${baseUrl}/images/logo.png`,
    `${baseUrl}/logo.png`,
  ];

  for (const url of remoteCandidates) {
    const buffer = await fetchBuffer(url);
    if (buffer) {
      const out = path.join(TEMP_DIR, "video-logo.png");
      await sharp(buffer).png().toFile(out);
      return out;
    }
  }

  return null;
}

async function resolveMusic() {
  const localCandidates = [
    path.join(process.cwd(), "public", "audio", "vegan-masala-bed.mp3"),
    path.join(process.cwd(), "audio", "vegan-masala-bed.mp3"),
  ];

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  const remoteCandidates = [`${baseUrl}/audio/vegan-masala-bed.mp3`];

  for (const url of remoteCandidates) {
    const buffer = await fetchBuffer(url);
    if (buffer) {
      const out = path.join(TEMP_DIR, "vegan-masala-bed.mp3");
      fs.writeFileSync(out, buffer);
      return out;
    }
  }

  return null;
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
  x: number,
  y: number,
  align: "center" | "left" = "center"
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
  const tx = align === "center" ? x - (min + width / 2) : x - min;

  return `
    <g transform="translate(${tx},0)">
      <path d="${parts.join(" ")}" fill="${color}" />
    </g>
  `;
}

function logoImageSvg(
  logoPath: string | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!logoPath || !fs.existsSync(logoPath)) return "";

  const buf = fs.readFileSync(logoPath);
  const b64 = buf.toString("base64");

  return `<image href="data:image/png;base64,${b64}" x="${x}" y="${y}" width="${w}" height="${h}" />`;
}

async function renderCard(
  title: string,
  subtitle: string,
  out: string,
  logoPath: string | null
) {
  const font = loadFont();
  const lines = wrap(title, 18, 3);
  const subtitleLines = wrap(subtitle, 30, 2);

  const titleSvg = lines
    .map((l, i) => textSvg(l, font, 84, BRAND.gold, 540, 850 + i * 96, "center"))
    .join("");

  const subSvg = subtitleLines
    .map((l, i) => textSvg(l, font, 40, BRAND.soft, 540, 1190 + i * 56, "center"))
    .join("");

  const siteSvg = textSvg("vegan-masala.com", font, 28, "#ffffff", 540, 1818, "center");
  const logoSvg = logoImageSvg(logoPath, 390, 240, 300, 300);

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
      ${logoSvg}
      ${titleSvg}
      ${subSvg}
      ${siteSvg}
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(out);
}

async function renderMainOverlay(
  title: string,
  subtitle: string,
  out: string,
  logoPath: string | null
) {
  const font = loadFont();
  const lines = wrap(title, 20, 3);
  const subtitleLines = wrap(subtitle, 28, 2);

  const titleSvg = lines
    .map((l, i) => textSvg(l, font, 72, BRAND.gold, 74, 1425 + i * 82, "left"))
    .join("");

  const subSvg = subtitleLines
    .map((l, i) => textSvg(l, font, 38, BRAND.soft, 74, 1675 + i * 48, "left"))
    .join("");

  const siteSvg = textSvg("vegan-masala.com", font, 30, "#ffffff", 74, 1810, "left");
  const logoSvg = logoImageSvg(logoPath, 760, 1480, 220, 220);

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bottomShade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="black" stop-opacity="0.88"/>
          <stop offset="28%" stop-color="black" stop-opacity="0.45"/>
          <stop offset="55%" stop-color="black" stop-opacity="0"/>
        </linearGradient>
      </defs>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="transparent" />

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

      <rect
        x="0"
        y="${HEIGHT - 560}"
        width="${WIDTH}"
        height="560"
        fill="url(#bottomShade)"
      />

      ${titleSvg}
      ${subSvg}
      ${siteSvg}
      ${logoSvg}
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

async function mainClip(
  image: string,
  title: string,
  subtitle: string,
  out: string,
  logoPath: string | null
) {
  const card = path.join(TEMP_DIR, "card.png");
  const overlay = path.join(TEMP_DIR, "main-overlay.png");

  const mask = Buffer.from(`
    <svg width="820" height="820" xmlns="http://www.w3.org/2000/svg">
      <rect width="820" height="820" rx="34" ry="34" fill="white" />
    </svg>
  `);

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

  await renderMainOverlay(title, subtitle, overlay, logoPath);

  const filter = [
    `[0:v]scale=1500:2667:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=1.30:contrast=1.12:brightness=0.03,boxblur=20:9,zoompan=z='min(zoom+0.0016,1.22)':d=${MAIN_DURATION * FPS}:x='iw/2-(iw/zoom/2)+sin(on/10)*22':y='ih/2-(ih/zoom/2)+cos(on/14)*14':s=1080x1920:fps=${FPS}[bg]`,
    `[1:v]format=rgba[card]`,
    `[2:v]format=rgba[overlay]`,
    `[bg][card]overlay=(W-w)/2:400[tmp1]`,
    `[tmp1][overlay]overlay=0:0,format=yuv420p[outv]`,
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
    overlay,
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

async function concat(
  intro: string,
  main: string,
  outro: string,
  final: string,
  musicFile: string | null
) {
  const temp = path.join(TEMP_DIR, "video-no-audio.mp4");

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
    "-pix_fmt",
    "yuv420p",
    temp,
  ]);

  if (!musicFile || !fs.existsSync(musicFile)) {
    fs.copyFileSync(temp, final);
    return;
  }

  await run([
    "-y",
    "-i",
    temp,
    "-stream_loop",
    "-1",
    "-i",
    musicFile,
    "-shortest",
    "-filter:a",
    "volume=0.12",
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    final,
  ]);
}

export async function buildRecipeVideo(slug: string) {
  ensure(VIDEO_DIR);
  ensure(TEMP_DIR);

  const image = await resolveImage(slug);
  const logoPath = await resolveLogo();
  const musicFile = await resolveMusic();

  const introPng = path.join(TEMP_DIR, `${slug}-intro.png`);
  const outroPng = path.join(TEMP_DIR, `${slug}-outro.png`);

  const type = detectContentTypeBySlug(slug) || "recipe";
  const title = titleFromSlug(slug);

  const introSubtitle =
    type === "guide" ? buildGuideSubtitle(slug) : buildRecipeSubtitle(slug);

  const outroTitle = buildOutroTitle(type, slug);
  const outroSubtitle = buildOutroSubtitle(type, slug);

  await renderCard(title, introSubtitle, introPng, logoPath);
  await renderCard(outroTitle, outroSubtitle, outroPng, logoPath);

  const introMp4 = path.join(TEMP_DIR, "intro.mp4");
  const mainMp4 = path.join(TEMP_DIR, "main.mp4");
  const outroMp4 = path.join(TEMP_DIR, "outro.mp4");

  const final = path.join(VIDEO_DIR, `${slug}.mp4`);

  await still(introPng, introMp4, INTRO_DURATION);
  await mainClip(image, title, introSubtitle, mainMp4, logoPath);
  await still(outroPng, outroMp4, OUTRO_DURATION);
  await concat(introMp4, mainMp4, outroMp4, final, musicFile);

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