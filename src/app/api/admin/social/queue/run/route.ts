import { NextResponse } from "next/server";

import {
  dueQueueItems,
  markQueueItemFailed,
  markQueueItemPosted,
} from "@/lib/social/core/queue";

import { publishPinterest } from "@/lib/social/publishers/publishPinterest";
import { publishInstagram } from "@/lib/social/publishers/publishInstagram";
import { publishFacebook } from "@/lib/social/publishers/publishFacebook";

export async function POST(req: Request) {
  try {
    const requiredSecret = process.env.SOCIAL_SCHEDULER_SECRET;

    const providedSecret = req.headers.get("x-scheduler-secret");
    const cronHeader = req.headers.get("x-vercel-cron");

    const isManualAuthorized =
      Boolean(requiredSecret) && providedSecret === requiredSecret;

    const isVercelCron = Boolean(cronHeader);

    if (requiredSecret && !isManualAuthorized && !isVercelCron) {
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

          const result = await publishPinterest({
            slug: item.slug,
            title: item.title || item.slug,
            caption: item.caption || "",
            url: item.url || "",
            board: item.board,
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