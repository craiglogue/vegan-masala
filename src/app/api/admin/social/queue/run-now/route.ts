import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";

import {
  dueQueueItems,
  classifyQueueFailure,
  markQueueItemFailedWithMetadata,
  markQueueItemPostedWithMetadata,
} from "@/lib/social/core/queue";

import { generatePinterestBySlug } from "@/lib/social/generatePinterest";
import { postPinterestPin } from "@/lib/social/core/pinterestPost";

import { renderPinterestEbookPromo } from "@/lib/social/ebook/renderPinterest";

import { publishInstagram } from "@/lib/social/publishers/publishInstagram";
import { publishFacebook } from "@/lib/social/publishers/publishFacebook";
import { validateSocialPublishPreflight } from "@/lib/social/core/publishPreflight";

const ROOT = process.cwd();

function getSiteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

function pinterestImagePathForItem(item: any) {
  const candidates = [
    path.join(ROOT, "generated", "pinterest", `${item.slug}.jpg`),
    path.join(ROOT, "generated", "pinterest", `${item.slug}.jpeg`),
    path.join(ROOT, "generated", "pinterest", `${item.slug}.png`),
    path.join(ROOT, "generated", "pinterest", `${item.slug}.webp`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

async function downloadPinterestImageToTempFile(imageUrl: string, slug: string) {
  const res = await fetch(imageUrl, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to download queued Pinterest image: ${res.status}`);
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  let ext = ".png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
  if (contentType.includes("webp")) ext = ".webp";

  const tempPath = path.join(
    os.tmpdir(),
    `pinterest-${slug}-${Date.now()}${ext}`
  );

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);

  return tempPath;
}

function isAuthError(message: string) {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("access token") ||
    m.includes("oauth") ||
    m.includes("authentication failed") ||
    m.includes("invalid oauth") ||
    m.includes("session has expired") ||
    m.includes("expired") ||
    m.includes("meta_access_token missing") ||
    m.includes("meta_ig_user_id missing")
  );
}

function normalizeError(err: any) {
  const message = err?.message || "Queue run failed";

  if (isAuthError(message)) {
    return `AUTH ERROR: ${message}`;
  }

  return message;
}

function platformResponseIdForResult(platform: string, result: any) {
  if (platform === "pinterest") {
    return String(result?.id || result?.pinId || "") || null;
  }

  if (platform === "instagram") {
    return String(result?.published?.id || result?.containerId || "") || null;
  }

  if (platform === "facebook") {
    return (
      String(result?.photoId || result?.postId || result?.videoId || result?.published?.id || "") ||
      null
    );
  }

  return null;
}

export async function POST() {
  try {
    const due = await dueQueueItems();
    let count = 0;

    const results: Array<{
      id: string;
      slug: string;
      platform: string;
      assetType?: string;
      status: "posted" | "failed";
      error?: string;
    }> = [];

    for (const item of due) {
      const attemptedAt = new Date().toISOString();

      try {
        if (item.platform === "pinterest") {
          const sourceUrl = item.publishImageUrl || item.imageUrl || "";
          const preflight = validateSocialPublishPreflight({
            platform: item.platform,
            slug: item.slug,
            stage: "publish",
            assetType: item.assetType || "image",
            imageUrl: sourceUrl,
            publishImageUrl: sourceUrl,
            board: item.board,
            baseUrl: getSiteBase(),
            allowMissingImageUrl: !sourceUrl,
          });

          if (!preflight.ok) {
            throw new Error(preflight.reason);
          }

          if ((item.assetType || "image") === "video") {
            throw new Error("Pinterest only supports image posts in this workflow");
          }

          if (!item.board) {
            throw new Error("Pinterest board missing");
          }

          let imagePath = "";
          let tempImagePath = "";

          try {
            if (sourceUrl) {
              tempImagePath = await downloadPinterestImageToTempFile(sourceUrl, item.slug);
              imagePath = tempImagePath;
            } else {
              if (item.contentType === "store" && item.kind === "ebook") {
                await renderPinterestEbookPromo();
              } else {
                await generatePinterestBySlug(item.slug);
              }

              imagePath = pinterestImagePathForItem(item);
            }

            const result = await postPinterestPin({
              title: item.title || item.slug,
              description: item.caption || "",
              link: item.url || "",
              imagePath,
              boardId: item.board,
            });

            console.log("QUEUE PINTEREST RESULT:", result);

            await markQueueItemPostedWithMetadata(item.id, {
              attemptedAt,
              completedAt: new Date().toISOString(),
              platformResponseId: platformResponseIdForResult(item.platform, result),
            });
            count++;
            results.push({
              id: item.id,
              slug: item.slug,
              platform: item.platform,
              assetType: item.assetType,
              status: "posted",
            });
            continue;
          } finally {
            if (tempImagePath && fs.existsSync(tempImagePath)) {
              try {
                fs.unlinkSync(tempImagePath);
              } catch {}
            }
          }
        }

        if (item.platform === "instagram") {
          const publishImageUrl = item.publishImageUrl || item.imageUrl;

          const preflight = validateSocialPublishPreflight({
            platform: item.platform,
            slug: item.slug,
            stage: "publish",
            assetType: item.assetType || "image",
            imageUrl: publishImageUrl,
            publishImageUrl,
            videoUrl: item.videoUrl,
            baseUrl: getSiteBase(),
          });

          if (!preflight.ok) {
            throw new Error(preflight.reason);
          }

          const result = await publishInstagram({
            slug: item.slug,
            caption: item.caption || "",
            assetType: item.assetType || "image",
            imageUrl: preflight.normalized.publishImageUrl || preflight.normalized.imageUrl,
            videoUrl: preflight.normalized.videoUrl || item.videoUrl,
          });

          console.log("QUEUE INSTAGRAM RESULT:", result);

          await markQueueItemPostedWithMetadata(item.id, {
            attemptedAt,
            completedAt: new Date().toISOString(),
            platformResponseId: platformResponseIdForResult(item.platform, result),
          });
          count++;
          results.push({
            id: item.id,
            slug: item.slug,
            platform: item.platform,
            assetType: item.assetType,
            status: "posted",
          });
          continue;
        }

        if (item.platform === "facebook") {
          const publishImageUrl = item.publishImageUrl || item.imageUrl;

          const preflight = validateSocialPublishPreflight({
            platform: item.platform,
            slug: item.slug,
            stage: "publish",
            assetType: item.assetType || "image",
            imageUrl: publishImageUrl,
            publishImageUrl,
            videoUrl: item.videoUrl,
            baseUrl: getSiteBase(),
          });

          if (!preflight.ok) {
            throw new Error(preflight.reason);
          }

          const result = await publishFacebook({
            slug: item.slug,
            caption: item.caption || "",
            assetType: item.assetType || "image",
            imageUrl: preflight.normalized.publishImageUrl || preflight.normalized.imageUrl,
            videoUrl: preflight.normalized.videoUrl || item.videoUrl,
          });

          console.log("QUEUE FACEBOOK RESULT:", result);

          await markQueueItemPostedWithMetadata(item.id, {
            attemptedAt,
            completedAt: new Date().toISOString(),
            platformResponseId: platformResponseIdForResult(item.platform, result),
          });
          count++;
          results.push({
            id: item.id,
            slug: item.slug,
            platform: item.platform,
            assetType: item.assetType,
            status: "posted",
          });
          continue;
        }

        const unsupported = `Unsupported platform: ${item.platform}`;
        const unsupportedClassification = classifyQueueFailure(unsupported);

        await markQueueItemFailedWithMetadata(item.id, unsupported, {
          attemptedAt,
          completedAt: new Date().toISOString(),
          ...unsupportedClassification,
        });
        results.push({
          id: item.id,
          slug: item.slug,
          platform: item.platform,
          assetType: item.assetType,
          status: "failed",
          error: unsupported,
        });
      } catch (err: any) {
        const message = normalizeError(err);

        console.error("QUEUE ITEM FAILED:", {
          id: item.id,
          slug: item.slug,
          platform: item.platform,
          contentType: item.contentType,
          kind: item.kind,
          assetType: item.assetType,
          error: message,
        });

        const classification = classifyQueueFailure(message);

        await markQueueItemFailedWithMetadata(item.id, message, {
          attemptedAt,
          completedAt: new Date().toISOString(),
          ...classification,
        });
        results.push({
          id: item.id,
          slug: item.slug,
          platform: item.platform,
          assetType: item.assetType,
          status: "failed",
          error: message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      count,
      attempted: due.length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
      message: "Due posts processed",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to run queue",
      },
      { status: 500 }
    );
  }
}
