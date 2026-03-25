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
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
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

async function fetchBuffer(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function resolveImage(slug: string, logs: string[]) {
  const token = getBlobToken();

  if (!token) {
    throw new Error(
      "Vercel Blob: No token found. Either configure the `BLOB_READ_WRITE_TOKEN` environment variable, or pass a `token` option to your calls."
    );
  }

  const candidates = [`instagram/${slug}.jpg`, `instagram/${slug}.png`];

  for (const file of candidates) {
    logs.push(`Blob lookup: ${file}`);

    const { blobs } = await list({
      token,
      prefix: file,
    });

    const match = blobs.find((b) => b.pathname === file);

    if (match?.url) {
      logs.push(`Blob match: ${match.url}`);

      const res = await fetch(match.url, { cache: "no-store" });
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      const temp = path.join(TEMP_DIR, `${slug}.png`);

      await sharp(buffer).png().toFile(temp);
      logs.push(`Using image: ${temp}`);
      return temp;
    }
  }

  throw new Error("No generated image");
}

async function resolveLogo(logs: string[]) {
  const localCandidates = [
    path.join(process.cwd(), "public", "brand", "logo-flat.png"),
    path.join(process.cwd(), "public", "brand", "logo-primary.png"),
    path.join(process.cwd(), "public", "brand", "logo-mark.png"),
    path.join(process.cwd(), "public", "images", "logo.png"),
  ];

  for (const local of localCandidates) {
    if (fs.existsSync(local)) {
      logs.push(`Using local logo: ${local}`);
      return local;
    }
  }

  const baseUrl = getBaseUrl();
  const remoteCandidates = [
    `${baseUrl}/brand/logo-flat.png`,
    `${baseUrl}/brand/logo-primary.png`,
    `${baseUrl}/brand/logo-mark.png`,
    `${baseUrl}/images/logo.png`,
  ];

  for (const url of remoteCandidates) {
    const buffer = await fetchBuffer(url);
    if (buffer) {
      const out = path.join(TEMP_DIR, "video-logo.png");
      await sharp(buffer).png().toFile(out);
      logs.push(`Using remote logo: ${out}`);
      return out;
    }
  }

  logs.push("No logo found");
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

async function renderCard(
  title: string,
  subtitle: string,
  out: string,
  logoPath: string | null
) {
  const font = loadFont();
  const lines = wrap(title);

  const titleSvg = lines
    .map((l, i) => textSvg(l, font, 84, BRAND.gold, 540, 860 + i * 100))
    .join("");

  const subSvg = textSvg(subtitle, font, 42, BRAND.soft, 540, 1210);
  const siteSvg = textSvg("vegan-masala.com", font, 30, "#ffffff", 540, 1828);

  let logoSvg = "";
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    const logoHref = `data:image/png;base64,${logoBuffer.toString("base64")}`;

    logoSvg = `
      <image
        href="${logoHref}"
        x="410"
        y="330"
        width="260"
        height="260"
      />
    `;
  }

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
  const lines = wrap(title);

  const titleSvg = lines
    .map((l, i) => textSvg(l, font, 72, BRAND.gold, 540, 1360 + i * 84))
    .join("");

  const subSvg = textSvg(subtitle, font, 38, BRAND.soft, 540, 1680);
  const siteSvg = textSvg("vegan-masala.com", font, 28, "#ffffff", 270, 1835);

  let logoSvg = "";
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    const logoHref = `data:image/png;base64,${logoBuffer.toString("base64")}`;

    logoSvg = `
      <image
        href="${logoHref}"
        x="770"
        y="1620"
        width="180"
        height="180"
      />
    `;
  }

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
        y="${HEIGHT - 520}"
        width="${WIDTH}"
        height="520"
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
  out: string,
  title: string,
  subtitle: string,
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
    `[0:v]scale=1480:2631:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:10,eq=saturation=1.28:contrast=1.10:brightness=-0.03,zoompan=z='min(zoom+0.0014,1.20)':d=${MAIN_DURATION * FPS}:x='iw/2-(iw/zoom/2)+sin(on/18)*22':y='ih/2-(ih/zoom/2)+cos(on/22)*10':s=1080x1920:fps=${FPS}[bg]`,
    `[1:v]format=rgba[card]`,
    `[2:v]format=rgba[ov]`,
    `[bg][card]overlay=(W-w)/2:360[tmp1]`,
    `[tmp1][ov]overlay=0:0,format=yuv420p[outv]`,
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
  const logs: string[] = [];

  ensure(VIDEO_DIR);
  ensure(TEMP_DIR);

  const image = await resolveImage(slug, logs);
  const logoPath = await resolveLogo(logs);

  const introPng = path.join(TEMP_DIR, `${slug}-intro.png`);
  const outroPng = path.join(TEMP_DIR, `${slug}-outro.png`);

  const type = detectContentTypeBySlug(slug) || "recipe";
  const introSubtitle =
    type === "guide" ? "Vegan Indian Cooking Guide" : "Vegan Indian Recipe";

  await renderCard(titleFromSlug(slug), introSubtitle, introPng, logoPath);
  await renderCard("Follow For More", "vegan-masala.com", outroPng, logoPath);

  const introMp4 = path.join(TEMP_DIR, "intro.mp4");
  const mainMp4 = path.join(TEMP_DIR, "main.mp4");
  const outroMp4 = path.join(TEMP_DIR, "outro.mp4");

  const final = path.join(VIDEO_DIR, `${slug}.mp4`);

  await still(introPng, introMp4, INTRO_DURATION);
  await mainClip(
    image,
    mainMp4,
    titleFromSlug(slug),
    introSubtitle,
    logoPath
  );
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
    logs,
  };
}