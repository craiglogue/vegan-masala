import { NextResponse } from "next/server";

import { generateInstagramBySlug } from "@/lib/social/generateInstagram";
import { generatePinterestBySlug } from "@/lib/social/generatePinterest";
import { buildRecipeVideo } from "@/lib/social/video/buildRecipeVideo";

import {
  latestContent,
  slugFromFile,
  detectContentTypeBySlug,
  titleFromSlug,
} from "@/lib/social/core/content";

import { buildPinterestCaption } from "@/lib/social/core/captions";
import { contentUrl } from "@/lib/social/core/urls";
import { addQueueItem } from "@/lib/social/core/queue";

function buildScheduleDates(days: number) {
  const dates: string[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(18, 0, 0, 0);
    dates.push(d.toISOString());
  }

  return dates;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const board = typeof body.board === "string" ? body.board.trim() : "";
    const days =
      typeof body.days === "number" && body.days > 0 ? body.days : 30;

    if (!board) {
      return NextResponse.json(
        { ok: false, error: "Pinterest board required" },
        { status: 400 }
      );
    }

    const latest = latestContent();

    if (!latest) {
      return NextResponse.json(
        { ok: false, error: "No content found" },
        { status: 404 }
      );
    }

    const slug = slugFromFile(latest.file);
    const type = detectContentTypeBySlug(slug);

    if (!type) {
      return NextResponse.json(
        { ok: false, error: "Latest content type not found" },
        { status: 400 }
      );
    }

    const title = titleFromSlug(slug);
    const url = contentUrl(slug, type);

    const steps: string[] = [];

    await generateInstagramBySlug(slug);
    await generatePinterestBySlug(slug);
    steps.push("Images generated");

    await buildRecipeVideo(slug);
    steps.push("Video generated");

    let created = 0;

    for (const scheduledFor of buildScheduleDates(days)) {
      addQueueItem({
        slug,
        title,
        platform: "pinterest",
        caption: buildPinterestCaption(slug, type),
        url,
        board,
        scheduledFor,
      });

      created++;
    }

    steps.push(`Queued ${created} Pinterest posts`);

    return NextResponse.json({
      ok: true,
      slug,
      days,
      created,
      steps,
      message: "Auto-growth complete",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Auto-growth failed",
      },
      { status: 500 }
    );
  }
}