import fs from "node:fs";
import { getPinterestAccessToken } from "@/lib/social/core/pinterestToken";

type PostPinterestPinInput = {
  title: string;
  description: string;
  link: string;
  imagePath: string;
  boardId: string;
};

function ensureFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Pinterest image not found: ${filePath}`);
  }
}

async function uploadMedia(imagePath: string) {
  const accessToken = await getPinterestAccessToken();

  if (!accessToken) {
    throw new Error("Pinterest not connected");
  }

  ensureFileExists(imagePath);

  const form = new FormData();
  const fileBuffer = fs.readFileSync(imagePath);
  const blob = new Blob([fileBuffer], { type: "image/png" });

  form.append("media_type", "image");
  form.append("file", blob, "pin-image.png");

  const res = await fetch("https://api.pinterest.com/v5/media", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Pinterest media upload failed");
  }

  return data;
}

export async function postPinterestPin(input: PostPinterestPinInput) {
  const accessToken = getPinterestAccessToken();

  if (!accessToken) {
    throw new Error("Pinterest not connected");
  }

  const media = await uploadMedia(input.imagePath);
  const mediaId = media?.id;

  if (!mediaId) {
    throw new Error("Pinterest media ID missing");
  }

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
        data: fs.readFileSync(input.imagePath).toString("base64"),
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Pinterest pin creation failed");
  }

  return data;
}