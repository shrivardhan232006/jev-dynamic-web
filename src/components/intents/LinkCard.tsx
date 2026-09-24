"use client";

import { Check, Copy, ExternalLink, FileCode, FileSpreadsheet, FileText, HardDrive, Image, Link2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LinkData } from "@/lib/parse/link";
import { notify } from "@/lib/notify";
import { sound } from "@/lib/sound";
import { Field, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

type DriveFile = {
  id: string;
  name: string;
  source: "google_drive" | "onedrive" | "local";
  url: string;
  type: string;
  size?: string;
  modified?: string;
};

export function LinkCard({ data, interactive }: CardProps<LinkData>) {
  const [copied, setCopied] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);

  const query = data.driveQuery || data.fileName || "";

  useEffect(() => {
    if (!data.isDrive || !query) return;
    let active = true;
    setLoading(true);

    fetch(`/api/drive/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((json) => {
        if (active && json.files) {
          setFiles(json.files);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [data.isDrive, query]);

  const handleCopyLink = async (urlToCopy: string) => {
    sound.tick();
    await navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    notify("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = (targetUrl: string) => {
    sound.chime();
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    notify("Opening in new tab!");
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "pdf":
      case "document":
        return <FileText className="size-4 text-blue-500" />;
      case "spreadsheet":
        return <FileSpreadsheet className="size-4 text-emerald-500" />;
      case "image":
        return <Image className="size-4 text-purple-500" />;
      case "code":
        return <FileCode className="size-4 text-amber-500" />;
      default:
        return <HardDrive className="size-4 text-muted-foreground" />;
    }
  };

  // Google Drive & Cloud File Card
  if (data.isDrive) {
    return (
      <div className="flex flex-col gap-3.5">
        <Field index={0} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <HardDrive className="size-5" />
            </div>
            <div>
              <h2 className="text-[17px] leading-6 font-[550] tracking-[-0.01em]">
                {data.fileName ? `"${data.fileName}"` : "Drive Files"}
              </h2>
              <Meta className="text-xs">Google Drive & OneDrive Connected</Meta>
            </div>
          </div>

          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-xs">
            Drive Search
          </Badge>
        </Field>

        {/* Primary Action Buttons */}
        {data.url && (
          <Field index={1} className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleOpenLink(data.url!)}
              className="h-8 gap-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium"
            >
              <ExternalLink className="size-3.5" />
              Open in Google Drive
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyLink(data.url!)}
              className="h-8 gap-1.5 rounded-full text-xs font-medium"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy Drive Link"}
            </Button>
          </Field>
        )}

        {/* Matching Files List */}
        <Field index={2} className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-0.5">
            <span className="font-medium flex items-center gap-1">
              <Search className="size-3" />
              {loading ? "Searching Drive & OneDrive..." : `Matching Files (${files.length})`}
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-secondary/30 p-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-background/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="shrink-0">{getIconForType(file.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate text-foreground">{file.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="capitalize">{file.source.replace("_", " ")}</span>
                      {file.size && <span>• {file.size}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleCopyLink(file.url)}
                    title="Copy File Link"
                    className="size-7 rounded-full"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleOpenLink(file.url)}
                    title="Open File"
                    className="size-7 rounded-full text-blue-500"
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {!loading && files.length === 0 && (
              <p className="p-3 text-center text-xs text-muted-foreground">
                No matching files found. Click "Open in Google Drive" to search your entire cloud library.
              </p>
            )}
          </div>
        </Field>
      </div>
    );
  }

  // Standard Web Bookmark Card
  return (
    <div className="flex items-start gap-4">
      <Field index={0}>
        <div className="grid size-12 place-items-center rounded-md bg-foreground text-[20px] font-[550] text-background">
          {data.monogram || <Link2 className="size-6 text-background" />}
        </div>
      </Field>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Field index={1}>
          {data.domain ? <h2 className="text-[17px] leading-6 font-[550] break-all">{data.domain}</h2> : <Missing>Paste a link</Missing>}
        </Field>
        {data.url && (
          <Field index={2}>
            <Meta className="font-mono text-[12px] break-all">{data.url.replace(/^https?:\/\//, "")}</Meta>
          </Field>
        )}
        <Field index={3} className="text-[15px] leading-[22px] text-ink-2">
          {data.note || <span className="text-muted-foreground">No note</span>}
        </Field>

        {interactive && data.url && (
          <Field index={4} className="mt-1 flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => handleOpenLink(data.url!)} className="h-7 text-xs gap-1">
              <ExternalLink className="size-3" />
              Open Link
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleCopyLink(data.url!)} className="h-7 text-xs gap-1">
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </Field>
        )}
      </div>
    </div>
  );
}
