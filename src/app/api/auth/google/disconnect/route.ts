import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/mcp/google-auth";

export const runtime = "nodejs";

export async function POST() {
  clearTokens();
  return NextResponse.json({ success: true, message: "Google account disconnected" });
}
