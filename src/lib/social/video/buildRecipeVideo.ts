import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import sharp from "sharp";
import { put, list } from "@vercel/blob";
import ffmpegPath from "ffmpeg-static";
import opentype from "opentype.js";

import { detectContentTypeBySlug, titleFromSlug } from "@/lib/social/core/content";
import { BRAND } from "@/lib/social/core/brand";
import { findContentImage } from "@/lib/social/core/assets";
import { getRecipeBySlug } from "@/lib/recipes";
import { getGuideBySlug } from "@/lib/guides";
import { getSocialCopyForSlug } from "@/lib/social/core/socialCopy";

const execFileAsync = promisify(execFile);

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const VIDEO_DIR = path.join(ROOT, "generated", "video");
const TEMP_DIR = path.join(ROOT, "generated", "video-temp");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const INTRO_DURATION = 3;
const MAIN_DURATION = 6;
const OUTRO_DURATION = 3;

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

function wrap(text: string, maxLength = 18) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxLength) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function fitVideoTextBlock(options: {
  text: string;
  baseChars: number;
  baseFontSize: number;
  baseLineHeight: number;
  maxHeight: number;
  minFontSize?: number;
  step?: number;
}) {
  const {
    text,
    baseChars,
    baseFontSize,
    baseLineHeight,
    maxHeight,
    minFontSize = 18,
    step = 2,
  } = options;

  const cleaned = cleanPromoText(text);
  if (!cleaned) {
    return {
      lines: [],
      fontSize: baseFontSize,
      lineHeight: baseLineHeight,
    };
  }

  for (let fontSize = baseFontSize; fontSize >= minFontSize; fontSize -= step) {
    const scale = fontSize / baseFontSize;
    const chars = Math.max(12, Math.floor(baseChars / scale));
    const lineHeight = Math.max(fontSize + 6, Math.round(baseLineHeight * scale));
    const lines = wrap(cleaned, chars);

    if (lines.length * lineHeight <= maxHeight) {
      return {
        lines,
        fontSize,
        lineHeight,
      };
    }
  }

  const fallbackFont = minFontSize;
  const fallbackScale = fallbackFont / baseFontSize;
  const fallbackChars = Math.max(12, Math.floor(baseChars / fallbackScale));
  const fallbackLineHeight = Math.max(
    fallbackFont + 6,
    Math.round(baseLineHeight * fallbackScale)
  );

  return {
    lines: wrap(cleaned, fallbackChars),
    fontSize: fallbackFont,
    lineHeight: fallbackLineHeight,
  };
}

function pickFromSeed(slug: string, options: string[]) {
  const sum = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[sum % options.length];
}

function cleanPromoText(text?: string) {
  return String(text || "")
    .replace(/\bpacked with flavour\b/gi, "")
    .replace(/\bperfect weeknight meal\b/gi, "")
    .replace(/\brestaurant-quality\b/gi, "")
    .replace(/\bcomes together beautifully\b/gi, "")
    .replace(/\bwritten in the style of\b/gi, "")
    .replace(/\bflavour-packed\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenLine(text: string) {
  return cleanPromoText(text);
}

function shortenForReel(text: string, max = 110) {
  const cleaned = cleanPromoText(text);
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;

  const sliced = cleaned.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 50 ? lastSpace : max).trim()}…`;
}

function getEditorialContent(slug: string, type: "recipe" | "guide") {
  if (type === "recipe") {
    const recipe: any = getRecipeBySlug(slug);

    if (recipe) {
      return {
        title: recipe.title || titleFromSlug(slug),
        description: recipe.description || "",
        introNote: recipe.introNote || "",
        servingSuggestion: recipe.servingSuggestion || "",
        socialHook: recipe.socialHook || "",
      };
    }
  }

  const guide: any = getGuideBySlug(slug);

  if (guide) {
    return {
      title: guide.title || titleFromSlug(slug),
      description: guide.description || "",
      introNote: "",
      servingSuggestion: "",
      socialHook: "",
    };
  }

  return {
    title: titleFromSlug(slug),
    description: "",
    introNote: "",
    servingSuggestion: "",
    socialHook: "",
  };
}

function buildNaturalIntroSubtitle(
  content: {
    description?: string;
    introNote?: string;
    servingSuggestion?: string;
  },
  type: "recipe" | "guide",
  slug: string
) {
  if (content.description) return shortenLine(content.description);
  if (content.introNote) return shortenLine(content.introNote);

  if (type === "guide") {
    return pickFromSeed(slug, [
      "Practical guidance for better everyday cooking",
      "Clear help for building confidence in the kitchen",
      "A simple guide for stronger flavour and technique",
      "Useful help for more confident home cooking",
    ]);
  }

  return pickFromSeed(slug, [
    "Vegan Indian cooking with depth, warmth and real flavour",
    "Built on proper masala, steady seasoning and patience",
    "The kind of cooking that earns a place at the table",
    "Family-style food with warmth and character",
  ]);
}

function buildNaturalMainSubtitle(
  content: {
    introNote?: string;
    servingSuggestion?: string;
    description?: string;
  },
  type: "recipe" | "guide",
  slug: string
) {
  if (content.introNote) return shortenLine(content.introNote);
  if (content.servingSuggestion) return shortenLine(content.servingSuggestion);
  if (content.description) return shortenLine(content.description);

  if (type === "guide") {
    return pickFromSeed(slug, [
      "Practical kitchen guidance",
      "Simple help for home cooks",
      "Clearer flavour and technique",
      "A useful cooking shortcut",
    ]);
  }

  return pickFromSeed(slug, [
    "Cooked properly, served hot",
    "A dish worth making well",
    "Warm, grounded, full of character",
    "Made for the centre of the table",
  ]);
}

function buildNaturalOutroTitle(type: "recipe" | "guide", slug: string) {
  if (type === "guide") {
    return pickFromSeed(slug, [
      "Keep Learning",
      "Cook With Confidence",
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

function buildNaturalOutroSubtitle(
  content: {
    servingSuggestion?: string;
    description?: string;
  },
  type: "recipe" | "guide",
  slug: string
) {
  if (type === "guide") {
    return pickFromSeed(slug, [
      "More practical guides on Vegan Masala",
      "Simple cooking help on Vegan Masala",
      "Learn more on Vegan Masala",
      "More useful guides for home cooks",
    ]);
  }

  if (content.servingSuggestion) {
    return shortenLine(content.servingSuggestion);
  }

  return pickFromSeed(slug, [
    "Find the full recipe on Vegan Masala",
    "More vegan Indian cooking on Vegan Masala",
    "More flavour-led recipes on Vegan Masala",
    "Discover more on Vegan Masala",
  ]);
}

async function resolveImage(slug: string) {
  const type = (detectContentTypeBySlug(slug) || "recipe") as "recipe" | "guide";

  const local = findContentImage(slug, type);
  if (local && fs.existsSync(local)) {
    const temp = path.join(TEMP_DIR, `${slug}-source.png`);
    await sharp(local).png().toFile(temp);
    return temp;
  }

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

  throw new Error("No source image found for video");
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

function logoImageSvg(logoPath: string | null, x: number, y: number, w: number, h: number) {
  if (!logoPath || !fs.existsSync(logoPath)) return "";

  const buf = fs.readFileSync(logoPath);
  const b64 = buf.toString("base64");

  return `<image href="data:image/png;base64,${b64}" x="${x}" y="${y}" width="${w}" height="${h}" />`;
}

async function brandTextureBackground(out: string) {
  const texturePath = path.join(process.cwd(), "public", "images", "page-background.jpg");

  let base = sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: BRAND.bg,
    },
  });

  if (fs.existsSync(texturePath)) {
    const texture = await sharp(texturePath)
      .resize(WIDTH, HEIGHT, { fit: "cover" })
      .modulate({ brightness: 1.02, saturation: 0.72 })
      .png()
      .toBuffer();

    const wash = Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${WIDTH}" height="${HEIGHT}" fill="#081318" fill-opacity="0.42"/>
      </svg>
    `);

    base = sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: BRAND.bg,
      },
    }).composite([
      { input: texture, left: 0, top: 0, blend: "overlay" },
      { input: wash, left: 0, top: 0 },
    ]);
  }

  await base.png().toFile(out);
}

async function renderCard(
  title: string,
  subtitle: string,
  out: string,
  logoPath: string | null
) {
  const font = loadFont();

  const titleBlock = fitVideoTextBlock({
    text: title,
    baseChars: 16,
    baseFontSize: 96,
    baseLineHeight: 108,
    maxHeight: 340,
    minFontSize: 52,
  });

  const subtitleBlock = fitVideoTextBlock({
    text: subtitle,
    baseChars: 24,
    baseFontSize: 48,
    baseLineHeight: 62,
    maxHeight: 260,
    minFontSize: 30,
  });

  const titleSvg = titleBlock.lines
    .map((l, i) =>
      textSvg(
        l,
        font,
        titleBlock.fontSize,
        BRAND.gold,
        540,
        780 + i * titleBlock.lineHeight,
        "center"
      )
    )
    .join("");

  const subSvg = subtitleBlock.lines
    .map((l, i) =>
      textSvg(
        l,
        font,
        subtitleBlock.fontSize,
        BRAND.soft,
        540,
        1120 + i * subtitleBlock.lineHeight,
        "center"
      )
    )
    .join("");

  const siteSvg = textSvg("vegan-masala.com", font, 28, "#ffffff", 540, 1860, "center");
  const logoSvg = logoImageSvg(logoPath, 390, 285, 300, 300);

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
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
      ${logoSvg}
      ${titleSvg}
      ${subSvg}
      ${siteSvg}
    </svg>
  `;

  const bg = path.join(TEMP_DIR, "video-card-bg.png");
  await brandTextureBackground(bg);

  await sharp(bg)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png()
    .toFile(out);
}

async function renderMainOverlay(
  title: string,
  subtitle: string,
  out: string,
  logoPath: string | null
) {
  const font = loadFont();

  const titleBlock = fitVideoTextBlock({
    text: title,
    baseChars: 20,
    baseFontSize: 72,
    baseLineHeight: 82,
    maxHeight: 240,
    minFontSize: 42,
  });

  const subtitleBlock = fitVideoTextBlock({
    text: subtitle,
    baseChars: 28,
    baseFontSize: 38,
    baseLineHeight: 48,
    maxHeight: 190,
    minFontSize: 24,
  });

  const titleSvg = titleBlock.lines
    .map((l, i) =>
      textSvg(
        l,
        font,
        titleBlock.fontSize,
        BRAND.gold,
        74,
        215 + i * titleBlock.lineHeight,
        "left"
      )
    )
    .join("");

  const subSvg = subtitleBlock.lines
    .map((l, i) =>
      textSvg(
        l,
        font,
        subtitleBlock.fontSize,
        BRAND.soft,
        74,
        1545 + i * subtitleBlock.lineHeight,
        "left"
      )
    )
    .join("");

  const siteSvg = textSvg("vegan-masala.com", font, 30, "#ffffff", 540, 1860, "center");
  const logoSvg = logoImageSvg(logoPath, 760, 1535, 220, 220);

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
        y="${HEIGHT - 700}"
        width="${WIDTH}"
        height="700"
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
    <svg width="900" height="980" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="980" rx="34" ry="34" fill="white" />
    </svg>
  `);

  const border = Buffer.from(`
    <svg width="900" height="980" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="2"
        width="896"
        height="976"
        rx="34"
        ry="34"
        fill="none"
        stroke="${BRAND.gold}"
        stroke-width="4"
      />
    </svg>
  `);

  await sharp(image)
    .resize(900, 980, {
      fit: "cover",
      position: "centre",
    })
    .composite([
      {
        input: mask,
        blend: "dest-in",
      },
      {
        input: border,
        blend: "over",
      },
    ])
    .png()
    .toFile(card);

  await renderMainOverlay(title, subtitle, overlay, logoPath);

  const texturePath = path.join(process.cwd(), "public", "images", "page-background.jpg");
  const textureInput = fs.existsSync(texturePath) ? texturePath : image;

  const filter = [
    `[0:v]scale=1500:2667:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=0.78:contrast=1.04:brightness=0.04,boxblur=12:6,zoompan=z='min(zoom+0.0012,1.14)':d=${MAIN_DURATION * FPS}:x='iw/2-(iw/zoom/2)+sin(on/10)*16':y='ih/2-(ih/zoom/2)+cos(on/14)*12':s=1080x1920:fps=${FPS}[bg]`,
    `[1:v]format=rgba,colorchannelmixer=aa=1[card]`,
    `[2:v]format=rgba[overlay]`,
    `[bg][card]overlay=(W-w)/2:300[tmp1]`,
    `[tmp1][overlay]overlay=0:0,format=yuv420p[outv]`,
  ].join(";");

  await run([
    "-y",
    "-loop",
    "1",
    "-i",
    textureInput,
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

  const introMp4 = path.join(TEMP_DIR, "intro.mp4");
  const mainMp4 = path.join(TEMP_DIR, "main.mp4");
  const outroMp4 = path.join(TEMP_DIR, "outro.mp4");

  const final = path.join(VIDEO_DIR, `${slug}.mp4`);

  const type = (detectContentTypeBySlug(slug) || "recipe") as "recipe" | "guide";
  const editorial = getEditorialContent(slug, type);

  const title = editorial.title || titleFromSlug(slug);
  const socialCopy = await getSocialCopyForSlug(slug);

  const introSubtitle = shortenForReel(
    socialCopy.instagramImageHook?.trim() ||
      buildNaturalIntroSubtitle(editorial, type, slug),
    80
  );

  const mainSubtitle = shortenForReel(
    socialCopy.instagramImageSubtitle?.trim() ||
      buildNaturalMainSubtitle(editorial, type, slug),
    72
  );

  const outroTitle = buildNaturalOutroTitle(type, slug);

  const outroSubtitle = shortenForReel(
    type === "guide"
      ? "Read more on Vegan Masala"
      : "Full recipe on Vegan Masala",
    48
  );

  await renderCard(title, introSubtitle, introPng, logoPath);
  await renderCard(outroTitle, outroSubtitle, outroPng, logoPath);

  await still(introPng, introMp4, INTRO_DURATION);
  await mainClip(image, title, mainSubtitle, mainMp4, logoPath);
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