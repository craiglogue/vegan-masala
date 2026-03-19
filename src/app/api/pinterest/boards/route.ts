import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const ROOT = process.cwd();
const TOKEN_FILE = path.join(ROOT, "generated", "pinterest-token.json");

export async function GET() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Pinterest not connected",
          items: [],
        },
        { status: 400 }
      );
    }

    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "No Pinterest access token found",
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