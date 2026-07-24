import { generatePinterestBySlug } from "@/lib/social/generatePinterest";
import { getPinterestAccessToken } from "@/lib/social/core/pinterestToken";
import { assertSocialPublishPreflight } from "@/lib/social/core/publishPreflight";

type PublishPinterestInput = {
  slug: string;
  title?: string;
  caption: string;
  url?: string;
  board?: string | null;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} missing`);
  }

  return value;
}

function getSiteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

async function pinterestPost(input: {
  imageUrl: string;
  title: string;
  description: string;
  link: string;
  boardId: string;
}) {
  const accessToken =
    (await getPinterestAccessToken()) ||
    process.env.PINTEREST_ACCESS_TOKEN ||
    "";

  if (!accessToken) {
    throw new Error("Pinterest not connected");
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
        source_type: "image_url",
        url: input.imageUrl,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || "Pinterest publish failed"
    );
  }

  return data;
}

export async function publishPinterest(input: PublishPinterestInput) {
  const slug = input.slug.trim();

  if (!slug) {
    throw new Error("Pinterest slug missing");
  }

  const generated = await generatePinterestBySlug(slug);
  const imageUrl = generated.image;

  if (!imageUrl) {
    throw new Error("Pinterest image URL missing");
  }

  const boardId =
    input.board?.trim() || process.env.PINTEREST_DEFAULT_BOARD || "";

  if (!boardId) {
    throw new Error("Pinterest board missing");
  }

  const link =
    input.url?.trim() || `${getRequiredEnv("NEXT_PUBLIC_SITE_URL")}/recipes/${slug}`;

  const preflight = assertSocialPublishPreflight({
    platform: "pinterest",
    slug,
    stage: "publish",
    assetType: "image",
    imageUrl,
    publishImageUrl: imageUrl,
    board: boardId,
    baseUrl: getSiteBase(),
  });

  const result = await pinterestPost({
    imageUrl: preflight.normalized.publishImageUrl || preflight.normalized.imageUrl,
    title: input.title?.trim() || generated.slug || slug,
    description: input.caption || "",
    link,
    boardId: preflight.normalized.board || boardId,
  });

  return {
    ok: true,
    imageUrl: preflight.normalized.publishImageUrl || preflight.normalized.imageUrl,
    pinId: result?.id || null,
    result,
  };
}