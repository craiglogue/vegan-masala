const GRAPH_BASE = "https://graph.facebook.com/v23.0";

import { assertSocialPublishPreflight } from "@/lib/social/core/publishPreflight";
import { resolveInstagramMetaAuth } from "@/lib/social/publishers/metaCore";

type PublishInstagramInput = {
  slug: string;
  caption: string;
  assetType: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
};

function cleanMediaUrl(url?: string) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return String(url).split("?")[0].split("#")[0];
  }
}

function getPublicSiteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

function absolutizeMediaUrl(url?: string) {
  const cleaned = cleanMediaUrl(url);
  if (!cleaned) return "";
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return cleaned;
  return `${getPublicSiteBase()}${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
}

async function graphGet(url: string) {
  const res = await fetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error?.message || "Instagram GET failed");
  }

  return data;
}

async function graphPost(endpoint: string, body: Record<string, string>) {
  const form = new URLSearchParams();

  Object.entries(body).forEach(([key, value]) => {
    form.set(key, value);
  });

  const res = await fetch(`${GRAPH_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error?.message || "Instagram POST failed");
  }

  return data;
}

async function waitForInstagramContainer(
  containerId: string,
  accessToken: string,
  kind: "image" | "video"
) {
  for (let i = 0; i < 20; i++) {
    const status = await graphGet(
      `${GRAPH_BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`
    );

    const code = String(status?.status_code || status?.status || "").toUpperCase();

    if (!code) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    if (code === "FINISHED" || code === "PUBLISHED") {
      return;
    }

    if (code === "IN_PROGRESS") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`Instagram ${kind} container failed`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Instagram ${kind} container timed out`);
}

export async function publishInstagram(input: PublishInstagramInput) {
  const slug = input.slug.trim();

  if (!slug) {
    throw new Error("Instagram publish slug missing");
  }

  const { accessToken, igUserId } = resolveInstagramMetaAuth();

  const preflight = assertSocialPublishPreflight({
    platform: "instagram",
    slug,
    stage: "publish",
    assetType: input.assetType,
    imageUrl: input.imageUrl,
    publishImageUrl: input.imageUrl,
    videoUrl: input.videoUrl,
    baseUrl: getPublicSiteBase(),
  });

  if (input.assetType === "video") {
    const safeVideoUrl = cleanMediaUrl(preflight.normalized.videoUrl || input.videoUrl);

    if (!safeVideoUrl) {
      throw new Error("Instagram video URL missing");
    }

    const container = await graphPost(`/${igUserId}/media`, {
      media_type: "REELS",
      video_url: safeVideoUrl,
      caption: input.caption || "",
      access_token: accessToken,
    });

    if (!container?.id) {
      throw new Error("Instagram video container creation failed");
    }

    await waitForInstagramContainer(container.id, accessToken, "video");

    const published = await graphPost(`/${igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: accessToken,
    });

    return {
      ok: true,
      assetType: "video" as const,
      videoUrl: safeVideoUrl,
      containerId: container.id,
      published,
    };
  }

  const fallbackImageUrl = absolutizeMediaUrl(
    preflight.normalized.publishImageUrl || preflight.normalized.imageUrl || input.imageUrl
  );
  const safeImageUrl = fallbackImageUrl;

  if (!safeImageUrl) {
    throw new Error("Instagram image URL missing");
  }

  console.log("INSTAGRAM IMAGE URL:", safeImageUrl);

  const container = await graphPost(`/${igUserId}/media`, {
    image_url: safeImageUrl,
    caption: input.caption || "",
    access_token: accessToken,
  });

  if (!container?.id) {
    throw new Error("Instagram image container creation failed");
  }

  await waitForInstagramContainer(container.id, accessToken, "image");

  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: accessToken,
  });

  return {
    ok: true,
    assetType: "image" as const,
    imageUrl: safeImageUrl,
    containerId: container.id,
    published,
  };
}