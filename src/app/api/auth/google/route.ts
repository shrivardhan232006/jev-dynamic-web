import { NextResponse } from "next/server";
import { getAuthUrl, getGoogleAuthStatus } from "@/lib/mcp/google-auth";

export const runtime = "nodejs";

export async function GET() {
  const status = getGoogleAuthStatus();

  if (!status.configured) {
    return NextResponse.json(
      {
        error: "Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local",
        setupGuide: "/docs/GOOGLE_OAUTH_SETUP.md",
      },
      { status: 400 },
    );
  }

  const url = getAuthUrl();
  if (!url) {
    return NextResponse.json({ error: "Failed to generate auth URL" }, { status: 500 });
  }

  return NextResponse.redirect(url);
}
