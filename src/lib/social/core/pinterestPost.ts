import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOKEN_FILE = path.join(ROOT, "generated", "pinterest-token.json");

function getAccessToken() {
  if (!fs.existsSync(TOKEN_FILE)) {
    throw new Error("Pinterest not connected");
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  const accessToken = tokenData?.access_token;

  if (!accessToken) {
    throw new Error("Pinterest access token missing");
  }

  return accessToken as string;
}

export async function postPinterestPin(input: {
  title: string;
  description: string;
  link: string;
  imagePath: string;
  boardId: string;
}) {
  const accessToken = getAccessToken();

  if (!input.boardId) {
    throw new Error("Pinterest board ID missing");
  }

  if (!fs.existsSync(input.imagePath)) {
    throw new Error(`Pinterest image not found: ${input.imagePath}`);
  }

  const imageBuffer = fs.readFileSync(input.imagePath);
  const imageBase64 = imageBuffer.toString("base64");

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: input.boardId,
      title: input.title,
      description: input.description,
      link: input.link,
      media_source: {
        source_type: "image_base64",
        content_type: "image/png",
        data: imageBase64,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.message || JSON.stringify(data) || "Pinterest post failed"
    );
  }

  return data;
}