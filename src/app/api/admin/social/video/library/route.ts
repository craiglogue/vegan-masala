import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import {
  allContent,
  slugFromFile,
} from "@/lib/social/core/content";

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN ||
    ""
  );
}

export async function GET() {
  try {
    const token = getBlobToken();

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Blob token missing",
          items: [],
        },
        { status: 500 }
      );
    }

    const { blobs } = await list({
      token,
      prefix: "videos/",
    });

    const knownSlugs = new Set(
      allContent().map((item) => slugFromFile(item.file))
    );

    const items = blobs
      .filter((blob) => blob.pathname.endsWith(".mp4"))
      .map((blob) => {
        const slug = blob.pathname
          .replace(/^videos\//, "")
          .replace(/\.mp4$/i, "");

        return {
          slug,
          video: blob.url,
          uploadedAt: blob.uploadedAt || "",
        };
      })
      .filter((item) => knownSlugs.has(item.slug))
      .sort((a, b) => {
        const aTime = new Date(a.uploadedAt || 0).getTime();
        const bTime = new Date(b.uploadedAt || 0).getTime();
        return bTime - aTime;
      })
      .map(({ slug, video }) => ({ slug, video }));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load video library",
        items: [],
      },
      { status: 500 }
    );
  }
}