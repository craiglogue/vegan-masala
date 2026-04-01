import { NextResponse } from "next/server";
import { del } from "@vercel/blob";

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN ||
    ""
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const slug =
      typeof body.slug === "string"
        ? body.slug.trim()
        : "";

    if (!slug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug required",
        },
        { status: 400 }
      );
    }

    const token = getBlobToken();

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Blob token missing",
        },
        { status: 500 }
      );
    }

    await del(`videos/${slug}.mp4`, { token });

    return NextResponse.json({
      ok: true,
      slug,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Delete failed",
      },
      { status: 500 }
    );
  }
}