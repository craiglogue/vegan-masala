import { NextResponse } from "next/server";

import {
  addQueueItem,
  allQueueItems,
  deleteQueueItem,
  type QueueAssetType,
  type QueueContentType,
  type QueuePlatform,
} from "@/lib/social/core/queue";

import { buildInstagramCaption, buildPinterestCaption, buildFacebookCaption } from "@/lib/social/core/captions";
import { detectContentTypeBySlug, titleFromSlug } from "@/lib/social/core/content";
import { generateInstagramBySlug } from "@/lib/social/generateInstagram";
import { generatePinterestBySlug } from "@/lib/social/generatePinterest";
import { buildRecipeVideo } from "@/lib/social/video/buildRecipeVideo";

function getSiteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

function buildContentUrl(slug: string, type: QueueContentType) {
  const base = getSiteBase();
  return type === "guide" ? `${base}/guides/${slug}` : `${base}/recipes/${slug}`;
}

function buildCaption(
  platform: QueuePlatform,
  slug: string,
  type: QueueContentType
) {
  if (platform === "pinterest") {
    return buildPinterestCaption(slug, type);
  }

  if (platform === "facebook") {
    return buildFacebookCaption(slug, type);
  }

  return buildInstagramCaption(slug, type);
}

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      items: allQueueItems(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load queue",
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
    const assetType = (body.assetType as QueueAssetType | undefined) || "image";
    const scheduledFor =
      typeof body.scheduledFor === "string" ? body.scheduledFor.trim() : "";
    const board =
      typeof body.board === "string" && body.board.trim() ? body.board.trim() : null;

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug required" },
        { status: 400 }
      );
    }

    if (!platform) {
      return NextResponse.json(
        { ok: false, error: "Platform required" },
        { status: 400 }
      );
    }

    if (!scheduledFor) {
      return NextResponse.json(
        { ok: false, error: "Schedule time required" },
        { status: 400 }
      );
    }

    if (platform === "pinterest" && !board) {
      return NextResponse.json(
        { ok: false, error: "Pinterest board required" },
        { status: 400 }
      );
    }

    if (platform === "pinterest" && assetType === "video") {
      return NextResponse.json(
        { ok: false, error: "Pinterest queue only supports still images" },
        { status: 400 }
      );
    }

    const contentType = detectContentTypeBySlug(slug);

    if (!contentType) {
      return NextResponse.json(
        { ok: false, error: "Slug not found" },
        { status: 404 }
      );
    }

    const title = titleFromSlug(slug);
    const url = buildContentUrl(slug, contentType);

    let imageUrl: string | undefined;
    let videoUrl: string | undefined;

    if (platform === "pinterest") {
      const pin = await generatePinterestBySlug(slug);
      imageUrl = pin.image;
    } else if (assetType === "video") {
      const video = await buildRecipeVideo(slug);
      videoUrl = video.video;

      const igImage = await generateInstagramBySlug(slug);
      imageUrl = igImage.image;
    } else {
      const igImage = await generateInstagramBySlug(slug);
      imageUrl = igImage.image;
    }

    const item = addQueueItem({
      slug,
      title,
      platform,
      caption: buildCaption(platform, slug, contentType),
      url,
      board,
      scheduledFor: new Date(scheduledFor).toISOString(),
      contentType,
      assetType,
      imageUrl,
      videoUrl,
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

export async function DELETE(req: Request) {
  try {
    let id = "";

    try {
      const body = await req.json();
      id = typeof body.id === "string" ? body.id.trim() : "";
    } catch {
      id = "";
    }

    if (id) {
      deleteQueueItem(id);

      return NextResponse.json({
        ok: true,
        message: "Queue item removed",
      });
    }

    const items = allQueueItems();
    for (const item of items) {
      deleteQueueItem(item.id);
    }

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