import { NextResponse } from "next/server";

import {
  generateAllInstagram,
  generateInstagramBySlug,
  generateLatestInstagram,
} from "@/lib/social/generateInstagram";

import {
  generateAllPinterest,
  generatePinterestBySlug,
  generateLatestPinterest,
} from "@/lib/social/generatePinterest";

type Platform = "instagram" | "pinterest" | "all";
type Mode = "all" | "single" | "latest";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const platform = body.platform as Platform | undefined;
    const mode = body.mode as Mode | undefined;
    const slug = typeof body.slug === "string" ? body.slug.trim() : null;

    if (!platform) {
      return NextResponse.json({ error: "Platform required" }, { status: 400 });
    }

    if (!mode) {
      return NextResponse.json({ error: "Mode required" }, { status: 400 });
    }

    if (mode === "single" && !slug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }

    let count = 0;

    if (platform === "instagram") {
      if (mode === "all") count = (await generateAllInstagram()).count ?? 0;
      if (mode === "single" && slug) count = (await generateInstagramBySlug(slug)).count ?? 0;
      if (mode === "latest") count = (await generateLatestInstagram()).count ?? 0;
    }

    if (platform === "pinterest") {
      if (mode === "all") count = (await generateAllPinterest()).count ?? 0;
      if (mode === "single" && slug) count = (await generatePinterestBySlug(slug)).count ?? 0;
      if (mode === "latest") count = (await generateLatestPinterest()).count ?? 0;
    }

    if (platform === "all") {
      if (mode === "all") {
        const [ig, pin] = await Promise.all([
          generateAllInstagram(),
          generateAllPinterest(),
        ]);
        count = (ig.count ?? 0) + (pin.count ?? 0);
      }

      if (mode === "single" && slug) {
        const [ig, pin] = await Promise.all([
          generateInstagramBySlug(slug),
          generatePinterestBySlug(slug),
        ]);
        count = (ig.count ?? 0) + (pin.count ?? 0);
      }

      if (mode === "latest") {
        const [ig, pin] = await Promise.all([
          generateLatestInstagram(),
          generateLatestPinterest(),
        ]);
        count = (ig.count ?? 0) + (pin.count ?? 0);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Generation complete",
      platform,
      mode,
      slug,
      count,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Generation failed",
        details: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}