import "server-only";
import fs from "fs";
import path from "path";

export type McpTransport = "stdio" | "sse" | "streamable-http";

export type McpServerConfig = {
  id: string;
  name: string;
  transport: McpTransport;
  /** For stdio: the command to run. For sse/http: the URL. */
  endpoint: string;
  /** For stdio: optional args array. */
  args?: string[];
  /** Environment variables to pass to the server. */
  env?: Record<string, string>;
  enabled: boolean;
  /** Discovered tools from this server. */
  tools?: McpToolInfo[];
};

export type McpToolInfo = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

const CONFIG_PATH = path.join(process.cwd(), "mcp-config.json");

/** Pre-built templates for popular MCP servers. */
export const MCP_TEMPLATES: Omit<McpServerConfig, "id" | "enabled" | "tools">[] = [
  {
    name: "GitHub",
    transport: "stdio",
    endpoint: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: "" },
  },
  {
    name: "Filesystem",
    transport: "stdio",
    endpoint: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
  },
  {
    name: "Notion",
    transport: "stdio",
    endpoint: "npx",
    args: ["-y", "@notionhq/notion-mcp-server"],
    env: { OPENAPI_MCP_HEADERS: "" },
  },
  {
    name: "Slack",
    transport: "stdio",
    endpoint: "npx",
    args: ["-y", "@anthropic/slack-mcp"],
    env: { SLACK_BOT_TOKEN: "", SLACK_TEAM_ID: "" },
  },
  {
    name: "Spotify",
    transport: "stdio",
    endpoint: "npx",
    args: ["-y", "spotify-mcp"],
    env: { SPOTIFY_CLIENT_ID: "", SPOTIFY_CLIENT_SECRET: "" },
  },
];

function loadConfig(): McpServerConfig[] {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return [];
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveConfig(servers: McpServerConfig[]): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(servers, null, 2), "utf-8");
  } catch {
    console.warn("[mcp-registry] Failed to save config");
  }
}

export function getServers(): McpServerConfig[] {
  return loadConfig();
}

export function getServer(id: string): McpServerConfig | undefined {
  return loadConfig().find((s) => s.id === id);
}

export function addServer(config: Omit<McpServerConfig, "id">): McpServerConfig {
  const servers = loadConfig();
  const id = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const server: McpServerConfig = { ...config, id };
  servers.push(server);
  saveConfig(servers);
  return server;
}

export function updateServer(id: string, updates: Partial<McpServerConfig>): McpServerConfig | null {
  const servers = loadConfig();
  const idx = servers.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  servers[idx] = { ...servers[idx], ...updates, id };
  saveConfig(servers);
  return servers[idx];
}

export function removeServer(id: string): boolean {
  const servers = loadConfig();
  const filtered = servers.filter((s) => s.id !== id);
  if (filtered.length === servers.length) return false;
  saveConfig(filtered);
  return true;
}

export function toggleServer(id: string): boolean {
  const servers = loadConfig();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  server.enabled = !server.enabled;
  saveConfig(servers);
  return server.enabled;
}
