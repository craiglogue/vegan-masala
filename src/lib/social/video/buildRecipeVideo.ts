import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import sharp from "sharp";
import { put } from "@vercel/blob";
import ffmpegPath from "ffmpeg-static";

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
const LOCAL_PUBLIC_VIDEO_DIR = path.join(
  process.cwd(),
  "public",
  "generated",
  "video"
);

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const INTRO_DURATION = 8;
const MAIN_DURATION = 10;
const OUTRO_DURATION = 8;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function getFfmpegBinary(logs?: string[]) {
  const candidates = [
    typeof ffmpegPath === "string" ? ffmpegPath : null,
    "/var/task/node_modules/ffmpeg-static/ffmpeg",
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  if (logs) {
    logs.push(`ffmpeg candidates: ${candidates.join(" | ")}`);
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      if (logs) logs.push(`ffmpeg binary: ${candidate}`);
      return candidate;
    }
  }

  throw new Error(`ffmpeg binary not found. Candidates: ${candidates.join(", ")}`);
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

async function run(args: string[], logs?: string[]) {
  const bin = getFfmpegBinary(logs);
  await execFileAsync(bin, args);
}

async function fetchBuffer(url: string, logs: string[], label: string) {
  logs.push(`Fetch ${label}: ${url}`);
  const res = await fetch(url, { cache: "no-store" });
  logs.push(`Fetch ${label} status: ${res.status} ${res.statusText}`);

  if (!res.ok) return null;

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function resolveLogo(baseUrl: string, logs: string[]) {
  if (!process.env.VERCEL) {
    const localCandidates = [
      path.join(process.cwd(), "public", "brand", "logo-flat.png"),
      path.join(process.cwd(), "public", "brand", "logo-primary.png"),
      path.join(process.cwd(), "public", "brand", "logo-mark.png"),
    ];

    for (const candidate of localCandidates) {
      if (fs.existsSync(candidate)) return candidate;
    }

    return null;
  }

  const remoteCandidates = [
    `${baseUrl}/brand/logo-flat.png`,
    `${baseUrl}/brand/logo-primary.png`,
    `${baseUrl}/brand/logo-mark.png`,
  ];

  for (const url of remoteCandidates) {
    const buffer = await fetchBuffer(url, logs, "logo");
    if (buffer) {
      const out = path.join(TEMP_DIR, "brand-logo.png");
      await sharp(buffer).png().toFile(out);
      logs.push(`Using remote logo: ${out}`);
      return out;
    }
  }

  logs.push("No logo found");
  return null;
}

async function resolveMusic(baseUrl: string, logs: string[]) {
  if (!process.env.VERCEL) {
    const localMusic = path.join(
      process.cwd(),
      "public",
      "audio",
      "vegan-masala-bed.mp3"
    );
    return fs.existsSync(localMusic) ? localMusic : null;
  }

  const buffer = await fetchBuffer(
    `${baseUrl}/audio/vegan-masala-bed.mp3`,
    logs,
    "music"
  );

  if (!buffer) {
    logs.push("No music file found");
    return null;
  }

  const out = path.join(TEMP_DIR, "vegan-masala-bed.mp3");
  fs.writeFileSync(out, buffer);
  logs.push(`Using remote music: ${out}`);
  return out;
}

async function resolveFont(baseUrl: string, logs: string[]) {
  if (!process.env.VERCEL) {
    const localCandidates = [
      path.join(process.cwd(), "public", "fonts", "Rajdhani-Bold.ttf"),
      path.join(process.cwd(), "public", "fonts", "Rajdhani-Regular.ttf"),
      path.join(process.cwd(), "Rajdhani", "Rajdhani-Bold.ttf"),
      path.join(process.cwd(), "Rajdhani", "Rajdhani-Regular.ttf"),
    ];

    for (const candidate of localCandidates) {
      if (fs.existsSync(candidate)) {
        logs.push(`Using local font: ${candidate}`);
        return candidate;
      }
    }

    return null;
  }

  const remoteCandidates = [
    `${baseUrl}/fonts/Rajdhani-Bold.ttf`,
    `${baseUrl}/fonts/Rajdhani-Regular.ttf`,
  ];

  for (const url of remoteCandidates) {
    const buffer = await fetchBuffer(url, logs, "font");
    if (buffer) {
      const out = path.join(TEMP_DIR, path.basename(url));
      fs.writeFileSync(out, buffer);
      logs.push(`Using remote font: ${out}`);
      return out;
    }
  }

  logs.push("No font found");
  return null;
}

async function renderCard(
  title: string,
  subtitle: string,
  out: string,
  logoPath: string | null,
  fontPath: string | null
) {
  const lines = wrap(title);
  const usableFont =
    fontPath && fs.existsSync(fontPath) ? fontPath : undefined;

  const baseComposites: sharp.OverlayOptions[] = [];

  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = await sharp(logoPath)
      .trim({ threshold: 10 })
      .resize(260, 260, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    baseComposites.push({
      input: logoBuffer,
      top: 420,
      left: 410,
    });
  }

  const titleText = lines.join("\n");

  const titleBuffer = await sharp({
    text: {
      text: titleText,
      width: 820,
      align: "center",
      justify: false,
      rgba: true,
      dpi: 144,
      font: "Rajdhani Bold 82",
      fontfile: usableFont,
    },
  })
    .png()
    .toBuffer();

  const subtitleBuffer = await sharp({
    text: {
      text: subtitle,
      width: 820,
      align: "center",
      justify: false,
      rgba: true,
      dpi: 144,
      font: "Rajdhani Bold 42",
      fontfile: usableFont,
    },
  })
    .png()
    .toBuffer();

  const siteBuffer = await sharp({
    text: {
      text: "vegan-masala.com",
      width: 820,
      align: "center",
      justify: false,
      rgba: true,
      dpi: 144,
      font: "Rajdhani Bold 32",
      fontfile: usableFont,
    },
  })
    .png()
    .toBuffer();

  const titleMeta = await sharp(titleBuffer).metadata();
  const subtitleMeta = await sharp(subtitleBuffer).metadata();
  const siteMeta = await sharp(siteBuffer).metadata();

  const frameSvg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#000000"/>

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
  </svg>
  `;

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: "#000000",
    },
  })
    .composite([
      {
        input: Buffer.from(frameSvg),
        top: 0,
        left: 0,
      },
      ...baseComposites,
      {
        input: titleBuffer,
        top: 820,
        left: Math.round((WIDTH - (titleMeta.width ?? 0)) / 2),
      },
      {
        input: subtitleBuffer,
        top: 1160,
        left: Math.round((WIDTH - (subtitleMeta.width ?? 0)) / 2),
      },
      {
        input: siteBuffer,
        top: 1810,
        left: Math.round((WIDTH - (siteMeta.width ?? 0)) / 2),
      },
    ])
    .png()
    .toFile(out);
}

async function stillClip(
  image: string,
  out: string,
  duration: number,
  logs?: string[]
) {
  await run(
    [
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
    ],
    logs
  );
}

async function mainClip(image: string, out: string, logs?: string[]) {
  const filter = [
    `[0:v]scale=1400:2488:force_original_aspect_ratio=increase,` +
      `crop=1080:1920,` +
      `boxblur=30:12,` +
      `zoompan=` +
      `z='min(zoom+0.0012,1.18)':` +
      `d=300:` +
      `x='if(lte(on,150),iw/2-(iw/zoom/2)-on*0.6,iw/2-(iw/zoom/2)-(300-on)*0.6)':` +
      `y='ih/2-(ih/zoom/2)':` +
      `s=1080x1920:` +
      `fps=30[bg]`,
    `[1:v]scale=960:960:force_original_aspect_ratio=decrease,format=rgba[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2:format=auto,` +
      `fade=t=in:st=0:d=0.8,` +
      `fade=t=out:st=${MAIN_DURATION - 0.8}:d=0.8[outv]`,
  ].join(";");

  await run(
    [
      "-y",
      "-loop",
      "1",
      "-i",
      image,
      "-loop",
      "1",
      "-i",
      image,
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
    ],
    logs
  );
}

async function concat(
  intro: string,
  main: string,
  outro: string,
  final: string,
  musicFile: string | null,
  logs?: string[]
) {
  const temp = path.join(TEMP_DIR, "video.mp4");

  await run(
    [
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
    ],
    logs
  );

  if (!musicFile || !fs.existsSync(musicFile)) {
    fs.copyFileSync(temp, final);
    return;
  }

  await run(
    [
      "-y",
      "-i",
      temp,
      "-stream_loop",
      "-1",
      "-i",
      musicFile,
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
    ],
    logs
  );
}

async function resolveSourceImage(
  slug: string,
  type: ContentType,
  baseUrl: string,
  logs: string[]
) {
  if (!process.env.VERCEL) {
    const generated = path.join(GENERATED_IMAGE_DIR, `${slug}.png`);
    if (fs.existsSync(generated)) {
      logs.push(`Local generated image: ${generated}`);
      return generated;
    }

    const local = findContentImage(slug, type);
    logs.push(`Local findContentImage(): ${local ?? "none"}`);
    return local;
  }

  if (!baseUrl) {
    logs.push("No base URL available for remote image fetch");
    return null;
  }

  const remoteCandidates = [
    `${baseUrl}/generated/instagram/${slug}.png`,
    `${baseUrl}/images/${type === "recipe" ? "recipes" : "guides"}/${slug}.png`,
    `${baseUrl}/images/${type === "recipe" ? "recipes" : "guides"}/${slug}.jpg`,
    `${baseUrl}/images/${type === "recipe" ? "recipes" : "guides"}/${slug}.jpeg`,
    `${baseUrl}/images/${type === "recipe" ? "recipes" : "guides"}/${slug}.webp`,
  ];

  for (const url of remoteCandidates) {
    const buffer = await fetchBuffer(url, logs, "source image");
    if (buffer) {
      const tempFile = path.join(TEMP_DIR, `${slug}-source.png`);
      await sharp(buffer).png().toFile(tempFile);
      logs.push(`Using remote image via temp file: ${tempFile}`);
      return tempFile;
    }
  }

  return null;
}

export async function buildRecipeVideo(slug: string, baseUrl?: string) {
  const logs: string[] = [];

  try {
    ensureDir(VIDEO_DIR);
    ensureDir(TEMP_DIR);

    if (!process.env.VERCEL) {
      ensureDir(LOCAL_PUBLIC_VIDEO_DIR);
    }

    const resolvedBaseUrl =
      baseUrl || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

    logs.push(`Build start: ${slug}`);
    logs.push(`Base URL: ${resolvedBaseUrl || "none"}`);

    const type = detectContentTypeBySlug(slug) || "recipe";
    logs.push(`Detected type: ${type}`);
    logs.push(`process.cwd(): ${process.cwd()}`);
    logs.push(`ROOT: ${ROOT}`);

    const image = await resolveSourceImage(slug, type, resolvedBaseUrl, logs);

    if (!image) {
      throw new Error(`No source image found for slug: ${slug}`);
    }

    const logoPath = await resolveLogo(resolvedBaseUrl, logs);
    const musicFile = await resolveMusic(resolvedBaseUrl, logs);
    const fontPath = await resolveFont(resolvedBaseUrl, logs);

    logs.push(`Source image: ${image}`);
    logs.push(`Logo path: ${logoPath ?? "none"}`);
    logs.push(`Music file: ${musicFile ?? "none"}`);
    logs.push(`Font path: ${fontPath ?? "none"}`);

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
    await renderCard(titleFromSlug(slug), introText, introPng, logoPath, fontPath);

    logs.push("Rendering outro card");
    await renderCard("Follow For More", outroText, outroPng, logoPath, fontPath);

    logs.push("Creating intro clip");
    await stillClip(introPng, introMp4, INTRO_DURATION, logs);

    logs.push("Creating main clip");
    await mainClip(image, mainMp4, logs);

    logs.push("Creating outro clip");
    await stillClip(outroPng, outroMp4, OUTRO_DURATION, logs);

    logs.push("Concatenating clips");
    await concat(introMp4, mainMp4, outroMp4, final, musicFile, logs);

    if (process.env.VERCEL) {
      logs.push("Uploading video to Vercel Blob");

      const fileBuffer = fs.readFileSync(final);

      const blob = await put(`videos/${slug}.mp4`, fileBuffer, {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN,
      });

      logs.push(`Blob URL: ${blob.url}`);
      logs.push("Build complete");

      return {
        success: true,
        video: blob.url,
        logs,
      };
    }

    const localPublicFile = path.join(LOCAL_PUBLIC_VIDEO_DIR, `${slug}.mp4`);
    fs.copyFileSync(final, localPublicFile);

    const localUrl = `/generated/video/${slug}.mp4?v=${Date.now()}`;

    logs.push(`Local URL: ${localUrl}`);
    logs.push("Build complete");

    return {
      success: true,
      video: localUrl,
      logs,
    };
  } catch (err: any) {
    logs.push(`ERROR: ${err?.message || "Unknown error"}`);
    throw new Error(logs.join("\n"));
  }
}