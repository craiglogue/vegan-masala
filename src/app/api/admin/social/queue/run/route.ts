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

import { publishInstagram } from "@/lib/social/publishers/publishInstagram";
import { publishFacebook } from "@/lib/social/publishers/publishFacebook";

const ROOT = process.cwd();

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
          if (!item.board) {
            throw new Error("Pinterest board missing");
          }

          await generatePinterestBySlug(item.slug);

          const imagePath = path.join(
            ROOT,
            "generated",
            "pinterest",
            `${item.slug}.png`
          );

          const result = await postPinterestPin({
            title: item.title || item.slug,
            description: item.caption || "",
            link: item.url || "",
            imagePath,
            boardId: item.board,
          });

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

        if (item.platform === "instagram") {
          const publishImageUrl = item.publishImageUrl || item.imageUrl;

          const result = await publishInstagram({
            slug: item.slug,
            caption: item.caption || "",
            assetType: item.assetType || "image",
            imageUrl: publishImageUrl,
            videoUrl: item.videoUrl,
          });

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

          const result = await publishFacebook({
            slug: item.slug,
            caption: item.caption || "",
            assetType: item.assetType || "image",
            imageUrl: publishImageUrl,
            videoUrl: item.videoUrl,
          });

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
        const classification = classifyQueueFailure(unsupported);

        await markQueueItemFailedWithMetadata(item.id, unsupported, {
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
          error: unsupported,
        });
      } catch (err: any) {
        const message = err?.message || "Queue run failed";

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