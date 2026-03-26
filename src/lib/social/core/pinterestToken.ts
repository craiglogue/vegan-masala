import { Redis } from "@upstash/redis";

const KEY = "pinterest_token";

type PinterestTokenData = {
  access_token?: string;
  refresh_token?: string;
  response_type?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  scope?: string;
  refresh_token_expires_at?: string;
  saved_at?: number;
};

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

function getClientId() {
  return (
    process.env.PINTEREST_CLIENT_ID ||
    process.env.PINTEREST_APP_ID ||
    ""
  ).trim();
}

function getClientSecret() {
  return (
    process.env.PINTEREST_CLIENT_SECRET ||
    process.env.PINTEREST_APP_SECRET ||
    ""
  ).trim();
}

function basicAuth(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

function isAccessTokenStillFresh(token: PinterestTokenData | null) {
  if (!token?.access_token) return false;
  if (!token?.saved_at || !token?.expires_in) return true;

  const expiresAt = token.saved_at + token.expires_in * 1000;
  const now = Date.now();

  return expiresAt - now > 60_000;
}

export async function savePinterestToken(data: any) {
  const redis = getRedis();

  const tokenToSave: PinterestTokenData = {
    ...data,
    saved_at: Date.now(),
  };

  if (!redis) {
    console.warn("Pinterest token not saved (KV missing)");
    return false;
  }

  await redis.set(KEY, tokenToSave);
  return true;
}

export async function loadPinterestToken(): Promise<PinterestTokenData | null> {
  const redis = getRedis();

  if (!redis) {
    return null;
  }

  return (await redis.get(KEY)) as PinterestTokenData | null;
}

export async function refreshPinterestAccessToken() {
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("Pinterest client credentials missing");
  }

  const stored = await loadPinterestToken();
  const refreshToken =
    stored?.refresh_token ||
    process.env.PINTEREST_REFRESH_TOKEN ||
    "";

  if (!refreshToken) {
    throw new Error("Pinterest refresh token missing");
  }

  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "boards:read,boards:write,pins:read,pins:write",
    }).toString(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Pinterest refresh token exchange failed"
    );
  }

  const merged: PinterestTokenData = {
    ...stored,
    ...data,
    refresh_token: data?.refresh_token || stored?.refresh_token || refreshToken,
    saved_at: Date.now(),
  };

  await savePinterestToken(merged);

  return merged.access_token || null;
}

export async function getPinterestAccessToken() {
  try {
    const token = await loadPinterestToken();

    if (isAccessTokenStillFresh(token)) {
      return token?.access_token || null;
    }

    if (token?.refresh_token) {
      return await refreshPinterestAccessToken();
    }
  } catch {
    console.warn("Pinterest KV load/refresh failed");
  }

  if (process.env.PINTEREST_REFRESH_TOKEN) {
    try {
      return await refreshPinterestAccessToken();
    } catch {
      console.warn("Pinterest env refresh failed");
    }
  }

  if (process.env.PINTEREST_ACCESS_TOKEN) {
    return process.env.PINTEREST_ACCESS_TOKEN;
  }

  return null;
}