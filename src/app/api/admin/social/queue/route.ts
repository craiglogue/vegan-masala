import { NextResponse } from "next/server";
import {
  addQueueItem,
  readQueue,
  writeQueue,
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
  type: "recipe" | "guide"
) {
  if (platform === "pinterest") {
    return buildPinterestCaption(slug, type);
  }

  if (platform === "instagram" || platform === "facebook") {
    return buildInstagramCaption(slug, type);
  }

  throw new Error(`Unsupported platform: ${platform}`);
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

    const item = addQueueItem({
      slug,
      title,
      platform,
      caption,
      url,
      board,
      scheduledFor: new Date(scheduledFor).toISOString(),
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