import { NextResponse } from "next/server";
import { buildAutoQueue } from "@/lib/social/core/autoQueue";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const days = Number(body.days) || 30;
    const platform = body.platform || "pinterest";
    const board = body.board || null;

    const count = await buildAutoQueue(days, platform, board);

    return NextResponse.json({
      ok: true,
      count,
      message: "Auto schedule built",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Auto queue failed",
      },
      { status: 500 }
    );
  }
}