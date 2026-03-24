import { Redis } from "@upstash/redis";

const KEY = "pinterest_token";

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

export async function savePinterestToken(data: any) {
  const redis = getRedis();

  if (!redis) {
    console.warn("Pinterest token not saved (KV missing)");
    return false;
  }

  await redis.set(KEY, data);

  return true;
}

export async function loadPinterestToken() {
  const redis = getRedis();

  if (!redis) {
    return null;
  }

  return await redis.get(KEY);
}

export async function getPinterestAccessToken() {
  // Try KV first
  try {
    const token: any = await loadPinterestToken();

    if (token?.access_token) {
      return token.access_token;
    }
  } catch {
    console.warn("Pinterest KV load failed");
  }

  // Fallback to ENV (like Instagram)
  if (process.env.PINTEREST_ACCESS_TOKEN) {
    return process.env.PINTEREST_ACCESS_TOKEN;
  }

  return null;
}