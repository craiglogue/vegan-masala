import { NextResponse } from "next/server";
import { loadPinterestToken } from "@/lib/social/core/pinterestToken";

export async function GET() {
  try {
    const token: any = await loadPinterestToken();

    return NextResponse.json({
      ok: true,
      hasToken: !!token,
      hasAccessToken: !!token?.access_token,
      tokenKeys: token ? Object.keys(token) : [],
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Boards debug failed",
      },
      { status: 500 }
    );
  }
}