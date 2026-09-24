import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/mcp/google-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth=error&message=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?auth=error&message=no_code", request.url),
    );
  }

  const result = await exchangeCode(code);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(
        `/?auth=error&message=${encodeURIComponent(result.error ?? "unknown")}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(new URL("/?auth=success", request.url));
}
