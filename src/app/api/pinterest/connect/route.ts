import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.PINTEREST_APP_ID;
  const redirectUri = process.env.PINTEREST_REDIRECT_URI;
  const scopes = process.env.PINTEREST_SCOPES;
  const state = "vegan-masala";

  if (!clientId || !redirectUri || !scopes) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing Pinterest environment variables",
      },
      { status: 500 }
    );
  }

  const authUrl =
    "https://www.pinterest.com/oauth/?" +
    new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
    }).toString();

  return NextResponse.redirect(authUrl);
}