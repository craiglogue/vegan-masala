const GRAPH_BASE = "https://graph.facebook.com/v23.0";

import { assertSocialPublishPreflight } from "@/lib/social/core/publishPreflight";
import { resolveFacebookMetaAuth } from "@/lib/social/publishers/metaCore";

type PublishFacebookInput = {
  slug: string;
  caption: string;
  assetType: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
};

function getSiteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

async function metaPostForm(
  endpoint: string,
  body: Record<string, string>,
  accessToken: string
): Promise<any> {
  const form = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    form.set(key, value);
  });
  form.set("access_token", accessToken);

  const res = await fetch(`${GRAPH_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const metaMessage =
      data?.error?.message ||
      data?.message ||
      `Meta POST failed for ${endpoint}`;

    throw new Error(metaMessage);
  }

  return data;
}

export async function publishFacebook(input: PublishFacebookInput) {
  const slug = input.slug.trim();

  if (!slug) {
    throw new Error("Facebook publish slug missing");
  }

  const preflight = assertSocialPublishPreflight({
    platform: "facebook",
    slug,
    stage: "publish",
    assetType: input.assetType,
    imageUrl: input.imageUrl,
    publishImageUrl: input.imageUrl,
    videoUrl: input.videoUrl,
    baseUrl: getSiteBase(),
  });

  const { accessToken, pageId } = resolveFacebookMetaAuth();

  if (input.assetType === "video") {
    const safeVideoUrl = preflight.normalized.videoUrl || input.videoUrl || "";

    if (!safeVideoUrl) {
      throw new Error("Facebook video URL missing");
    }

    const published = await metaPostForm(`/${pageId}/videos`, {
      file_url: safeVideoUrl,
      description: input.caption || "",
      published: "true",
    }, accessToken);

    return {
      ok: true,
      assetType: "video" as const,
      pageId,
      videoUrl: safeVideoUrl,
      videoId: published?.id || null,
      published,
    };
  }

  const safeImageUrl =
    preflight.normalized.publishImageUrl ||
    preflight.normalized.imageUrl ||
    input.imageUrl ||
    "";

  if (!safeImageUrl) {
    throw new Error("Facebook image URL missing");
  }

  const published = await metaPostForm(`/${pageId}/photos`, {
    url: safeImageUrl,
    caption: input.caption || "",
    published: "true",
  }, accessToken);

  return {
    ok: true,
    assetType: "image" as const,
    pageId,
    imageUrl: safeImageUrl,
    photoId: published?.id || null,
    postId: published?.post_id || null,
    published,
  };
}