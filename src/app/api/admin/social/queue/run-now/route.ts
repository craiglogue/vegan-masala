import { NextResponse } from "next/server";

export async function POST() {
  try {
    const secret = process.env.SOCIAL_SCHEDULER_SECRET;
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://www.vegan-masala.com";

    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "SOCIAL_SCHEDULER_SECRET missing" },
        { status: 500 }
      );
    }

    const res = await fetch(`${siteUrl}/api/admin/social/queue/run`, {
      method: "POST",
      headers: {
        "x-scheduler-secret": secret,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to run queue",
      },
      { status: 500 }
    );
  }
}