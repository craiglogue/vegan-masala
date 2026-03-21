import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import sharp from "sharp";

import {
  detectContentTypeBySlug,
  titleFromSlug,
  type ContentType,
} from "@/lib/social/core/content";

import { findContentImage } from "@/lib/social/core/images";
import { BRAND } from "@/lib/social/core/brand";

const execFileAsync = promisify(execFile);

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();

const GENERATED_IMAGE_DIR = path.join(ROOT, "generated", "instagram");
const VIDEO_DIR = path.join(ROOT, "generated", "video");
const TEMP_DIR = path.join(ROOT, "generated", "video-temp");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const INTRO_DURATION = 8;
const MAIN_DURATION = 10;
const OUTRO_DURATION = 8;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function findGeneratedInstagramImage(slug: string) {
  const p = path.join(GENERATED_IMAGE_DIR, `${slug}.png`);
  return fs.existsSync(p) ? p : null;
}

function resolveVideoSourceImage(slug: string, type: ContentType) {
  const generated = findGeneratedInstagramImage(slug);
  if (generated) return generated;

  return findContentImage(slug, type);
}

function wrap(text: string) {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;

    if (next.length <= 18) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }

  if (current) lines.push(current);

  return lines.slice(0, 3);
}

function esc(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function run(args: string[]) {
  await execFileAsync("ffmpeg", args);
}

async function renderCard(title: string, subtitle: string, out: string) {
  const lines = wrap(title);

  const titleSvg = lines
    .map(
      (line, i) => `
<text
  x="540"
  y="${650 + i * 90}"
  text-anchor="middle"
  font-size="82"
  font-weight="700"
  fill="${BRAND.gold}"
  font-family="Arial"
>
  ${esc(line)}
</text>
`
    )
    .join("");

  const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#000"/>

  <rect
    x="40"
    y="40"
    width="${WIDTH - 80}"
    height="${HEIGHT - 80}"
    rx="40"
    ry="40"
    fill="none"
    stroke="${BRAND.border}"
    stroke-width="3"
  />

  ${titleSvg}

  <text
    x="540"
    y="900"
    text-anchor="middle"
    font-size="42"
    font-weight="600"
    fill="${BRAND.soft}"
    font-family="Arial"
  >
    ${esc(subtitle)}
  </text>

  <text
    x="540"
    y="1840"
    text-anchor="middle"
    font-size="32"
    fill="#fff"
    font-family="Arial"
  >
    vegan-masala.com
  </text>
</svg>
`;

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: "#000",
    },
  })
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(out);
}

async function stillClip(image: string, out: string, duration: number) {
  await run([
    "-y",
    "-loop",
    "1",
    "-i",
    image,
    "-t",
    String(duration),
    "-vf",
    `scale=${WIDTH}:${HEIGHT},fade=t=in:st=0:d=1,fade=t=out:st=${duration - 1}:d=1,format=yuv420p`,
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
  await run([
    "-y",
    "-loop",
    "1",
    "-i",
    image,
    "-t",
    String(MAIN_DURATION),
    "-vf",
    "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p",
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
  const temp = path.join(TEMP_DIR, "video.mp4");
  const music = path.join(process.cwd(), "public", "audio", "vegan-masala-bed.mp3");

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
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    temp,
  ]);

  if (!fs.existsSync(music)) {
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
    music,
    "-shortest",
    "-filter:a",
    "volume=0.15",
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
  const logs: string[] = [];

  try {
    ensureDir(VIDEO_DIR);
    ensureDir(TEMP_DIR);

    logs.push(`Build start: ${slug}`);

    const type = detectContentTypeBySlug(slug) || "recipe";
    logs.push(`Detected type: ${type}`);
    logs.push(`process.cwd(): ${process.cwd()}`);
    logs.push(`ROOT: ${ROOT}`);

    const candidatePaths = [
      path.join(process.cwd(), "public", "images", "recipes", `${slug}.png`),
      path.join(process.cwd(), "public", "images", "recipes", `${slug}.jpg`),
      path.join(process.cwd(), "public", "images", "recipes", `${slug}.jpeg`),
      path.join(process.cwd(), "public", "images", "recipes", `${slug}.webp`),
      path.join(process.cwd(), "public", "images", "guides", `${slug}.png`),
      path.join(process.cwd(), "public", "images", "guides", `${slug}.jpg`),
      path.join(process.cwd(), "public", "images", "guides", `${slug}.jpeg`),
      path.join(process.cwd(), "public", "images", "guides", `${slug}.webp`),
      path.join(process.cwd(), "public", "generated", "instagram", `${slug}.png`),
      path.join(ROOT, "generated", "instagram", `${slug}.png`),
    ];

    for (const candidate of candidatePaths) {
      logs.push(
        `Check: ${candidate} => ${fs.existsSync(candidate) ? "FOUND" : "missing"}`
      );
    }

    const generated = findGeneratedInstagramImage(slug);
    logs.push(`Generated instagram image: ${generated ?? "none"}`);

    const resolvedByHelper = findContentImage(slug, type);
    logs.push(`findContentImage(): ${resolvedByHelper ?? "none"}`);

    const image = resolveVideoSourceImage(slug, type);

    if (!image) {
      throw new Error(`No source image found for slug: ${slug}`);
    }

    logs.push(`Source image: ${image}`);

    const introPng = path.join(TEMP_DIR, `${slug}-intro.png`);
    const outroPng = path.join(TEMP_DIR, `${slug}-outro.png`);

    const introMp4 = path.join(TEMP_DIR, `${slug}-intro.mp4`);
    const mainMp4 = path.join(TEMP_DIR, `${slug}-main.mp4`);
    const outroMp4 = path.join(TEMP_DIR, `${slug}-outro.mp4`);

    const final = path.join(VIDEO_DIR, `${slug}.mp4`);

    const introText =
      type === "guide" ? "Indian Cooking Guide" : "Vegan Indian Recipe";

    const outroText =
      type === "guide" ? "Guides To Indian Cooking" : "Vegan Indian Recipes";

    logs.push("Rendering intro card");
    await renderCard(titleFromSlug(slug), introText, introPng);

    logs.push("Rendering outro card");
    await renderCard("Follow For More", outroText, outroPng);

    logs.push("Creating intro clip");
    await stillClip(introPng, introMp4, INTRO_DURATION);

    logs.push("Creating main clip");
    await mainClip(image, mainMp4);

    logs.push("Creating outro clip");
    await stillClip(outroPng, outroMp4, OUTRO_DURATION);

    logs.push("Concatenating clips");
    await concat(introMp4, mainMp4, outroMp4, final);

    logs.push(`Final video path: ${final}`);
    logs.push("Build complete");

    return {
      success: true,
      video: final,
      logs,
    };
  } catch (err: any) {
    logs.push(`ERROR: ${err?.message || "Unknown error"}`);
    throw new Error(logs.join("\n"));
  }
}