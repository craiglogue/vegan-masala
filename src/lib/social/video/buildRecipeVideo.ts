import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import sharp from "sharp";
import satori from "satori";

import { generateInstagramBySlug } from "@/lib/social/generateInstagram";
import { BRAND, getBrandFont } from "@/lib/social/core/brand";

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();

const GENERATED_IMAGE_DIR = path.join(ROOT, "generated", "instagram");
const VIDEO_DIR = path.join(ROOT, "generated", "video");
const TEMP_DIR = path.join(ROOT, "generated", "video-temp");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const INTRO_DURATION = 9;
const MAIN_DURATION = 11;
const OUTRO_DURATION = 9;

const FONT = getBrandFont();

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function titleFromSlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function findImage(slug: string) {
  const imagePath = path.join(GENERATED_IMAGE_DIR, `${slug}.png`);
  if (fs.existsSync(imagePath)) return imagePath;
  return null;
}

async function run(args: string[]) {
  try {
    await execFileAsync("ffmpeg", args);
  } catch (err: any) {
    console.error("FFMPEG FAILED:");
    console.error(args.join(" "));
    console.error(err?.stderr || err?.message || err);
    throw new Error(err?.stderr || err?.message || "ffmpeg failed");
  }
}

function wrap(text: string) {
  const words = text.split(" ");
  const out: string[] = [];
  let cur = "";

  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;

    if (next.length < 16) {
      cur = next;
    } else {
      if (cur) out.push(cur);
      cur = w;
    }
  }

  if (cur) out.push(cur);

  return out.slice(0, 2);
}

async function renderCard(title: string, subtitle: string, out: string) {
  const lines = wrap(title);
  const logoPath = path.join(ROOT, "public", "brand", "logo-flat.png");
  const logoDataUri = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const children: any[] = [
    {
      type: "div",
      props: {
        style: {
          position: "absolute",
          top: 26,
          left: 26,
          right: 26,
          bottom: 26,
          border: `2px solid ${BRAND.border}`,
          borderRadius: 18,
        },
      },
    },
    {
      type: "div",
      props: {
        style: {
          color: BRAND.gold,
          fontSize: 90,
          fontWeight: 700,
          textAlign: "center",
          whiteSpace: "pre-wrap",
          lineHeight: 0.95,
          maxWidth: 860,
        },
        children: lines.join("\n"),
      },
    },
    {
      type: "div",
      props: {
        style: {
          marginTop: 20,
          color: BRAND.soft,
          fontSize: 42,
          textAlign: "center",
        },
        children: subtitle,
      },
    },
  ];

  if (logoDataUri) {
    children.push({
      type: "img",
      props: {
        src: logoDataUri,
        style: {
          position: "absolute",
          bottom: 170,
          width: 220,
          height: 220,
          objectFit: "contain",
        },
      },
    });
  }

  children.push({
    type: "div",
    props: {
      style: {
        position: "absolute",
        bottom: 92,
        color: "#fff",
        fontSize: 34,
        fontWeight: 600,
      },
      children: "vegan-masala.com",
    },
  });

  const element = {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Rajdhani",
        position: "relative",
      },
      children,
    },
  };

  const svg = await satori(element as any, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: "Rajdhani",
        data: FONT,
        weight: 700,
        style: "normal",
      },
    ],
  });

  await sharp(Buffer.from(svg)).png().toFile(out);
}

async function stillClip(image: string, out: string, duration: number) {
  const fadeOutStart = Math.max(duration - 1.1, 0.1);

  await run([
    "-y",
    "-loop",
    "1",
    "-i",
    image,
    "-t",
    String(duration),
    "-r",
    String(FPS),
    "-vf",
    `fade=t=in:st=0:d=1.1,fade=t=out:st=${fadeOutStart}:d=1.1,format=yuv420p`,
    "-c:v",
    "libx264",
    out,
  ]);
}

async function mainClip(image: string, out: string) {
  const filter = [

`[0:v]scale=1400:1400:force_original_aspect_ratio=increase,
crop=1400:1400,
gblur=sigma=22,
zoompan=z='1+0.08*(on/${MAIN_DURATION * FPS})':
x='(iw-1080)/2':
y='(ih-1920)/2':
d=1:s=1080x1920:fps=30[bg]`,

`color=c=black@0.28:s=1080x1920:d=${MAIN_DURATION}[shade]`,

// clean foreground scale
`[0:v]scale=980:980:force_original_aspect_ratio=decrease[fgbase]`,

// smooth slow zoom instead of zoompan
`[fgbase]scale=iw*1.04:ih*1.04[fgzoom]`,

// rounded mask
`[fgzoom]format=rgba,
geq=
lum='p(X,Y)':
a='if(lt(X,36)*lt(Y,36)*gt((36-X)*(36-X)+(36-Y)*(36-Y),36*36)
   + gt(X,W-36)*lt(Y,36)*gt((X-(W-36))*(X-(W-36))+(36-Y)*(36-Y),36*36)
   + lt(X,36)*gt(Y,H-36)*gt((36-X)*(36-X)+(Y-(H-36))*(Y-(H-36)),36*36)
   + gt(X,W-36)*gt(Y,H-36)*gt((X-(W-36))*(X-(W-36))+(Y-(H-36))*(Y-(H-36)),36*36),
   0,255)'
[fg]`,

`movie=public/brand/logo-flat.png,scale=180:-1[logo]`,

`[bg][shade]overlay=0:0[bgdark]`,

`[bgdark][fg]overlay=(W-w)/2:(H-h)/2[base]`,

`[base][logo]overlay=W-w-40:H-h-40,
fade=t=in:st=0:d=0.9,
fade=t=out:st=${MAIN_DURATION-0.9}:d=0.9,
format=yuv420p[outv]`

].join(";");

  await run([
    "-y",
    "-loop",
    "1",
    "-i",
    image,
    "-t",
    String(MAIN_DURATION),
    "-filter_complex",
    filter,
    "-map",
    "[outv]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    out,
  ]);
}

async function concat(intro: string, main: string, outro: string, final: string) {
  ensureDir(VIDEO_DIR);

  const tempVideo = path.join(TEMP_DIR, "video.mp4");
  const musicPath = path.join(ROOT, "public", "audio", "vegan-masala-bed.mp3");

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
    tempVideo,
  ]);

  if (!fs.existsSync(musicPath)) {
    fs.copyFileSync(tempVideo, final);
    return;
  }

  await run([
    "-y",
    "-i",
    tempVideo,
    "-stream_loop",
    "-1",
    "-i",
    musicPath,
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
    "-b:a",
    "128k",
    final,
  ]);
}

export async function buildRecipeVideo(slug: string) {
  ensureDir(VIDEO_DIR);
  ensureDir(TEMP_DIR);

  await generateInstagramBySlug(slug);

  const image = findImage(slug);

  if (!image) {
    throw new Error(`No generated Instagram image found for slug: ${slug}`);
  }

  const introPng = path.join(TEMP_DIR, "intro.png");
  const outroPng = path.join(TEMP_DIR, "outro.png");

  const introMp4 = path.join(TEMP_DIR, "intro.mp4");
  const mainMp4 = path.join(TEMP_DIR, "main.mp4");
  const outroMp4 = path.join(TEMP_DIR, "outro.mp4");

  const final = path.join(VIDEO_DIR, `${slug}.mp4`);

  await renderCard(titleFromSlug(slug), "Vegan Indian Recipe", introPng);
  await renderCard("Follow For More", "Vegan Indian Recipes", outroPng);

  await stillClip(introPng, introMp4, INTRO_DURATION);
  await mainClip(image, mainMp4);
  await stillClip(outroPng, outroMp4, OUTRO_DURATION);

  await concat(introMp4, mainMp4, outroMp4, final);

  return {
    success: true,
    video: final,
  };
}