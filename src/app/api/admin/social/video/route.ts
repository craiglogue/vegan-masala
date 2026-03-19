import { NextResponse } from "next/server";
import { buildRecipeVideo } from "@/lib/social/video/buildRecipeVideo";
import {
  allContent,
  latestContent,
  slugFromFile,
} from "@/lib/social/core/content";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const mode =
      typeof body.mode === "string" ? body.mode : "single";

    const slug =
      typeof body.slug === "string" ? body.slug.trim() : "";

    if (mode === "single") {
      if (!slug) {
        return NextResponse.json(
          { ok: false, error: "Slug required" },
          { status: 400 }
        );
      }

      const result = await buildRecipeVideo(slug);

      return NextResponse.json({
        ok: true,
        count: 1,
        message: "Video generated",
        video: result.video,
      });
    }

    if (mode === "latest") {
      const latest = latestContent();

      if (!latest) {
        return NextResponse.json(
          { ok: false, error: "No content found" },
          { status: 404 }
        );
      }

      const latestSlug = slugFromFile(latest.file);
      const result = await buildRecipeVideo(latestSlug);

      return NextResponse.json({
        ok: true,
        count: 1,
        message: "Latest video generated",
        video: result.video,
        slug: latestSlug,
      });
    }

    if (mode === "all") {
      const items = allContent();
      let count = 0;

      for (const item of items) {
        const itemSlug = slugFromFile(item.file);
        await buildRecipeVideo(itemSlug);
        count++;
      }

      return NextResponse.json({
        ok: true,
        count,
        message: "All videos generated",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid mode" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Video build failed",
      },
      { status: 500 }
    );
  }
}