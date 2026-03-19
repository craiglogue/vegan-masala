import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const ROOT = process.cwd();
const TOKEN_FILE = path.join(ROOT, "generated", "pinterest-token.json");

function base64Credentials(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          ok: false,
          error: "No authorization code returned by Pinterest",
        },
        { status: 400 }
      );
    }

    const clientId = process.env.PINTEREST_APP_ID;
    const clientSecret = process.env.PINTEREST_APP_SECRET;
    const redirectUri = process.env.PINTEREST_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Pinterest environment variables",
        },
        { status: 500 }
      );
    }

    const authHeader = `Basic ${base64Credentials(clientId, clientSecret)}`;

    const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Pinterest token exchange failed",
          details: tokenData,
        },
        { status: 500 }
      );
    }

    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), "utf8");

    return NextResponse.redirect("http://localhost:3000/admin/social");
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Pinterest callback failed",
      },
      { status: 500 }
    );
  }
}