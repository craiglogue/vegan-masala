import { NextResponse } from "next/server";

import {
  addQueueItem,
  allQueueItems,
  deleteQueueItem,
  findQueueItemById,
  rescheduleQueueItemNow,
  retryQueueItem,
  type QueueAssetType,
  type QueueContentType,
  type QueuePlatform,
} from "@/lib/social/core/queue";

import {
  buildInstagramCaption,
  buildPinterestCaption,
  buildFacebookCaption,
} from "@/lib/social/core/captions";
import { detectContentTypeBySlug, titleFromSlug } from "@/lib/social/core/content";
import { generatePinterestBySlug } from "@/lib/social/generatePinterest";
import { buildRecipeVideo } from "@/lib/social/video/buildRecipeVideo";

import { EBOOK } from "@/lib/social/ebook/ebook";
import {
  buildFacebookEbookCaption,
  buildInstagramEbookCaption,
  buildPinterestEbookCaption,
} from "@/lib/social/ebook/captions";
import { renderInstagramEbookPromo } from "@/lib/social/ebook/renderInstagram";
import { validateSocialPublishPreflight } from "@/lib/social/core/publishPreflight";
import { renderPinterestEbookPromo } from "@/lib/social/ebook/renderPinterest";
import { renderInstagramBySlug } from "@/lib/social/instagram/render";


function getBaseUrl() {
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

function absolutizeUrl(url?: string) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${getBaseUrl()}${value.startsWith("/") ? "" : "/"}${value}`;
}

function isLikelyLocalNonPublicImagePath(url?: string) {
  const value = String(url || "").trim();
  if (!value) return false;

  if (value.startsWith("/generated/") || value.startsWith("generated/")) {
    return true;
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (pathname.startsWith("/generated/")) return true;

    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    ) {
      return true;
    }
  } catch {
    // Non-URL values are handled by the explicit path checks above.
  }

  return false;
}

type QueueContentKind = "standard" | "ebook";

function getSiteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

function buildContentUrl(slug: string, type: QueueContentType, kind?: QueueContentKind) {
  const base = getSiteBase();

  if (type === "store") {
    if (kind === "ebook") {
      return EBOOK.url;
    }
    return `${base}/store`;
  }

  return type === "guide" ? `${base}/guides/${slug}` : `${base}/recipes/${slug}`;
}

function buildCaption(
  platform: QueuePlatform,
  slug: string,
  type: QueueContentType,
  kind?: QueueContentKind
) {
  if (type === "store") {
    if (kind === "ebook") {
      if (platform === "pinterest") return buildPinterestEbookCaption();
      if (platform === "facebook") return buildFacebookEbookCaption();
      return buildInstagramEbookCaption();
    }

    return "";
  }

  if (platform === "pinterest") return buildPinterestCaption(slug, type);
  if (platform === "facebook") return buildFacebookCaption(slug, type);
  return buildInstagramCaption(slug, type);
}

function buildStoreTitle(slug: string, kind?: QueueContentKind) {
  if (kind === "ebook" && slug === EBOOK.slug) {
    return EBOOK.title;
  }

  return slug;
}

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      items: allQueueItems(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load queue" },
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

    const explicitTitle =
      typeof body.title === "string" && body.title.trim() ? body.title.trim() : "";

    const explicitCaption =
      typeof body.caption === "string" && body.caption.trim() ? body.caption.trim() : "";

    const explicitUrl =
      typeof body.url === "string" && body.url.trim() ? body.url.trim() : "";

    const explicitImageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : "";

    const explicitPublishImageUrl =
      typeof body.publishImageUrl === "string" && body.publishImageUrl.trim()
        ? body.publishImageUrl.trim()
        : "";

    const explicitVideoUrl =
      typeof body.videoUrl === "string" && body.videoUrl.trim() ? body.videoUrl.trim() : "";

    const requestedContentType =
      typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";

    const requestedKind =
      typeof body.kind === "string" ? body.kind.trim().toLowerCase() : "";

    const kind: QueueContentKind =
      requestedKind === "ebook" ? "ebook" : "standard";

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Slug required" }, { status: 400 });
    }

    if (!platform) {
      return NextResponse.json({ ok: false, error: "Platform required" }, { status: 400 });
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

    let contentType: QueueContentType | null = null;

    if (requestedContentType === "store") {
      contentType = "store";
    } else {
      contentType = detectContentTypeBySlug(slug);
    }

    if (!contentType) {
      return NextResponse.json({ ok: false, error: "Slug not found" }, { status: 404 });
    }

    if (contentType === "store" && kind !== "ebook") {
      return NextResponse.json(
        { ok: false, error: "Unsupported store content kind" },
        { status: 400 }
      );
    }

    const title =
      explicitTitle ||
      (contentType === "store"
        ? buildStoreTitle(slug, kind)
        : titleFromSlug(slug));

    const url = explicitUrl || buildContentUrl(slug, contentType, kind);
    const siteBase = getSiteBase();
    const requestOrigin = new URL(req.url).origin;

    const localInstagramPreviewUrl =
      contentType === "store" && kind === "ebook"
        ? `${requestOrigin}/api/admin/social/instagram-image/${EBOOK.slug}`
        : `${requestOrigin}/api/admin/social/instagram-image/${slug}`;

    const publicInstagramPublishUrl =
      contentType === "store" && kind === "ebook"
        ? `${siteBase}/api/admin/social/instagram-image/${EBOOK.slug}`
        : `${siteBase}/api/admin/social/instagram-image/${slug}`;

    let imageUrl: string | undefined;
    let publishImageUrl: string | undefined;
    let videoUrl: string | undefined;

    if (explicitImageUrl || explicitPublishImageUrl || explicitVideoUrl) {
      imageUrl = explicitImageUrl || explicitPublishImageUrl || undefined;
      publishImageUrl = absolutizeUrl(explicitPublishImageUrl || explicitImageUrl || undefined);
      videoUrl = explicitVideoUrl || undefined;
    } else if (contentType === "store" && kind === "ebook") {
      if (platform === "pinterest") {
        const pin = await renderPinterestEbookPromo();
        const cleanPinUrl = String(pin.image || "").split("?")[0].split("#")[0];
        imageUrl = cleanPinUrl;
        publishImageUrl = cleanPinUrl;
      } else {
        await renderInstagramEbookPromo();
        imageUrl = localInstagramPreviewUrl;
        publishImageUrl = absolutizeUrl(publicInstagramPublishUrl);
      }
    } else if (platform === "pinterest") {
      const pin = await generatePinterestBySlug(slug);
      const cleanPinUrl = String(pin.image || "").split("?")[0].split("#")[0];
      imageUrl = cleanPinUrl;
      publishImageUrl = cleanPinUrl;
    } else if (assetType === "video") {
      const video = await buildRecipeVideo(slug);
      videoUrl = video.video;
      imageUrl = localInstagramPreviewUrl;
      publishImageUrl = absolutizeUrl(publicInstagramPublishUrl);
    } else if (platform === "instagram" || platform === "facebook") {
      const generated = await renderInstagramBySlug(slug);
      const previewUrl = String((generated as any).image || "");
      const publishUrl = String((generated as any).publishImage || (generated as any).image || "").split("?")[0].split("#")[0];
      imageUrl = previewUrl || localInstagramPreviewUrl;
      publishImageUrl = absolutizeUrl(publishUrl || publicInstagramPublishUrl);
    } else {
      imageUrl = localInstagramPreviewUrl;
      publishImageUrl = absolutizeUrl(publicInstagramPublishUrl);
    }

    if (
      (platform === "instagram" || platform === "facebook") &&
      assetType === "image" &&
      !explicitPublishImageUrl &&
      isLikelyLocalNonPublicImagePath(explicitImageUrl)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Publish image URL must be a public URL for Instagram/Facebook publishing.",
        },
        { status: 400 }
      );
    }

    const preflight = validateSocialPublishPreflight({
      platform,
      slug,
      stage: "queue",
      assetType,
      imageUrl,
      publishImageUrl,
      videoUrl,
      board,
      baseUrl: siteBase,
    });

    if (!preflight.ok) {
      return NextResponse.json(
        { ok: false, error: preflight.reason },
        { status: 400 }
      );
    }

    const normalizedImageUrl = preflight.normalized.imageUrl || undefined;
    const normalizedPublishImageUrl =
      preflight.normalized.publishImageUrl || undefined;
    const normalizedVideoUrl = preflight.normalized.videoUrl || undefined;
    const normalizedBoard = preflight.normalized.board || null;

    const item = addQueueItem({
      slug,
      title,
      platform,
      caption: explicitCaption || buildCaption(platform, slug, contentType, kind),
      url,
      board: normalizedBoard,
      scheduledFor: new Date(scheduledFor).toISOString(),
      contentType,
      kind,
      assetType,
      imageUrl: normalizedImageUrl,
      publishImageUrl: normalizedPublishImageUrl,
      videoUrl: normalizedVideoUrl,
    });

    return NextResponse.json({
      ok: true,
      item,
      message: "Post queued",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to queue post" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Queue item id required" },
        { status: 400 }
      );
    }

    const existing = findQueueItemById(id);

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Queue item not found" },
        { status: 404 }
      );
    }

    if (action === "delete") {
      deleteQueueItem(id);
      return NextResponse.json({ ok: true, message: "Queue item removed" });
    }

    if (action === "retry") {
      retryQueueItem(id);
      return NextResponse.json({ ok: true, message: "Failed item moved back to queued" });
    }

    if (action === "post-now") {
      rescheduleQueueItemNow(id);
      return NextResponse.json({
        ok: true,
        message: "Queue item rescheduled for immediate posting",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unsupported queue action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update queue item" },
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
      return NextResponse.json({ ok: true, message: "Queue item removed" });
    }

    const items = allQueueItems();
    for (const item of items) {
      deleteQueueItem(item.id);
    }

    return NextResponse.json({ ok: true, message: "Queue cleared" });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to clear queue" },
      { status: 500 }
    );
  }
}
