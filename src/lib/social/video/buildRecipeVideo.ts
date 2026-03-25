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
  type ContentType,
} from "@/lib/social/core/content";
import { BRAND } from "@/lib/social/core/brand";

const execFileAsync = promisify(execFile);

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
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

const INTRO_DURATION = 4;
const MAIN_DURATION = 9;
const OUTRO_DURATION = 4;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN ||
    ""
  );
}

function getFfmpegBinary(logs?: string[]) {
  const candidates = [
    typeof ffmpegPath === "string" ? ffmpegPath : null,
    "/var/task/node_modules/ffmpeg-static/ffmpeg",
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  if (logs) logs.push(`ffmpeg candidates: ${candidates.join(" | ")}`);

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

    if (next.length <= 16) {
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

function loadFontOrThrow(fontPath: string | null) {
  if (!fontPath || !fs.existsSync(fontPath)) {
    throw new Error("Font file not found for video card rendering");
  }

  return opentype.loadSync(fontPath);
}

function makeTextPathSvg(
  text: string,
  font: opentype.Font,
  fontSize: number,
  fill: string,
  centerX: number,
  baselineY: number,
  letterSpacing = 0
) {
  if (!text.trim()) return "";

  let cursorX = 0;
  const glyphs = font.stringToGlyphs(text);
  const unitsPerEm = font.unitsPerEm || 1000;
  const scale = fontSize / unitsPerEm;

  const parts: string[] = [];
  let minX = Infinity;
  let maxX = -Infinity;

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const pathObj = glyph.getPath(cursorX, baselineY, fontSize);
    const bbox = pathObj.getBoundingBox();

    if (Number.isFinite(bbox.x1) && Number.isFinite(bbox.x2)) {
      minX = Math.min(minX, bbox.x1);
      maxX = Math.max(maxX, bbox.x2);
    }

    parts.push(pathObj.toPathData(2));

    const advance =
      (glyph.advanceWidth || unitsPerEm * 0.5) * scale + letterSpacing;
    cursorX += advance;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return "";
  }

  const width = maxX - minX;
  const translateX = centerX - (minX + width / 2);

  return `
    <g transform="translate(${translateX},0)">
      <path d="${parts.join(" ")}" fill="${fill}" />
    </g>
  `;
}

function buildIntroHook(type: ContentType) {
  return type === "guide" ? "Master This Guide" : "Make This Tonight";
}

function buildIntroSub(type: ContentType) {
  return type === "guide" ? "Vegan Indian Cooking" : "Vegan Indian Recipe";
}

function buildOutroTitle(type: ContentType) {
  return type === "guide" ? "More Cooking Guides" : "More Vegan Indian Recipes";
}

async function renderCard(
  title: string,
  subtitle: string,
  out: string,
  logoPath: string | null,
  fontPath: string | null,
  eyebrow?: string
) {
  const font = loadFontOrThrow(fontPath);
  const lines = wrap(title);

  let logoHref = "";
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoHref = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  }

  const eyebrowPath = eyebrow
    ? makeTextPathSvg(eyebrow, font, 40, BRAND.soft, 540, 620, 1)
    : "";

  const titlePaths = lines
    .map((line, i) =>
      makeTextPathSvg(line, font, 82, BRAND.gold, 540, 860 + i * 92, 1)
    )
    .join("");

  const subtitlePath = makeTextPathSvg(
    subtitle,
    font,
    40,
    BRAND.soft,
    540,
    1210,
    1
  );

  const sitePath = makeTextPathSvg(
    "vegan-masala.com",
    font,
    32,
    "#ffffff",
    540,
    1830,
    1
  );

  const logoSvg = logoHref
    ? `<image href="${logoHref}" x="430" y="300" width="220" height="220" />`
    : "";

  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#000000"/>
    <rect
      x="16"
      y="16"
      width="${WIDTH - 32}"
      height="${HEIGHT - 32}"
      rx="34"
      ry="34"
      fill="none"
      stroke="${BRAND.border}"
      stroke-width="3"
      stroke-opacity="0.95"
    />
    ${logoSvg}
    ${eyebrowPath}
    ${titlePaths}
    ${subtitlePath}
    ${sitePath}
  </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(out);
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
      `scale=${WIDTH}:${HEIGHT},fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.6}:d=0.6,format=yuv420p`,
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

async function mainClip(
  image: string,
  out: string,
  logs?: string[]
) {
  const mainFramePng = path.join(TEMP_DIR, "main-frame-overlay.png");
  const roundedCardPng = path.join(TEMP_DIR, "main-card-rounded.png");

  const frameSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="16"
        y="16"
        width="${WIDTH - 32}"
        height="${HEIGHT - 32}"
        rx="34"
        ry="34"
        fill="none"
        stroke="${BRAND.border}"
        stroke-width="3"
        stroke-opacity="0.95"
      />
    </svg>
  `;

  await sharp(Buffer.from(frameSvg)).png().toFile(mainFramePng);

  const roundedMask = Buffer.from(`
    <svg width="840" height="840" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="840" height="840" rx="34" ry="34" fill="white"/>
    </svg>
  `);

  await sharp(image)
    .resize(840, 840, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .composite([
      {
        input: roundedMask,
        blend: "dest-in",
      },
    ])
    .png()
    .toFile(roundedCardPng);

  const filter = [
    `[0:v]scale=1450:2578:force_original_aspect_ratio=increase,` +
      `crop=1080:1920,` +
      `setsar=1,` +
      `boxblur=24:10,` +
      `zoompan=` +
      `z='min(zoom+0.0016,1.22)':` +
      `d=${MAIN_DURATION * FPS}:` +
      `x='iw/2-(iw/zoom/2)':` +
      `y='ih/2-(ih/zoom/2)':` +
      `s=1080x1920:` +
      `fps=${FPS}[bg]`,

    `[1:v]setsar=1,format=rgba[card]`,
    `[2:v]setsar=1,format=rgba[frame]`,

    `[bg][card]overlay=(W-w)/2:410:format=auto[tmp1]`,
    `[tmp1][frame]overlay=0:0:format=auto,` +
      `setsar=1,` +
      `fade=t=in:st=0:d=0.5,` +
      `fade=t=out:st=${MAIN_DURATION - 0.6}:d=0.6,` +
      `format=yuv420p[outv]`,
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
      roundedCardPng,
      "-i",
      mainFramePng,
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
      "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[2:v]setsar=1[v2];[v0][v1][v2]concat=n=3:v=1:a=0[outv]",
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
    ],
    logs
  );
}

async function resolveMainSlideImage(
  slug: string,
  baseUrl: string,
  logs: string[]
) {
  const blobToken = getBlobToken();

  if (blobToken) {
    const candidates = [
      `instagram/${slug}.jpg`,
      `instagram/${slug}.png`,
    ];

    for (const candidate of candidates) {
      try {
        logs.push(`Blob lookup: ${candidate}`);

        const { blobs } = await list({
          token: blobToken,
          prefix: candidate,
        });

        const exact = blobs.find((blob) => blob.pathname === candidate);

        if (exact?.url) {
          logs.push(`Blob match found: ${exact.url}`);

          const buffer = await fetchBuffer(exact.url, logs, "main slide image (blob)");
          if (buffer) {
            const ext = candidate.endsWith(".jpg") ? "jpg" : "png";
            const tempFile = path.join(TEMP_DIR, `${slug}-instagram-card.${ext}`);
            await sharp(buffer).png().toFile(tempFile);
            logs.push(`Using blob instagram image: ${tempFile}`);
            return tempFile;
          }
        } else {
          logs.push(`No blob match for ${candidate}`);
        }
      } catch (error: any) {
        logs.push(`Blob lookup failed for ${candidate}: ${error?.message || "Unknown blob error"}`);
      }
    }
  } else {
    logs.push("No blob token available for main slide lookup");
  }

  if (!process.env.VERCEL) {
    const localCandidates = [
      path.join(process.cwd(), "public", "generated", "instagram", `${slug}.jpg`),
      path.join(process.cwd(), "public", "generated", "instagram", `${slug}.png`),
    ];

    for (const candidate of localCandidates) {
      if (fs.existsSync(candidate)) {
        logs.push(`Using local generated instagram image: ${candidate}`);
        return candidate;
      }
    }

    logs.push(`Local generated instagram image missing for slug: ${slug}`);
    return null;
  }

  if (!baseUrl) {
    logs.push("No base URL available for remote main slide image fetch");
    return null;
  }

  const fallbackCandidates = [
    `${baseUrl}/generated/instagram/${slug}.jpg`,
    `${baseUrl}/generated/instagram/${slug}.png`,
  ];

  for (const fallbackUrl of fallbackCandidates) {
    const fallbackBuffer = await fetchBuffer(
      fallbackUrl,
      logs,
      "main slide image (site fallback)"
    );

    if (fallbackBuffer) {
      const tempFile = path.join(TEMP_DIR, `${slug}-instagram-card.png`);
      await sharp(fallbackBuffer).png().toFile(tempFile);
      logs.push(`Using fallback site instagram image: ${tempFile}`);
      return tempFile;
    }
  }

  logs.push(`Fallback site image missing for slug: ${slug}`);
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

    const image = await resolveMainSlideImage(slug, resolvedBaseUrl, logs);

    if (!image) {
      throw new Error(
        `No generated Instagram card found for slug: ${slug}. Generate the Instagram image first.`
      );
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

    const introText = titleFromSlug(slug);
    const introEyebrow = buildIntroHook(type);
    const introSub = buildIntroSub(type);

    const outroText = "Follow For More";
    const outroEyebrow = buildOutroTitle(type);
    const outroSub = "vegan-masala.com";

    logs.push("Rendering intro card");
    await renderCard(introText, introSub, introPng, logoPath, fontPath, introEyebrow);

    logs.push("Rendering outro card");
    await renderCard(outroText, outroSub, outroPng, logoPath, fontPath, outroEyebrow);

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
      const token = getBlobToken();

      if (!token) {
        throw new Error("Missing blob token for video upload");
      }

      const blob = await put(`videos/${slug}.mp4`, fileBuffer, {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
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