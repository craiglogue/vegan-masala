const GRAPH_BASE = "https://graph.facebook.com/v23.0";

type PublishFacebookInput = {
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

async function metaPostForm(
  endpoint: string,
  body: Record<string, string>
): Promise<any> {
  const accessToken = getRequiredEnv("META_ACCESS_TOKEN");

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

  const pageId = getRequiredEnv("META_PAGE_ID");

  if (input.assetType === "video") {
    if (!input.videoUrl) {
      throw new Error("Facebook video URL missing");
    }

    const published = await metaPostForm(`/${pageId}/videos`, {
      file_url: input.videoUrl,
      description: input.caption || "",
      published: "true",
    });

    return {
      ok: true,
      assetType: "video" as const,
      pageId,
      videoUrl: input.videoUrl,
      videoId: published?.id || null,
      published,
    };
  }

  if (!input.imageUrl) {
    throw new Error("Facebook image URL missing");
  }

  const published = await metaPostForm(`/${pageId}/photos`, {
    url: input.imageUrl,
    caption: input.caption || "",
    published: "true",
  });

  return {
    ok: true,
    assetType: "image" as const,
    pageId,
    imageUrl: input.imageUrl,
    photoId: published?.id || null,
    postId: published?.post_id || null,
    published,
  };
}