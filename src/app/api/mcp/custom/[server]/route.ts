import { NextResponse } from "next/server";
import { getServer } from "@/lib/mcp/registry";
import { callTool, connectServer, disconnectServer, getServerTools } from "@/lib/mcp/client";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ server: string }> };

/** GET: List tools for a server, or connect to it. */
export async function GET(request: Request, { params }: RouteParams) {
  const { server: serverId } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "tools";

  const config = getServer(serverId);
  if (!config) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  if (action === "connect") {
    const result = await connectServer(config);
    return NextResponse.json(result);
  }

  if (action === "disconnect") {
    await disconnectServer(serverId);
    return NextResponse.json({ success: true });
  }

  // Return discovered tools
  const tools = getServerTools(serverId);
  return NextResponse.json({ serverId, tools });
}

/** POST: Call a tool on the MCP server. */
export async function POST(request: Request, { params }: RouteParams) {
  const { server: serverId } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.tool) {
    return NextResponse.json(
      { error: "Missing required field: tool" },
      { status: 400 },
    );
  }

  const config = getServer(serverId);
  if (!config) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  // Auto-connect if not connected
  const existingTools = getServerTools(serverId);
  if (existingTools.length === 0) {
    const connectResult = await connectServer(config);
    if (connectResult.error) {
      return NextResponse.json(
        { error: `Connection failed: ${connectResult.error}` },
        { status: 500 },
      );
    }
  }

  const result = await callTool(serverId, body.tool, body.args ?? {});
  return NextResponse.json(result);
}
