import "server-only";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { type McpServerConfig, type McpToolInfo } from "./registry";

type McpConnection = {
  client: Client;
  transport: StdioClientTransport;
  tools: McpToolInfo[];
};

const connections = new Map<string, McpConnection>();

/** Connect to an MCP server and discover its tools. */
export async function connectServer(
  config: McpServerConfig,
): Promise<{ tools: McpToolInfo[]; error?: string }> {
  // Only stdio transport supported for local MCP servers
  if (config.transport !== "stdio") {
    return {
      tools: [],
      error: `Transport "${config.transport}" is not yet supported. Use "stdio" for local MCP servers.`,
    };
  }

  // Disconnect existing connection if any
  await disconnectServer(config.id);

  try {
    const transport = new StdioClientTransport({
      command: config.endpoint,
      args: config.args ?? [],
      env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
    });

    const client = new Client(
      { name: "shapeshift", version: "1.0.0" },
      { capabilities: {} },
    );

    await client.connect(transport);

    // Discover tools
    const toolsResult = await client.listTools();
    const tools: McpToolInfo[] = (toolsResult.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown> | undefined,
    }));

    connections.set(config.id, { client, transport, tools });
    return { tools };
  } catch (err) {
    return {
      tools: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Call a tool on a connected MCP server. */
export async function callTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<{ result: unknown; error?: string }> {
  const conn = connections.get(serverId);
  if (!conn) {
    return { result: null, error: "Server not connected" };
  }

  try {
    const result = await conn.client.callTool({ name: toolName, arguments: args });
    return { result: result.content };
  } catch (err) {
    return {
      result: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Disconnect an MCP server. */
export async function disconnectServer(serverId: string): Promise<void> {
  const conn = connections.get(serverId);
  if (!conn) return;
  try {
    await conn.client.close();
  } catch {
    // ignore cleanup errors
  }
  connections.delete(serverId);
}

/** Get currently connected server IDs. */
export function getConnectedServers(): string[] {
  return Array.from(connections.keys());
}

/** Get discovered tools for a connected server. */
export function getServerTools(serverId: string): McpToolInfo[] {
  return connections.get(serverId)?.tools ?? [];
}
