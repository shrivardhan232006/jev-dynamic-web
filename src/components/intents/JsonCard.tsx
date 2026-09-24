"use client";

import { AlertCircle, Check, Copy, FileJson } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { JsonData } from "@/lib/parse/json";
import { Field, Meta } from "./shared";
import type { CardProps } from "./types";

export function JsonCard({ data, interactive }: CardProps<JsonData>) {
  const [copied, setCopied] = useState(false);
  const [showMinified, setShowMinified] = useState(false);

  const copyToClipboard = useCallback(async () => {
    const text = showMinified && data.formatted
      ? JSON.stringify(JSON.parse(data.formatted))
      : (data.formatted ?? data.input);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [data, showMinified]);

  if (data.error) {
    return (
      <div className="flex flex-col gap-3">
        <Field index={0} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="size-4" />
            <Meta>JSON Error</Meta>
          </div>
          <div className="rounded-lg bg-red-500/10 px-4 py-3 font-mono text-[13px] text-red-400">
            {data.error}
          </div>
          {data.input.length > 0 && (
            <pre className="max-h-32 overflow-auto rounded-lg bg-secondary px-4 py-3 font-mono text-[13px] leading-relaxed text-ink-2">
              {data.input.slice(0, 500)}
            </pre>
          )}
        </Field>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Field index={0} className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Meta>
            {data.keyCount} key{data.keyCount !== 1 ? "s" : ""} · {data.lineCount} line{data.lineCount !== 1 ? "s" : ""} · {formatBytes(data.sizeBytes)}
          </Meta>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={showMinified ? "outline" : "default"}
              onClick={() => setShowMinified(false)}
              disabled={!interactive}
              className="h-6 px-2 text-[11px]"
            >
              Pretty
            </Button>
            <Button
              size="sm"
              variant={showMinified ? "default" : "outline"}
              onClick={() => setShowMinified(true)}
              disabled={!interactive}
              className="h-6 px-2 text-[11px]"
            >
              Minified
            </Button>
          </div>
        </div>
        <pre className="max-h-48 overflow-auto rounded-lg bg-secondary px-4 py-3 font-mono text-[13px] leading-relaxed">
          {showMinified
            ? JSON.stringify(JSON.parse(data.formatted!))
            : data.formatted}
        </pre>
      </Field>
      <Field index={1} className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={copyToClipboard} disabled={!interactive} className="gap-1.5 px-3">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </Field>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
