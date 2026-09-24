"use client";

import {
  ExternalLink,
  Inbox,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  Send,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { sound } from "@/lib/sound";
import { Field, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

export type GmailData = {
  query: string;
  action: "search" | "compose";
  to?: string;
  subject?: string;
  body?: string;
};

type EmailResult = {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  url: string;
  labelIds?: string[];
};

function extractSenderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return from.split("@")[0];
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function GmailCard({
  data,
  interactive,
}: CardProps<GmailData>) {
  const [emails, setEmails] = useState<EmailResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(true);
  const [resultCount, setResultCount] = useState(0);

  useEffect(() => {
    if (!data.query) return;
    let active = true;
    setLoading(true);

    fetch(`/api/mcp/gmail?q=${encodeURIComponent(data.query)}&max=8`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.connected === false) {
          setConnected(false);
          return;
        }
        if (json.emails) {
          setEmails(json.emails);
          setResultCount(json.resultCount ?? json.emails.length);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [data.query]);

  const handleOpenEmail = (url: string) => {
    sound.chime();
    window.open(url, "_blank", "noopener,noreferrer");
    notify("Opening email in Gmail!");
  };

  const handleSearchInGmail = () => {
    sound.chime();
    window.open(
      `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(data.query)}`,
      "_blank",
    );
    notify("Opening search in Gmail!");
  };

  const handleRefresh = () => {
    sound.tick();
    setLoading(true);
    fetch(`/api/mcp/gmail?q=${encodeURIComponent(data.query)}&max=8`)
      .then((res) => res.json())
      .then((json) => {
        if (json.emails) {
          setEmails(json.emails);
          setResultCount(json.resultCount ?? json.emails.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  if (!connected) {
    return (
      <div className="flex flex-col gap-3">
        <Field index={0} className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
            <Mail className="size-5" />
          </div>
          <div>
            <h2 className="text-[17px] leading-6 font-[550]">Gmail</h2>
            <Meta className="text-xs">Not connected — click Connected Apps to set up</Meta>
          </div>
        </Field>
        <Field index={1}>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSearchInGmail}
            className="h-8 gap-1.5 rounded-full text-xs font-medium"
          >
            <ExternalLink className="size-3.5" />
            Search in Gmail Web
          </Button>
        </Field>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Field index={0} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
            <Mail className="size-5" />
          </div>
          <div>
            <h2 className="text-[17px] leading-6 font-[550] tracking-[-0.01em]">
              {data.query ? `"${data.query}"` : "Gmail"}
            </h2>
            <Meta className="text-xs">
              {loading
                ? "Searching Gmail..."
                : `${resultCount} result${resultCount !== 1 ? "s" : ""}`}
            </Meta>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {interactive && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleRefresh}
              className="size-7 rounded-full"
              title="Refresh"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Badge
            variant="outline"
            className="border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 text-xs"
          >
            <Inbox className="size-3 mr-1" />
            Gmail
          </Badge>
        </div>
      </Field>

      {/* Action buttons */}
      {interactive && (
        <Field index={1} className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleSearchInGmail}
            className="h-8 gap-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 text-xs font-medium"
          >
            <Search className="size-3.5" />
            Open in Gmail
          </Button>
          {data.action === "compose" && data.to && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                sound.chime();
                const mailto = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(data.to ?? "")}&su=${encodeURIComponent(data.subject ?? "")}&body=${encodeURIComponent(data.body ?? "")}`;
                window.open(mailto, "_blank");
                notify("Opening compose in Gmail!");
              }}
              className="h-8 gap-1.5 rounded-full text-xs font-medium"
            >
              <Send className="size-3.5" />
              Compose Email
            </Button>
          )}
        </Field>
      )}

      {/* Email results list */}
      <Field index={2} className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-0.5">
          <span className="font-medium flex items-center gap-1">
            <MailOpen className="size-3" />
            {loading ? "Searching..." : `Emails (${emails.length})`}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-secondary/30 p-1">
          {emails.map((email) => (
            <button
              key={email.id}
              type="button"
              onClick={() => handleOpenEmail(email.url)}
              className="flex items-start gap-2.5 rounded-md p-2.5 hover:bg-background/80 transition-colors text-left group w-full"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground mt-0.5">
                <User className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate text-foreground">
                    {extractSenderName(email.from)}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {formatDate(email.date)}
                  </span>
                </div>
                <p className="text-xs font-medium truncate text-foreground/90 mt-0.5">
                  {email.subject || "(no subject)"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {email.snippet}
                </p>
              </div>
              <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-60 text-muted-foreground mt-1" />
            </button>
          ))}

          {!loading && emails.length === 0 && (
            <p className="p-3 text-center text-xs text-muted-foreground">
              {data.query
                ? "No matching emails found. Click \"Open in Gmail\" to search your full inbox."
                : "Type an email search query"}
            </p>
          )}
        </div>
      </Field>
    </div>
  );
}

export function parseGmail(text: string): GmailData {
  const trimmed = text.trim();

  // Check for compose patterns
  const composeMatch = trimmed.match(
    /^(?:email|mail|send|write)\s+(?:to\s+)?(.+?)(?:\s+(?:about|regarding|re:?)\s+(.+))?$/i,
  );
  if (composeMatch) {
    return {
      query: trimmed,
      action: "compose",
      to: composeMatch[1],
      subject: composeMatch[2] || "",
    };
  }

  // Extract search query from common patterns
  const searchPatterns = [
    /^(?:emails?|mail|inbox|gmail)\s+(?:from|by)\s+(.+)/i,
    /^(?:emails?|mail|inbox|gmail)\s+(?:about|regarding|re:?)\s+(.+)/i,
    /^(?:search|find|look for)\s+(?:emails?|mail)\s+(?:from|by|about)?\s*(.+)/i,
    /^(?:emails?|mail|inbox|gmail)\s+(.+)/i,
  ];

  for (const re of searchPatterns) {
    const m = trimmed.match(re);
    if (m) {
      return { query: m[1].trim(), action: "search" };
    }
  }

  return { query: trimmed, action: "search" };
}

export function completeGmail(d: GmailData): number {
  return d.query ? 0.8 : 0;
}
