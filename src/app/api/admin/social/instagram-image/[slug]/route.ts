import { NextResponse } from "next/server";

import { list } from "@vercel/blob";

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN ||
    ""
  );
}

async function fetchFromBlobUrl(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";

  return { buffer, contentType };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const cleanSlug = String(slug || "").trim();

    if (!cleanSlug) {
      return NextResponse.json({ ok: false, error: "Slug required" }, { status: 400 });
    }

    const token = getBlobToken();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Blob token missing" },
        { status: 500 }
      );
    }

    const prefixes = [
      `instagram/${cleanSlug}.jpg`,
      `instagram/${cleanSlug}.jpeg`,
      `instagram/${cleanSlug}.png`,
      `instagram/${cleanSlug}.webp`,
    ];

    for (const prefix of prefixes) {
      const { blobs } = await list({
        token,
        prefix,
      });

      const match = blobs.find((b) => b.pathname === prefix);
      if (!match?.url) continue;

      const downloaded = await fetchFromBlobUrl(match.url);
      if (!downloaded) continue;

      return new NextResponse(downloaded.buffer, {
        status: 200,
        headers: {
          "Content-Type": downloaded.contentType,
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "Generated Instagram image not found" },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load Instagram image",
      },
      { status: 500 }
    );
  }
}
