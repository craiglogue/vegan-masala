import { NextResponse } from "next/server";
import { getPinterestAccessToken } from "@/lib/social/core/pinterestPost";

export async function GET() {
  const token = await getPinterestAccessToken();

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "Pinterest access token missing",
        items: [],
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch("https://api.pinterest.com/v5/boards?page_size=250", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data?.message ||
            data?.error ||
            data?.code ||
            "Failed to fetch boards",
          items: [],
          status: res.status,
          raw: data,
        },
        { status: res.status || 500 }
      );
    }

    const rawItems = Array.isArray(data?.items) ? data.items : [];
    const items = rawItems
      .filter((board: any) => board?.id && board?.name)
      .map((board: any) => ({
        id: String(board.id),
        name: String(board.name),
      }));

    return NextResponse.json({
      ok: true,
      count: items.length,
      items,
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
