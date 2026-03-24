import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

import { generateInstagramBySlug } from "@/lib/social/generateInstagram";
import { generatePinterestBySlug } from "@/lib/social/generatePinterest";

import {
  addQueueItem,
  readQueue,
  writeQueue,
  type QueueAssetType,
  type QueueContentType,
  type QueuePlatform,
} from "@/lib/social/core/queue";

import {
  titleFromSlug,
  detectContentTypeBySlug,
} from "@/lib/social/core/content";

import {
  buildInstagramCaption,
  buildPinterestCaption,
} from "@/lib/social/core/captions";

import { contentUrl } from "@/lib/social/core/urls";

function buildCaptionForPlatform(
  platform: QueuePlatform,
  slug: string,
  type: QueueContentType
) {
  if (platform === "pinterest") {
    return buildPinterestCaption(slug, type);
  }

  if (platform === "instagram" || platform === "facebook") {
    return buildInstagramCaption(slug, type);
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN ||
    ""
  );
}

function getSiteBaseUrl() {
  return (
    process.env.SOCIAL_ASSET_BASE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

async function findBlobUrl(pathname: string): Promise<string | null> {
  const token = getBlobToken();
  if (!token) return null;

  try {
    const result = await list({
      token,
      prefix: pathname,
    });

    const exact = result.blobs.find((blob) => blob.pathname === pathname);
    return exact?.url ?? null;
  } catch {
    return null;
  }
}

async function resolveAssetUrls(
  slug: string,
  type: QueueContentType,
  platform: QueuePlatform
) {
  const siteBase = getSiteBaseUrl();

  let generatedInstagramImageUrl: string | null = null;
  let generatedPinterestImageUrl: string | null = null;

  if (platform === "instagram" || platform === "facebook") {
    try {
      const generated = await generateInstagramBySlug(slug);
      generatedInstagramImageUrl = generated.image ?? null;
    } catch (err) {
      console.warn(
        "Failed to pre-generate Instagram asset for queue:",
        slug,
        err
      );
    }
  }

  if (platform === "pinterest") {
    try {
      const generated = await generatePinterestBySlug(slug);
      generatedPinterestImageUrl = generated.image ?? null;
    } catch (err) {
      console.warn(
        "Failed to pre-generate Pinterest asset for queue:",
        slug,
        err
      );
    }
  }

  const instagramImageUrl =
    generatedInstagramImageUrl ||
    (await findBlobUrl(`instagram/${slug}.jpg`)) ||
    `${siteBase}/generated/instagram/${slug}.jpg`;

  const pinterestImageUrl =
    generatedPinterestImageUrl ||
    (await findBlobUrl(`pinterest/${slug}.png`)) ||
    `${siteBase}/generated/pinterest/${slug}.png`;

  const videoUrl = await findBlobUrl(`videos/${slug}.mp4`);

  let assetType: QueueAssetType = "image";
  let imageUrl = instagramImageUrl;

  if (platform === "pinterest") {
    assetType = "image";
    imageUrl = pinterestImageUrl;
  }

  if (platform === "instagram" || platform === "facebook") {
    if (videoUrl) {
      assetType = "video";
    } else {
      assetType = "image";
      imageUrl = instagramImageUrl;
    }
  }

  return {
    assetType,
    imageUrl,
    videoUrl: videoUrl ?? undefined,
  };
}

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      items: readQueue(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        items: [],
        error: err?.message || "Failed to read queue",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const platform = body.platform as QueuePlatform | undefined;
    const scheduledFor =
      typeof body.scheduledFor === "string" ? body.scheduledFor : "";
    const board =
      typeof body.board === "string" && body.board.trim()
        ? body.board.trim()
        : null;

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug required" },
        { status: 400 }
      );
    }

    if (
      platform !== "instagram" &&
      platform !== "pinterest" &&
      platform !== "facebook"
    ) {
      return NextResponse.json(
        { ok: false, error: "Valid platform required" },
        { status: 400 }
      );
    }

    if (!scheduledFor || Number.isNaN(new Date(scheduledFor).getTime())) {
      return NextResponse.json(
        { ok: false, error: "Valid scheduled time required" },
        { status: 400 }
      );
    }

    if (platform === "pinterest" && !board) {
      return NextResponse.json(
        { ok: false, error: "Pinterest board required" },
        { status: 400 }
      );
    }

    const type = detectContentTypeBySlug(slug);

    if (!type) {
      return NextResponse.json(
        { ok: false, error: "Slug not found" },
        { status: 400 }
      );
    }

    const title = titleFromSlug(slug);
    const caption = buildCaptionForPlatform(platform, slug, type);
    const url = contentUrl(slug, type);
    const assets = await resolveAssetUrls(slug, type, platform);

    const item = addQueueItem({
      slug,
      title,
      platform,
      caption,
      url,
      board,
      scheduledFor: new Date(scheduledFor).toISOString(),
      contentType: type,
      assetType: assets.assetType,
      imageUrl: assets.imageUrl,
      videoUrl: assets.videoUrl,
    });

    return NextResponse.json({
      ok: true,
      item,
      message: "Post queued",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to queue post",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    writeQueue([]);

    return NextResponse.json({
      ok: true,
      message: "Queue cleared",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to clear queue",
      },
      { status: 500 }
    );
  }
}