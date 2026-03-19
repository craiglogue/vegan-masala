import { Redis } from "@upstash/redis";

const KEY = "pinterest_token";

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error("KV environment variables are missing");
  }

  return new Redis({
    url,
    token,
  });
}

export async function savePinterestToken(data: any) {
  const redis = getRedis();

  await redis.set(KEY, data);

  return true;
}

export async function loadPinterestToken() {
  const redis = getRedis();

  const token = await redis.get(KEY);

  return token;
}

export async function getPinterestAccessToken() {
  const token: any = await loadPinterestToken();

  if (!token) {
    return null;
  }

  return token.access_token || null;
}