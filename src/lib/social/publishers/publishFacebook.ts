import fs from "node:fs";
import path from "node:path";

import { generateInstagramBySlug } from "@/lib/social/generateInstagram";

const ROOT = process.cwd();
const GRAPH_BASE = "https://graph.facebook.com/v23.0";

type PublishFacebookInput = {
  slug: string;
  caption: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} missing`);
  }
  return value;
}

function getSiteUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL missing");
  }

  return siteUrl.replace(/\/$/, "");
}

function getFacebookImagePath(slug: string): string {
  return path.join(ROOT, "public", "generated", "instagram", `${slug}.png`);
}

function ensureFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

function buildPublicImageUrl(slug: string): string {
  return `${getSiteUrl()}/generated/instagram/${slug}.png`;
}

async function metaPostForm(
  endpoint: string,
  body: Record<string, string>
): Promise<any> {
  const accessToken = getRequiredEnv("META_ACCESS_TOKEN");

  const form = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    form.set(key, value);
  });
  form.set("access_token", accessToken);

  const res = await fetch(`${GRAPH_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Meta POST failed");
  }

  return data;
}

export async function publishFacebook(input: PublishFacebookInput) {
  if (!input.slug.trim()) {
    throw new Error("Facebook publish slug missing");
  }

  const pageId = getRequiredEnv("META_PAGE_ID");

  await generateInstagramBySlug(input.slug);

  const imagePath = getFacebookImagePath(input.slug);
  ensureFileExists(imagePath);

  const imageUrl = buildPublicImageUrl(input.slug);

  const published = await metaPostForm(`/${pageId}/photos`, {
    url: imageUrl,
    caption: input.caption || "",
    published: "true",
  });

  return published;
}