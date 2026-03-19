import fs from "node:fs";
import path from "node:path";

const GRAPH_BASE = "https://graph.facebook.com/v23.0";

export type MetaPlatform = "instagram" | "facebook";

export type MetaConfig = {
  appId: string;
  appSecret: string;
  accessToken: string;
  igUserId: string;
  pageId: string;
};

export function getMetaConfig(): MetaConfig {
  const appId = process.env.META_APP_ID || "";
  const appSecret = process.env.META_APP_SECRET || "";
  const accessToken = process.env.META_ACCESS_TOKEN || "";
  const igUserId = process.env.META_IG_USER_ID || "";
  const pageId = process.env.META_PAGE_ID || "";

  return {
    appId,
    appSecret,
    accessToken,
    igUserId,
    pageId,
  };
}

export function assertMetaConfig(
  platform: MetaPlatform,
  config = getMetaConfig()
): MetaConfig {
  if (!config.appId) {
    throw new Error("META_APP_ID missing");
  }

  if (!config.appSecret) {
    throw new Error("META_APP_SECRET missing");
  }

  if (!config.accessToken) {
    throw new Error("META_ACCESS_TOKEN missing");
  }

  if (platform === "instagram" && !config.igUserId) {
    throw new Error("META_IG_USER_ID missing");
  }

  if (platform === "facebook" && !config.pageId) {
    throw new Error("META_PAGE_ID missing");
  }

  return config;
}

export function buildGraphUrl(
  endpoint: string,
  query?: Record<string, string | number | boolean | undefined | null>
): string {
  const url = new URL(
    endpoint.startsWith("http") ? endpoint : `${GRAPH_BASE}${endpoint}`
  );

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function metaGet<T = any>(
  endpoint: string,
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const { accessToken } = assertMetaConfig("facebook");

  const url = buildGraphUrl(endpoint, {
    ...query,
    access_token: accessToken,
  });

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(readMetaError(data, "Meta GET request failed"));
  }

  return data as T;
}

export async function metaPostForm<T = any>(
  endpoint: string,
  body: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const { accessToken } = assertMetaConfig("facebook");

  const form = new URLSearchParams();

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    form.set(key, String(value));
  }

  form.set("access_token", accessToken);

  const res = await fetch(buildGraphUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(readMetaError(data, "Meta POST request failed"));
  }

  return data as T;
}

export function readMetaError(data: any, fallback: string): string {
  const error = data?.error;

  if (!error) return fallback;

  const parts = [
    error.message,
    error.type ? `type=${error.type}` : "",
    error.code ? `code=${error.code}` : "",
    error.error_subcode ? `subcode=${error.error_subcode}` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : fallback;
}

export function publicAssetUrl(relativePath: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const normalized = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${siteUrl}${normalized}`;
}

export function ensureFileExists(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return filePath;
}

export function relativePublicPathFromAbsolute(filePath: string): string {
  const root = process.cwd();
  const publicDir = path.join(root, "public");

  if (filePath.startsWith(publicDir)) {
    return filePath.replace(publicDir, "");
  }

  throw new Error(
    `Expected file inside public directory so Meta can fetch it by URL: ${filePath}`
  );
}

export function toPublicUrlFromAbsolute(filePath: string): string {
  const relative = relativePublicPathFromAbsolute(filePath);
  return publicAssetUrl(relative);
}

export async function verifyMetaConnection(): Promise<{
  ok: true;
  facebookPageId?: string;
  instagramUserId?: string;
}> {
  const config = getMetaConfig();

  if (!config.accessToken) {
    throw new Error("META_ACCESS_TOKEN missing");
  }

  return {
    ok: true,
    facebookPageId: config.pageId || undefined,
    instagramUserId: config.igUserId || undefined,
  };
}