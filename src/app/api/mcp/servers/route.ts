import { NextResponse } from "next/server";
import {
  addServer,
  getServers,
  removeServer,
  toggleServer,
  updateServer,
  MCP_TEMPLATES,
} from "@/lib/mcp/registry";

export const runtime = "nodejs";

/** GET: List all MCP servers and templates. */
export async function GET() {
  const servers = getServers();
  return NextResponse.json({ servers, templates: MCP_TEMPLATES });
}

/** POST: Add a new MCP server. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.endpoint) {
    return NextResponse.json(
      { error: "Missing required fields: name, endpoint" },
      { status: 400 },
    );
  }

  const server = addServer({
    name: body.name,
    transport: body.transport || "stdio",
    endpoint: body.endpoint,
    args: body.args,
    env: body.env,
    enabled: body.enabled ?? true,
  });

  return NextResponse.json({ success: true, server });
}

/** PATCH: Update or toggle a server. */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.id) {
    return NextResponse.json(
      { error: "Missing required field: id" },
      { status: 400 },
    );
  }

  if (body.action === "toggle") {
    const enabled = toggleServer(body.id);
    return NextResponse.json({ success: true, enabled });
  }

  const server = updateServer(body.id, body.updates ?? {});
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, server });
}

/** DELETE: Remove a server. */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => null);
  const id = searchParams.get("id") || body?.id;

  if (!id) {
    return NextResponse.json(
      { error: "Missing required field: id" },
      { status: 400 },
    );
  }

  const removed = removeServer(id);
  return NextResponse.json({ success: removed });
}
