const GRAPH_BASE = "https://graph.facebook.com/v23.0";

type PublishInstagramInput = {
  slug: string;
  caption: string;
  assetType: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} missing`);
  }
  return value;
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

async function waitForVideoContainer(containerId: string, accessToken: string) {
  for (let i = 0; i < 20; i++) {
    const status = await graphGet(
      `${GRAPH_BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`
    );

    const code = String(status?.status_code || status?.status || "").toUpperCase();

    if (code === "FINISHED" || code === "PUBLISHED") {
      return;
    }

    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error("Instagram video container failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Instagram video container timed out");
}

export async function publishInstagram(input: PublishInstagramInput) {
  const slug = input.slug.trim();

  if (!slug) {
    throw new Error("Instagram publish slug missing");
  }

  const accessToken = getRequiredEnv("META_ACCESS_TOKEN");
  const igUserId =
    process.env.META_IG_USER_ID ||
    process.env.INSTAGRAM_BUSINESS_ID ||
    "";

  if (!igUserId) {
    throw new Error("META_IG_USER_ID missing");
  }

  if (input.assetType === "video") {
    if (!input.videoUrl) {
      throw new Error("Instagram video URL missing");
    }

    const container = await graphPost(`/${igUserId}/media`, {
      media_type: "REELS",
      video_url: input.videoUrl,
      caption: input.caption || "",
      access_token: accessToken,
    });

    if (!container?.id) {
      throw new Error("Instagram video container creation failed");
    }

    await waitForVideoContainer(container.id, accessToken);

    const published = await graphPost(`/${igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: accessToken,
    });

    return {
      ok: true,
      assetType: "video" as const,
      videoUrl: input.videoUrl,
      containerId: container.id,
      published,
    };
  }

  if (!input.imageUrl) {
    throw new Error("Instagram image URL missing");
  }

  const container = await graphPost(`/${igUserId}/media`, {
    image_url: input.imageUrl,
    caption: input.caption || "",
    access_token: accessToken,
  });

  if (!container?.id) {
    throw new Error("Instagram image container creation failed");
  }

  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: accessToken,
  });

  return {
    ok: true,
    assetType: "image" as const,
    imageUrl: input.imageUrl,
    containerId: container.id,
    published,
  };
}