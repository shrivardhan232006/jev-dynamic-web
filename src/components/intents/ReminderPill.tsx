"use client";

import { Check, Clock, ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReminderData } from "@/lib/parse/reminder";
import { notify } from "@/lib/notify";
import { sound } from "@/lib/sound";
import { Chip, Field, formatWhen, Missing } from "./shared";
import type { CardProps } from "./types";

export function ReminderPill({ data, interactive }: CardProps<ReminderData>) {
  const [created, setCreated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const when = data.when ? formatWhen(data.when, data.hasTime) : null;

  const handleCreateInCalendar = async () => {
    if (creating || !data.task) return;
    setCreating(true);
    sound.tick();
    try {
      const startTime = data.when ?? new Date(Date.now() + 3600 * 1000);
      const res = await fetch("/api/mcp/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: data.task,
          start: startTime.toISOString(),
          durationMinutes: 30,
          description: `Reminder / Task created via Shapeshift`,
        }),
      });
      const result = await res.json();
      if (result.success && result.eventId) {
        sound.chime();
        setCreated(true);
        if (result.htmlLink) {
          setCreatedLink(result.htmlLink);
        }
        notify("Added directly to your Google Calendar! 🎉");
      } else {
        notify(result.error || "Failed to create task in calendar");
      }
    } catch {
      notify("Failed to connect to Google Calendar API");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Field index={0} className="flex flex-wrap items-center justify-between gap-3">
        {data.task ? (
          <h2 className="min-w-0 text-[17px] leading-6 font-[550] tracking-[-0.01em] text-pretty break-words">{data.task}</h2>
        ) : (
          <Missing>No task yet</Missing>
        )}
        {when ? (
          <Chip icon={Clock} className="shrink-0">
            {when.time ? `${when.day}, ${when.time}` : when.day}
          </Chip>
        ) : (
          <Chip icon={Clock} className="shrink-0 text-muted-foreground">
            Anytime
          </Chip>
        )}
      </Field>

      {interactive && data.task && (
        <Field index={1} className="pt-2 border-t border-border/50 flex items-center justify-between">
          {created ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Check className="size-3.5" />
                Added to Google Calendar
              </span>
              {createdLink && (
                <a
                  href={createdLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 hover:underline"
                >
                  View
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleCreateInCalendar}
              disabled={creating}
              className="h-8 gap-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium shadow-xs"
            >
              <Plus className="size-3.5" />
              {creating ? "Adding..." : "Add to Google Calendar"}
            </Button>
          )}
        </Field>
      )}
    </div>
  );
}
