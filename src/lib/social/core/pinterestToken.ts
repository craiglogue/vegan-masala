import fs from "node:fs";
import path from "node:path";

export type PinterestTokenData = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  [key: string]: unknown;
};

function getTokenFilePath() {
  if (process.env.VERCEL) {
    return "/tmp/pinterest-token.json";
  }

  return path.join(process.cwd(), "generated", "pinterest-token.json");
}

export function loadPinterestToken(): PinterestTokenData | null {
  try {
    const file = getTokenFilePath();

    if (!fs.existsSync(file)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function savePinterestToken(data: PinterestTokenData) {
  const file = getTokenFilePath();

  if (process.env.VERCEL) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return file;
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}

export function getPinterestAccessToken() {
  const token = loadPinterestToken();
  return token?.access_token || null;
}