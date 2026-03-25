import fs from "node:fs";

export type PostPinterestPinInput = {
  title: string;
  description: string;
  link: string;
  imagePath: string;
  boardId: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} missing`);
  }
  return value;
}

export async function getPinterestAccessToken(): Promise<string> {
  return (
    process.env.PINTEREST_ACCESS_TOKEN ||
    process.env.PINTEREST_TOKEN ||
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

  const form = new FormData();
  form.append("board_id", input.boardId);
  form.append("title", input.title || "");
  form.append("description", input.description || "");
  form.append("link", input.link || "");

  const imageBuffer = fs.readFileSync(input.imagePath);
  const imageBlob = new Blob([imageBuffer], { type: "image/png" });
  form.append("media_source", imageBlob, "pin.png");

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      describePinterestError(data, "Pinterest pin creation failed")
    );
  }

  return data;
}