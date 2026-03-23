import fs from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";

const LOCAL_PUBLIC_GENERATED_DIR = path.join(
  process.cwd(),
  "public",
  "generated"
);

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export async function saveGeneratedInstagramImage(
  slug: string,
  buffer: Buffer
) {
  if (process.env.VERCEL) {
    const blob = await put(`instagram/${slug}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN,
    });

    return {
      url: blob.url,
      storage: "blob" as const,
      path: blob.pathname,
    };
  }

  const dir = path.join(LOCAL_PUBLIC_GENERATED_DIR, "instagram");
  ensureDir(dir);

  const localFile = path.join(dir, `${slug}.png`);
  fs.writeFileSync(localFile, buffer);

  return {
    url: `/generated/instagram/${slug}.png?v=${Date.now()}`,
    storage: "local" as const,
    path: localFile,
  };
}