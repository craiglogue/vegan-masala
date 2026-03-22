import { NextResponse } from "next/server";
import { buildRecipeVideo } from "@/lib/social/video/buildRecipeVideo";

type VideoBuildResult = {
  success?: boolean;
  video?: string;
  logs?: string[];
};

export async function POST(req: Request) {
  const logs: string[] = [];

  try {
    const body = await req.json().catch(() => ({}));

    const slug =
      typeof body?.slug === "string"
        ? body.slug.trim()
        : typeof body?.selectedSlug === "string"
        ? body.selectedSlug.trim()
        : "";

    logs.push("Video route called");

    if (!slug) {
      logs.push("No slug received");

      return NextResponse.json(
        {
          ok: false,
          error: "Slug required",
          logs,
          received: body ?? null,
        },
        { status: 400 }
      );
    }

    logs.push(`Slug: ${slug}`);

    const result = (await buildRecipeVideo(slug)) as VideoBuildResult;

    return NextResponse.json({
      ok: true,
      slug,
      video: result.video ?? "",
      logs: [...logs, ...(result.logs ?? [])],
      rawResult: result,
    });
  } catch (err: any) {
    logs.push("Video generation failed");
    logs.push(err?.message || "Unknown error");

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Video generation failed",
        logs,
      },
      { status: 500 }
    );
  }
}