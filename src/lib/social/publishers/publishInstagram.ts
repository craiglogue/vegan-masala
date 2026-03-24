import { generateInstagramBySlug } from "@/lib/social/generateInstagram";

const GRAPH_BASE = "https://graph.facebook.com/v23.0";

type PublishInstagramInput = {
  slug: string;
  caption: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} missing`);
  }
  return value;
}

function describeMetaError(data: any, fallback: string) {
  const err = data?.error ?? data ?? {};
  const parts = [
    err?.message || fallback,
    err?.type ? `type=${err.type}` : "",
    err?.code ? `code=${err.code}` : "",
    err?.error_subcode ? `subcode=${err.error_subcode}` : "",
    err?.error_user_title ? `title=${err.error_user_title}` : "",
    err?.error_user_msg ? `user_msg=${err.error_user_msg}` : "",
    err?.fbtrace_id ? `fbtrace_id=${err.fbtrace_id}` : "",
  ].filter(Boolean);

  return parts.join(" | ");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const rawText = await res.text();

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { raw: rawText };
  }

  if (!res.ok) {
    console.error("META POST ERROR:", {
      endpoint,
      status: res.status,
      body,
      data,
    });

    throw new Error(
      describeMetaError(data, `Meta POST failed (${res.status})`)
    );
  }

  return data;
}

async function metaGet(endpoint: string): Promise<any> {
  const accessToken = getRequiredEnv("META_ACCESS_TOKEN");

  const res = await fetch(
    `${GRAPH_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`,
    { cache: "no-store" }
  );

  const rawText = await res.text();

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { raw: rawText };
  }

  if (!res.ok) {
    console.error("META GET ERROR:", {
      endpoint,
      status: res.status,
      data,
    });

    throw new Error(
      describeMetaError(data, `Meta GET failed (${res.status})`)
    );
  }

  return data;
}

async function verifyInstagramAccount(igUserId: string) {
  return metaGet(`/${igUserId}?fields=id,username`);
}

async function checkInstagramPublishingLimitSoft(igUserId: string) {
  try {
    const data = await metaGet(`/${igUserId}?fields=content_publishing_limit`);
    const usage = data?.content_publishing_limit?.quota_usage;

    if (typeof usage === "number" && usage >= 25) {
      throw new Error("Instagram publishing limit reached");
    }
  } catch (err: any) {
    console.warn("INSTAGRAM LIMIT CHECK WARNING:", err?.message || err);
  }
}

async function waitForContainerReady(creationId: string) {
  const maxAttempts = 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await metaGet(
        `/${creationId}?fields=id,status_code,status`
      );

      console.log("INSTAGRAM CONTAINER STATUS:", {
        attempt,
        data,
      });

      const statusCode = data?.status_code || data?.status;

      if (
        statusCode === "FINISHED" ||
        statusCode === "PUBLISHED" ||
        statusCode === "READY"
      ) {
        return data;
      }

      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        throw new Error(
          `Instagram media container not publishable: ${JSON.stringify(data)}`
        );
      }
    } catch (err: any) {
      console.warn(
        `INSTAGRAM CONTAINER POLL WARNING attempt ${attempt}:`,
        err?.message || err
      );
    }

    await sleep(3000);
  }

  return null;
}

export async function publishInstagram(input: PublishInstagramInput) {
  const slug = input.slug.trim();

  if (!slug) {
    throw new Error("Instagram publish slug missing");
  }

  const igUserId = getRequiredEnv("META_IG_USER_ID");

  console.log("INSTAGRAM PUBLISH DEBUG:", {
    slug,
    igUserId,
    hasAccessToken: Boolean(process.env.META_ACCESS_TOKEN),
  });

  const accountInfo = await verifyInstagramAccount(igUserId);

  console.log("INSTAGRAM ACCOUNT DEBUG:", accountInfo);

  const generated = await generateInstagramBySlug(slug);
  const imageUrl = generated.image;

  console.log("INSTAGRAM ASSET DEBUG:", {
    slug,
    imageUrl,
    storage: generated.storage,
    path: generated.path,
  });

  if (!imageUrl) {
    throw new Error("Generated Instagram image URL missing");
  }

  await checkInstagramPublishingLimitSoft(igUserId);

  const container = await metaPostForm(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption: input.caption || "",
  });

  console.log("INSTAGRAM CONTAINER DEBUG:", container);

  const creationId = container?.id;

  if (!creationId) {
    throw new Error(
      `Instagram media container ID missing: ${JSON.stringify(container)}`
    );
  }

  await waitForContainerReady(creationId);

  const published = await metaPostForm(`/${igUserId}/media_publish`, {
    creation_id: creationId,
  });

  console.log("INSTAGRAM PUBLISH RESULT:", published);

  return {
    ok: true,
    accountInfo,
    imageUrl,
    containerId: creationId,
    published,
  };
}