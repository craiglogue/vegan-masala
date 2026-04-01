import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  try {
    const token =
      process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "No blob token found on server" },
        { status: 500 }
      );
    }

    const instagram = await list({
      token,
      prefix: "instagram/",
    });

    const videos = await list({
      token,
      prefix: "videos/",
    });

    return NextResponse.json({
      ok: true,
      instagramCount: instagram.blobs.length,
      videoCount: videos.blobs.length,
      instagram: instagram.blobs.slice(0, 20).map((b) => ({
        pathname: b.pathname,
        url: b.url,
      })),
      videos: videos.blobs.slice(0, 20).map((b) => ({
        pathname: b.pathname,
        url: b.url,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Blob check failed",
      },
      { status: 500 }
    );
  }
}