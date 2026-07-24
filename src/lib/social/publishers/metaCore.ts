import fs from "node:fs";
import path from "node:path";

const GRAPH_BASE = "https://graph.facebook.com/v23.0";

export type MetaPlatform = "instagram" | "facebook";

export type MetaConfig = {
  appId: string;
  appSecret: string;
  accessToken: string;
  pageAccessToken: string;
  igUserId: string;
  pageId: string;
};

export type MetaConfigValidation = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

export type MetaAuthDiagnostics = {
  present: {
    META_ACCESS_TOKEN: boolean;
    META_PAGE_ACCESS_TOKEN: boolean;
    META_IG_USER_ID: boolean;
    INSTAGRAM_BUSINESS_ID: boolean;
    META_PAGE_ID: boolean;
    META_APP_ID: boolean;
    META_APP_SECRET: boolean;
  };
  tokenInfo: {
    metaAccessTokenLength: number;
    metaPageAccessTokenLength: number;
    usingFacebookPageAccessToken: boolean;
  };
  warnings: string[];
};

function trim(value?: string) {
  return String(value || "").trim();
}

function formatMetaConfigError(missing: string[]) {
  if (!missing.length) {
    return "META_CONFIG_ERROR: Missing Meta configuration";
  }

  return ["META_CONFIG_ERROR:", ...missing.map((name) => `Missing ${name}`)].join("\n");
}

export function getMetaConfig(): MetaConfig {
  const appId = trim(process.env.META_APP_ID);
  const appSecret = trim(process.env.META_APP_SECRET);
  const accessToken = trim(process.env.META_ACCESS_TOKEN);
  const pageAccessToken = trim(process.env.META_PAGE_ACCESS_TOKEN);
  const igUserId =
    trim(process.env.META_IG_USER_ID) || trim(process.env.INSTAGRAM_BUSINESS_ID);
  const pageId = trim(process.env.META_PAGE_ID);

  return {
    appId,
    appSecret,
    accessToken,
    pageAccessToken,
    igUserId,
    pageId,
  };
}

export function validateMetaConfig(
  platform: MetaPlatform,
  config = getMetaConfig()
): MetaConfigValidation {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (platform === "instagram") {
    if (!config.accessToken) {
      missing.push("META_ACCESS_TOKEN");
    }

    if (!config.igUserId) {
      missing.push("META_IG_USER_ID");
    }

    if (!trim(process.env.META_IG_USER_ID) && trim(process.env.INSTAGRAM_BUSINESS_ID)) {
      warnings.push("Using INSTAGRAM_BUSINESS_ID fallback. Prefer META_IG_USER_ID.");
    }
  }

  if (platform === "facebook") {
    if (!config.pageAccessToken && !config.accessToken) {
      missing.push("META_PAGE_ACCESS_TOKEN");
      missing.push("META_ACCESS_TOKEN");
    }

    if (!config.pageId) {
      missing.push("META_PAGE_ID");
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}

export function getMetaAuthDiagnostics(config = getMetaConfig()): MetaAuthDiagnostics {
  const warnings: string[] = [];

  if (!trim(process.env.META_IG_USER_ID) && trim(process.env.INSTAGRAM_BUSINESS_ID)) {
    warnings.push("Using INSTAGRAM_BUSINESS_ID fallback. Prefer META_IG_USER_ID.");
  }

  if (!config.accessToken && config.pageAccessToken) {
    warnings.push("META_ACCESS_TOKEN missing; Instagram publishing will fail.");
  }

  return {
    present: {
      META_ACCESS_TOKEN: Boolean(config.accessToken),
      META_PAGE_ACCESS_TOKEN: Boolean(config.pageAccessToken),
      META_IG_USER_ID: Boolean(trim(process.env.META_IG_USER_ID)),
      INSTAGRAM_BUSINESS_ID: Boolean(trim(process.env.INSTAGRAM_BUSINESS_ID)),
      META_PAGE_ID: Boolean(config.pageId),
      META_APP_ID: Boolean(config.appId),
      META_APP_SECRET: Boolean(config.appSecret),
    },
    tokenInfo: {
      metaAccessTokenLength: config.accessToken.length,
      metaPageAccessTokenLength: config.pageAccessToken.length,
      usingFacebookPageAccessToken: Boolean(config.pageAccessToken),
    },
    warnings,
  };
}

export function assertMetaConfig(
  platform: MetaPlatform,
  config = getMetaConfig()
): MetaConfig {
  const validation = validateMetaConfig(platform, config);

  if (!validation.ok) {
    throw new Error(formatMetaConfigError(validation.missing));
  }

  return config;
}

export function resolveInstagramMetaAuth(config = getMetaConfig()) {
  const validated = assertMetaConfig("instagram", config);

  return {
    accessToken: validated.accessToken,
    igUserId: validated.igUserId,
  };
}

export function resolveFacebookMetaAuth(config = getMetaConfig()) {
  const validated = assertMetaConfig("facebook", config);

  return {
    accessToken: validated.pageAccessToken || validated.accessToken,
    pageId: validated.pageId,
  };
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
  const { accessToken } = resolveFacebookMetaAuth();

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
  const { accessToken } = resolveFacebookMetaAuth();

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
  warnings?: string[];
}> {
  const config = getMetaConfig();
  const instagram = validateMetaConfig("instagram", config);
  const facebook = validateMetaConfig("facebook", config);

  if (!instagram.ok && !facebook.ok) {
    throw new Error(
      formatMetaConfigError([
        ...new Set([...instagram.missing, ...facebook.missing]),
      ])
    );
  }

  const warnings = [...instagram.warnings, ...facebook.warnings];

  return {
    ok: true,
    facebookPageId: config.pageId || undefined,
    instagramUserId: config.igUserId || undefined,
    warnings,
  };
}