"use client";

import {
  Calendar,
  Check,
  ChevronDown,
  ExternalLink,
  Globe,
  HardDrive,
  Inbox,
  Layers,
  Mail,
  MessageSquare,
  Music,
  Play,
  Plug,
  Plus,
  Power,
  Send,
  Settings,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createGoogleCalendarUrl } from "@/lib/integrations/calendar";
import {
  dispatchWebhook,
  getWebhookSettings,
  saveWebhookSettings,
  type WebhookSettings,
} from "@/lib/integrations/webhook";
import { notify } from "@/lib/notify";
import { sound } from "@/lib/sound";

type GoogleAuthStatus = {
  configured: boolean;
  connected: boolean;
  scopes: string[];
};

type McpServerConfig = {
  id: string;
  name: string;
  transport: string;
  endpoint: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
};

type McpTemplate = {
  name: string;
  transport: string;
  endpoint: string;
  args?: string[];
  env?: Record<string, string>;
};

type TabId = "google" | "mcp" | "settings";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const TAB_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GitHub: GithubIcon,
  Notion: Globe,
  Slack: MessageSquare,
  Spotify: Music,
  Filesystem: HardDrive,
};

export function ConnectedAppsModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("google");
  const [soundActive, setSoundActive] = useState(true);
  const [webhook, setWebhook] = useState<WebhookSettings>({
    url: "",
    enabled: false,
    autoDispatch: false,
  });
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Google auth state
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus>({
    configured: false,
    connected: false,
    scopes: [],
  });
  const [googleLoading, setGoogleLoading] = useState(false);

  // MCP state
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [templates, setTemplates] = useState<McpTemplate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServer, setNewServer] = useState({
    name: "",
    endpoint: "",
    args: "",
    envKey: "",
    envVal: "",
  });

  useEffect(() => {
    if (!open) return;
    setSoundActive(sound.isEnabled());
    setWebhook(getWebhookSettings());

    // Fetch Google auth status
    fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then(setGoogleStatus)
      .catch(() => {});

    // Fetch MCP servers
    fetch("/api/mcp/servers")
      .then((r) => r.json())
      .then((data) => {
        setServers(data.servers ?? []);
        setTemplates(data.templates ?? []);
      })
      .catch(() => {});
  }, [open]);

  const toggleSound = () => {
    const next = sound.toggle();
    setSoundActive(next);
    if (next) sound.tick();
    notify(next ? "Sound effects enabled" : "Sound effects muted");
  };

  const handleSaveWebhook = () => {
    sound.tick();
    saveWebhookSettings(webhook);
    notify("Webhook settings saved!");
  };

  const handleTestWebhook = async () => {
    sound.tick();
    setTestStatus("Sending...");
    const res = await dispatchWebhook({
      test: true,
      message: "Hello from Shapeshift!",
      intent: "event",
      summary: "Product demo with team",
    });
    setTestStatus(res.success ? "Success!" : "Failed");
    notify(res.message);
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleConnectGoogle = () => {
    sound.chime();
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  };

  const handleDisconnectGoogle = async () => {
    sound.tick();
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    setGoogleStatus({ ...googleStatus, connected: false });
    notify("Google account disconnected");
  };

  const handleTestGoogleCalendar = async () => {
    sound.tick();
    try {
      const res = await fetch("/api/mcp/calendar?max=1");
      const data = await res.json();
      if (data.events !== undefined) {
        sound.chime();
        notify(`Google Calendar connected! ${data.events.length} upcoming event(s) loaded.`);
      } else {
        notify("Calendar check: " + (data.message || data.error || "Not connected"));
      }
    } catch {
      notify("Failed to connect to Google Calendar API");
    }
  };

  const handleAddFromTemplate = async (template: McpTemplate) => {
    sound.tick();
    const res = await fetch("/api/mcp/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });
    const data = await res.json();
    if (data.server) {
      setServers((s) => [...s, data.server]);
      notify(`${template.name} MCP server added!`);
    }
  };

  const handleAddCustomServer = async () => {
    if (!newServer.name || !newServer.endpoint) return;
    sound.tick();
    const env: Record<string, string> = {};
    if (newServer.envKey && newServer.envVal) {
      env[newServer.envKey] = newServer.envVal;
    }
    const res = await fetch("/api/mcp/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newServer.name,
        transport: "stdio",
        endpoint: newServer.endpoint,
        args: newServer.args
          ? newServer.args.split(" ").filter(Boolean)
          : [],
        env: Object.keys(env).length > 0 ? env : undefined,
        enabled: true,
      }),
    });
    const data = await res.json();
    if (data.server) {
      setServers((s) => [...s, data.server]);
      setNewServer({ name: "", endpoint: "", args: "", envKey: "", envVal: "" });
      setShowAddForm(false);
      notify(`${newServer.name} added!`);
    }
  };

  const handleDeleteServer = async (id: string) => {
    sound.tick();
    await fetch("/api/mcp/servers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setServers((s) => s.filter((srv) => srv.id !== id));
    notify("MCP server removed");
  };

  const handleToggleServer = async (id: string) => {
    sound.tick();
    const res = await fetch("/api/mcp/servers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "toggle" }),
    });
    const data = await res.json();
    setServers((s) =>
      s.map((srv) => (srv.id === id ? { ...srv, enabled: data.enabled } : srv)),
    );
  };

  const tabs: { id: TabId; label: string; icon: typeof Zap }[] = [
    { id: "google", label: "Google Apps", icon: Inbox },
    { id: "mcp", label: "MCP Servers", icon: Plug },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => sound.tick()}
          className="fixed top-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-md transition-all hover:border-foreground/30 hover:text-foreground"
        >
          <Plug className="size-3.5 text-brand" />
          <span>Connected Apps</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Zap className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Connected Apps & Integrations
              </DialogTitle>
              <DialogDescription className="text-xs">
                Connect Google services, MCP servers, and automation tools.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                sound.tick();
                setTab(t.id);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 py-1">
          {/* ═══════ TAB 1: Google Apps ═══════ */}
          {tab === "google" && (
            <>
              {/* Connect / Disconnect button */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-gradient-to-r from-blue-500/5 via-red-500/5 to-amber-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Globe className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Google Account</h4>
                      <p className="text-xs text-muted-foreground">
                        {googleStatus.connected
                          ? "Drive, Gmail, and Calendar are connected"
                          : googleStatus.configured
                            ? "Click Connect to link your Google account"
                            : "Add GOOGLE_CLIENT_ID to .env.local"}
                      </p>
                    </div>
                  </div>
                  {googleStatus.connected ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDisconnectGoogle}
                      className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                    >
                      <Power className="size-3" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleConnectGoogle}
                      disabled={!googleStatus.configured || googleLoading}
                      className="h-7 text-xs gap-1"
                    >
                      <ExternalLink className="size-3" />
                      {googleLoading ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Google Drive */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-card/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <HardDrive className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Google Drive & Local Files
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {googleStatus.connected
                          ? "Search real Drive files by name. Try: \"drive resume\""
                          : "URL redirect mode — connect Google for real file search"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={
                      googleStatus.connected ? "connected" : "url-redirect"
                    }
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      sound.chime();
                      window.open(
                        "https://drive.google.com/drive/my-drive",
                        "_blank",
                      );
                      notify("Opening Google Drive library!");
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <ExternalLink className="size-3" />
                    Open Drive Library
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Type &quot;drive &lt;filename&gt;&quot; into omnibox
                  </span>
                </div>
              </div>

              {/* Gmail */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-card/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Gmail</h4>
                      <p className="text-xs text-muted-foreground">
                        {googleStatus.connected
                          ? "Search & read emails. Try: \"emails from Rahul\""
                          : "Connect Google account to enable email search"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={googleStatus.connected ? "connected" : "not-connected"}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      sound.chime();
                      window.open("https://mail.google.com", "_blank");
                      notify("Opening Gmail!");
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <ExternalLink className="size-3" />
                    Open Gmail
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Type &quot;email from &lt;name&gt;&quot; or &quot;inbox &lt;query&gt;&quot;
                  </span>
                </div>
              </div>

              {/* Google Calendar */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-card/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Calendar className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Google Calendar</h4>
                      <p className="text-xs text-muted-foreground">
                        {googleStatus.connected
                          ? "Create events directly, view upcoming schedule"
                          : "URL redirect mode — connect Google for direct event creation"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={
                      googleStatus.connected ? "connected" : "url-redirect"
                    }
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestGoogleCalendar}
                    className="h-7 text-xs gap-1"
                  >
                    <Play className="size-3 text-blue-500" />
                    Test Calendar Connection
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Appears automatically on Event cards
                  </span>
                </div>
              </div>

              {/* Apple Calendar & Outlook */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-card/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Layers className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Apple Calendar & Outlook
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Exports universal RFC 5545{" "}
                        <code className="text-[11px]">.ics</code> files for
                        native Mac, iOS & Windows.
                      </p>
                    </div>
                  </div>
                  <StatusBadge status="ready" />
                </div>
              </div>
            </>
          )}

          {/* ═══════ TAB 2: MCP Servers ═══════ */}
          {tab === "mcp" && (
            <>
              <p className="text-xs text-muted-foreground -mt-1">
                Connect external tools via the{" "}
                <a
                  href="https://modelcontextprotocol.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline underline-offset-2"
                >
                  Model Context Protocol
                </a>
                . Add pre-built servers or configure your own.
              </p>

              {/* Existing servers */}
              {servers.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Your Servers
                  </h4>
                  {servers.map((srv) => {
                    const Icon = TAB_ICON_MAP[srv.name] ?? Plug;
                    return (
                      <div
                        key={srv.id}
                        className="rounded-xl border border-border/70 p-3 bg-card/60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex size-8 items-center justify-center rounded-md ${
                                srv.enabled
                                  ? "bg-brand/10 text-brand"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              <Icon className="size-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">
                                {srv.name}
                              </h4>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {srv.endpoint}{" "}
                                {srv.args?.join(" ")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleToggleServer(srv.id)}
                              className="size-7 rounded-full"
                              title={
                                srv.enabled ? "Disable" : "Enable"
                              }
                            >
                              <Power
                                className={`size-3.5 ${srv.enabled ? "text-emerald-500" : "text-muted-foreground"}`}
                              />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleDeleteServer(srv.id)}
                              className="size-7 rounded-full text-red-500 hover:text-red-600"
                              title="Remove"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick-add templates */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Add Popular Servers
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {templates
                    .filter(
                      (t) =>
                        !servers.some(
                          (s) =>
                            s.name.toLowerCase() ===
                            t.name.toLowerCase(),
                        ),
                    )
                    .map((t) => {
                      const Icon = TAB_ICON_MAP[t.name] ?? Plug;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => handleAddFromTemplate(t)}
                          className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 p-2.5 text-left transition-all hover:border-brand/50 hover:bg-brand/5 group"
                        >
                          <div className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {t.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {t.args?.[1] || t.endpoint}
                            </p>
                          </div>
                          <Plus className="size-3 ml-auto text-muted-foreground group-hover:text-brand" />
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Custom server form */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.tick();
                    setShowAddForm(!showAddForm);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                >
                  <ChevronDown
                    className={`size-3 transition-transform ${showAddForm ? "rotate-180" : ""}`}
                  />
                  Add Custom MCP Server
                </button>

                {showAddForm && (
                  <div className="rounded-xl border border-border/70 p-3.5 bg-card/60 flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Server name"
                        value={newServer.name}
                        onChange={(e) =>
                          setNewServer({
                            ...newServer,
                            name: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Command (e.g. npx)"
                        value={newServer.endpoint}
                        onChange={(e) =>
                          setNewServer({
                            ...newServer,
                            endpoint: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <Input
                      placeholder="Args (e.g. -y @package/name)"
                      value={newServer.args}
                      onChange={(e) =>
                        setNewServer({
                          ...newServer,
                          args: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Env var name"
                        value={newServer.envKey}
                        onChange={(e) =>
                          setNewServer({
                            ...newServer,
                            envKey: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Env var value"
                        value={newServer.envVal}
                        onChange={(e) =>
                          setNewServer({
                            ...newServer,
                            envVal: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddCustomServer}
                      disabled={!newServer.name || !newServer.endpoint}
                      className="h-8 text-xs w-full"
                    >
                      <Plus className="size-3 mr-1" />
                      Add Server
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════ TAB 3: Settings ═══════ */}
          {tab === "settings" && (
            <>
              {/* WhatsApp & Messaging */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-card/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <MessageSquare className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        WhatsApp & Sharing
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        1-click sharing of bill splits, event invites,
                        and todo checklists into chats.
                      </p>
                    </div>
                  </div>
                  <StatusBadge status="ready" />
                </div>
              </div>

              {/* Custom Webhooks */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-card/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Globe className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Custom Webhooks (Zapier, Make, Slack)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Send structured intent JSON to any automation
                        workflow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-border/40">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://hooks.zapier.com/... or Make / Slack webhook"
                      value={webhook.url}
                      onChange={(e) =>
                        setWebhook({
                          ...webhook,
                          url: e.target.value,
                          enabled: Boolean(e.target.value),
                        })
                      }
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveWebhook}
                      className="h-8 text-xs"
                    >
                      Save
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={webhook.autoDispatch}
                        onChange={(e) => {
                          const next = {
                            ...webhook,
                            autoDispatch: e.target.checked,
                          };
                          setWebhook(next);
                          saveWebhookSettings(next);
                        }}
                        className="rounded border-border text-brand focus:ring-brand"
                      />
                      <span>Auto-dispatch every saved card to webhook</span>
                    </label>

                    {webhook.url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestWebhook}
                        className="h-6 text-[11px] gap-1"
                      >
                        <Send className="size-2.5" />
                        {testStatus || "Test Webhook"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 p-3 bg-secondary/30">
                <div className="flex items-center gap-2">
                  {soundActive ? (
                    <Volume2 className="size-4 text-brand" />
                  ) : (
                    <VolumeX className="size-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs font-medium">
                      Interactive Audio Feedback
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Synthesized tactile clicks and completion chimes
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleSound}
                  className="h-7 text-xs"
                >
                  {soundActive ? "Mute" : "Enable"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({
  status,
}: {
  status: "connected" | "ready" | "url-redirect" | "not-connected";
}) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="size-3" /> Connected
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="size-3" /> Ready
      </span>
    );
  }
  if (status === "url-redirect") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        URL Redirect
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      Not Connected
    </span>
  );
}
