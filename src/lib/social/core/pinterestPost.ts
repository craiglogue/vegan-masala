import fs from "node:fs";

export type PostPinterestPinInput = {
  title: string;
  description: string;
  link: string;
  imagePath: string;
  boardId: string;
};

type CachedPinterestToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedPinterestToken | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} missing`);
  }
  return value;
}

function basicAuth(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function refreshPinterestAccessToken(): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const clientId = getRequiredEnv("PINTEREST_CLIENT_ID");
  const clientSecret = getRequiredEnv("PINTEREST_CLIENT_SECRET");
  const refreshToken = getRequiredEnv("PINTEREST_REFRESH_TOKEN");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message ||
        data?.error_description ||
        data?.error ||
        "Pinterest token refresh failed"
    );
  }

  const accessToken = String(data?.access_token || "").trim();
  const expiresIn = Number(data?.expires_in || 0);

  if (!accessToken) {
    throw new Error("Pinterest token refresh returned no access token");
  }

  if (!expiresIn) {
    throw new Error("Pinterest token refresh returned no expires_in");
  }

  return { accessToken, expiresIn };
}

export async function getPinterestAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken;
  }

  const refreshToken = process.env.PINTEREST_REFRESH_TOKEN?.trim();
  const clientId = process.env.PINTEREST_CLIENT_ID?.trim();
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET?.trim();

  if (refreshToken && clientId && clientSecret) {
    const refreshed = await refreshPinterestAccessToken();

    cachedToken = {
      accessToken: refreshed.accessToken,
      expiresAt: now + refreshed.expiresIn * 1000,
    };

    return refreshed.accessToken;
  }

  return (
    process.env.PINTEREST_ACCESS_TOKEN?.trim() ||
    process.env.PINTEREST_TOKEN?.trim() ||
    ""
  );
}

function describePinterestError(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.code === "string") return `${fallback} (${data.code})`;
  return fallback;
}

function contentTypeFromPath(imagePath: string) {
  const lower = imagePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function postPinterestPin(input: PostPinterestPinInput) {
  const accessToken = await getPinterestAccessToken();

  if (!accessToken) {
    throw new Error("Pinterest access token missing");
  }

  if (!input.boardId) {
    throw new Error("Pinterest board ID missing");
  }

  if (!fs.existsSync(input.imagePath)) {
    throw new Error(`Pinterest image not found: ${input.imagePath}`);
  }

  const imageBuffer = fs.readFileSync(input.imagePath);
  const contentType = contentTypeFromPath(input.imagePath);
  const imageBase64 = imageBuffer.toString("base64");

  const body = {
    board_id: input.boardId,
    title: input.title || "",
    description: input.description || "",
    link: input.link || "",
    media_source: {
      source_type: "image_base64",
      content_type: contentType,
      data: imageBase64,
    },
  };

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      describePinterestError(data, "Pinterest pin creation failed")
    );
  }

  return data;
}
