import path from "node:path";
import { NextResponse } from "next/server";

import {
  dueQueueItems,
  markQueueItemFailed,
  markQueueItemPosted,
} from "@/lib/social/core/queue";

import { generatePinterestBySlug } from "@/lib/social/generatePinterest";
import { postPinterestPin } from "@/lib/social/core/pinterestPost";

import { publishInstagram } from "@/lib/social/publishers/publishInstagram";
import { publishFacebook } from "@/lib/social/publishers/publishFacebook";

const ROOT = process.cwd();

export async function POST(req: Request) {
  try {
    const requiredSecret = process.env.SOCIAL_SCHEDULER_SECRET;

    const providedSecret = req.headers.get("x-scheduler-secret");
    const cronHeader = req.headers.get("x-vercel-cron");

    const isManualAuthorized =
      Boolean(requiredSecret) && providedSecret === requiredSecret;

    const isVercelCron = Boolean(cronHeader);

    const isAdminUI =
      process.env.NODE_ENV !== "production";

    if (requiredSecret && !isManualAuthorized && !isVercelCron && !isAdminUI) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized scheduler request",
        },
        { status: 401 }
      );
    }

    const due = await dueQueueItems();
    let count = 0;

    const results: Array<{
      id: string;
      slug: string;
      platform: string;
      status: "posted" | "failed";
      error?: string;
    }> = [];

    for (const item of due) {
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

          console.log("QUEUE PINTEREST RESULT:", result);

          await markQueueItemPosted(item.id);
          count++;
          results.push({
            id: item.id,
            slug: item.slug,
            platform: item.platform,
            status: "posted",
          });
          continue;
        }

        if (item.platform === "instagram") {
          const result = await publishInstagram({
            slug: item.slug,
            caption: item.caption || "",
          });

          console.log("QUEUE INSTAGRAM RESULT:", result);

          await markQueueItemPosted(item.id);
          count++;
          results.push({
            id: item.id,
            slug: item.slug,
            platform: item.platform,
            status: "posted",
          });
          continue;
        }

        if (item.platform === "facebook") {
          const result = await publishFacebook({
            slug: item.slug,
            caption: item.caption || "",
          });

          console.log("QUEUE FACEBOOK RESULT:", result);

         await markQueueItemPosted(item.id);
          count++;
          results.push({
            id: item.id,
            slug: item.slug,
            platform: item.platform,
            status: "posted",
          });
          continue;
        }

        const unsupported = `Unsupported platform: ${item.platform}`;
        await markQueueItemFailed(item.id, unsupported);
        results.push({
          id: item.id,
          slug: item.slug,
          platform: item.platform,
          status: "failed",
          error: unsupported,
        });
      } catch (err: any) {
        const message = err?.message || "Queue run failed";

        console.error("QUEUE ITEM FAILED:", {
          id: item.id,
          slug: item.slug,
          platform: item.platform,
          error: message,
        });

        await markQueueItemFailed(item.id, message);
        results.push({
          id: item.id,
          slug: item.slug,
          platform: item.platform,
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