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

    if (requiredSecret && providedSecret !== requiredSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized scheduler request",
        },
        { status: 401 }
      );
    }

    const due = dueQueueItems();
    let count = 0;

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

          await postPinterestPin({
            title: item.title || item.slug,
            description: item.caption || "",
            link: item.url || "",
            imagePath,
            boardId: item.board,
          });

          markQueueItemPosted(item.id);
          count++;
          continue;
        }

        if (item.platform === "instagram") {
          await publishInstagram({
            slug: item.slug,
            caption: item.caption || "",
          });

          markQueueItemPosted(item.id);
          count++;
          continue;
        }

        if (item.platform === "facebook") {
          await publishFacebook({
            slug: item.slug,
            caption: item.caption || "",
          });

          markQueueItemPosted(item.id);
          count++;
          continue;
        }

        markQueueItemFailed(item.id, `Unsupported platform: ${item.platform}`);
      } catch (err: any) {
        markQueueItemFailed(item.id, err?.message || "Queue run failed");
      }
    }

    return NextResponse.json({
      ok: true,
      count,
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