import { NextResponse } from "next/server";
import { buildRecipeVideo } from "@/lib/social/video/buildRecipeVideo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug =
      typeof body.slug === "string" ? body.slug.trim() : "";

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      debug: true,
      message: "NEW VIDEO ROUTE IS LIVE",
      slug,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Video route failed",
      },
      { status: 500 }
    );
  }
}