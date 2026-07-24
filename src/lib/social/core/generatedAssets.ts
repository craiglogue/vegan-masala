import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { put } from "@vercel/blob";

const LOCAL_PUBLIC_GENERATED_DIR = path.join(
  process.cwd(),
  "public",
  "generated"
);

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

function hasBlobToken() {
  return Boolean(getBlobToken());
}

function getSiteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

async function toInstagramJpeg(buffer: Buffer) {
  return sharp(buffer)
    .flatten({ background: "#000000" })
    .jpeg({
      quality: 92,
      mozjpeg: true,
    })
    .toBuffer();
}

export async function saveGeneratedInstagramImage(
  slug: string,
  buffer: Buffer
) {
  const jpegBuffer = await toInstagramJpeg(buffer);
  const stamp = Date.now();

  const dir = path.join(LOCAL_PUBLIC_GENERATED_DIR, "instagram");
  ensureDir(dir);

  const localFile = path.join(dir, `${slug}-${stamp}.jpg`);
  fs.writeFileSync(localFile, jpegBuffer);

  const localUrl = `/generated/instagram/${slug}-${stamp}.jpg?v=${Date.now()}`;

  let blobUrl = "";
  let blobPath = "";

  if (hasBlobToken()) {
    const token = getBlobToken();

    const blob = await put(`instagram/${slug}-${stamp}.jpg`, jpegBuffer, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: false,
      token,
    });

    blobUrl = blob.url;
    blobPath = blob.pathname;
  }

  return {
    url: process.env.VERCEL ? (blobUrl || `${getSiteBase()}${localUrl}`) : localUrl,
    publishUrl: blobUrl || `${getSiteBase()}${localUrl.split("?")[0]}`,
    storage: blobUrl ? ("blob" as const) : ("local" as const),
    path: blobPath || localFile,
  };
}

export async function saveGeneratedPinterestImage(
  slug: string,
  buffer: Buffer
) {
  if (hasBlobToken()) {
    const token = getBlobToken();

    const blob = await put(`pinterest/${slug}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });

    return {
      url: blob.url,
      storage: "blob" as const,
      path: blob.pathname,
    };
  }

  const dir = path.join(LOCAL_PUBLIC_GENERATED_DIR, "pinterest");
  ensureDir(dir);

  const localFile = path.join(dir, `${slug}.png`);
  fs.writeFileSync(localFile, buffer);

  return {
    url: `/generated/pinterest/${slug}.png?v=${Date.now()}`,
    storage: "local" as const,
    path: localFile,
  };
}

export async function saveGeneratedVideo(slug: string, buffer: Buffer) {
  if (hasBlobToken()) {
    const token = getBlobToken();

    const blob = await put(`videos/${slug}.mp4`, buffer, {
      access: "public",
      contentType: "video/mp4",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });

    return {
      url: blob.url,
      storage: "blob" as const,
      path: blob.pathname,
    };
  }

  const dir = path.join(LOCAL_PUBLIC_GENERATED_DIR, "video");
  ensureDir(dir);

  const localFile = path.join(dir, `${slug}.mp4`);
  fs.writeFileSync(localFile, buffer);

  return {
    url: `/generated/video/${slug}.mp4?v=${Date.now()}`,
    storage: "local" as const,
    path: localFile,
  };
}