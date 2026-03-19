import { NextResponse } from "next/server";
import { readManifest } from "@/lib/social/core/manifest";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      items: readManifest(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        items: {},
        error: err?.message || "Failed to read manifest",
      },
      { status: 500 }
    );
  }
}