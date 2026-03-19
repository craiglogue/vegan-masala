import { NextResponse } from "next/server";
import { getPinterestAccessToken } from "@/lib/social/core/pinterestToken";

export async function GET() {
  try {
    const accessToken = getPinterestAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Pinterest not connected",
          items: [],
        },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.pinterest.com/v5/boards", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to fetch Pinterest boards",
          details: data,
          items: [],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data.items || [],
      raw: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Boards request failed",
        items: [],
      },
      { status: 500 }
    );
  }
}