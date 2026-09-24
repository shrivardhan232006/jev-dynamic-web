import { NextResponse } from "next/server";
import { getGoogleAuthStatus } from "@/lib/mcp/google-auth";

export const runtime = "nodejs";

export async function GET() {
  const status = getGoogleAuthStatus();
  return NextResponse.json(status);
}
