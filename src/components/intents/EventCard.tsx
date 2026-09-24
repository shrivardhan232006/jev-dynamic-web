"use client";

import { CalendarDays, Check, Clock, Copy, Download, ExternalLink, MapPin, Phone, Plus, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EventData } from "@/lib/parse/event";
import { downloadIcsFile, formatInvitationSummary } from "@/lib/integrations/calendar";
import { notify } from "@/lib/notify";
import { sound } from "@/lib/sound";
import { Chip, Field, formatWhen, IconSwap, Missing, Placeholder } from "./shared";
import type { CardProps } from "./types";

const DURATIONS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
];

const TIME_PRESETS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
];

export function EventCard({ data, signals, interactive }: CardProps<EventData>) {
  const [overrideDate, setOverrideDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState(data.durationMinutes ?? 60);
  const [copied, setCopied] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  useEffect(() => {
    if (data.durationMinutes) {
      setDuration(data.durationMinutes);
    }
  }, [data.durationMinutes]);

  useEffect(() => {
    fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then((s) => setGoogleConnected(s.connected))
      .catch(() => {});
  }, []);

  const date = overrideDate ?? data.date;
  const when = date ? formatWhen(date, data.hasTime) : null;
  const endTime = date ? new Date(date.getTime() + duration * 60 * 1000) : null;
  const timeDisplay = when?.time
    ? duration > 0 && duration !== 60 && endTime
      ? `${when.time} – ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: endTime.getMinutes() ? "2-digit" : undefined })}`
      : when.time
    : null;

  const mode = data.link ? "video_call" : signals.eventMode;
  const placeIcon = mode === "video_call" ? Video : mode === "phone_call" ? Phone : MapPin;
  const place = data.link ?? data.location ?? (mode === "video_call" ? "Video call" : mode === "phone_call" ? "Phone call" : null);

  const effectiveDate = date ?? new Date(Date.now() + 3600 * 1000);
  const effectiveEvent: EventData = {
    ...data,
    date: effectiveDate,
  };


  const handleDirectCreate = async () => {
    if (creating) return;
    setCreating(true);
    sound.tick();
    try {
      const res = await fetch("/api/mcp/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: data.title || "Meeting",
          start: effectiveDate.toISOString(),
          durationMinutes: duration,
          location: data.location || data.link || undefined,
          attendees: data.people.filter((p) => p.includes("@")),
          videoCall: mode === "video_call",
          description: `Attendees: ${data.people.join(", ")}\nCreated by Shapeshift`,
        }),
      });
      const result = await res.json();
      if (result.success) {
        sound.chime();
        setCreated(true);
        if (result.htmlLink) {
          setCreatedLink(result.htmlLink);
        }
        notify("Added directly to your Google Calendar! 🎉");
      } else {
        notify(result.error || "Failed to create event in calendar");
      }
    } catch {
      notify("Failed to connect to Google Calendar API");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadIcs = () => {
    sound.chime();
    downloadIcsFile(effectiveEvent, duration);
    notify("Downloaded .ics file for Apple Calendar / Outlook!");
  };

  const handleCopyInvite = async () => {
    sound.tick();
    const text = formatInvitationSummary(effectiveEvent);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    notify("Event invitation copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectPresetTime = (timeStr: string) => {
    sound.tick();
    const [timePart, modifier] = timeStr.split(" ");
    const [hoursStr, minutesStr] = timePart.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const base = date ? new Date(date) : new Date();
    base.setHours(hours, minutes, 0, 0);
    setOverrideDate(base);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <Field index={0}>
        {data.title ? (
          <h2 className="text-[17px] leading-6 font-[550] tracking-[-0.01em] text-balance">{data.title}</h2>
        ) : (
          <Missing>Untitled event</Missing>
        )}
      </Field>

      <Field index={1} className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild disabled={!interactive}>
            <button
              type="button"
              onClick={() => sound.tick()}
              aria-label={when ? `Date: ${when.day}. Change date` : "Add date"}
              className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {when ? <Chip icon={CalendarDays}>{when.day}</Chip> : <Placeholder>Add date</Placeholder>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date ?? undefined}
              onSelect={(d) => {
                if (d) {
                  sound.tick();
                  setOverrideDate(withTime(d, date));
                }
              }}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild disabled={!interactive}>
            <button
              type="button"
              onClick={() => sound.tick()}
              className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {timeDisplay ? <Chip icon={Clock}>{timeDisplay}</Chip> : <Placeholder insert=" at ">Add time</Placeholder>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Select Time</p>
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto pt-1">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectPresetTime(t)}
                  className="rounded px-2 py-1 text-xs hover:bg-secondary text-left font-medium transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Duration selector */}
        {interactive && (
          <div className="flex items-center gap-1 rounded-full border border-border/80 bg-secondary/50 p-0.5 text-xs">
            {DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => {
                  sound.tick();
                  setDuration(d.value);
                }}
                className={`rounded-full px-2 py-0.5 font-medium transition-all ${
                  duration === d.value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field index={2} className="flex items-center gap-2 text-[15px] leading-[22px] text-ink-2">
        <span className="text-muted-foreground">
          <IconSwap icon={placeIcon} iconClassName="size-5" />
        </span>
        {place ? <span>{place}</span> : <Placeholder insert=" at ">Add place</Placeholder>}
      </Field>

      <Field index={3} className="flex items-center gap-2">
        {data.people.length ? (
          <>
            <div className="flex -space-x-1.5">
              {data.people.map((p) => (
                <Avatar key={p} className="size-7 ring-2 ring-card">
                  <AvatarFallback className="bg-secondary text-[11px] font-semibold text-ink-2">{initials(p)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-[15px] text-ink-2">{data.people.join(", ")}</span>
          </>
        ) : (
          <Placeholder insert=" with ">Add people</Placeholder>
        )}
      </Field>

      {/* App Integration Quick Actions */}
      {interactive && (
        <Field index={4} className="mt-1 pt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
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
              onClick={handleDirectCreate}
              disabled={creating}
              className="h-8 gap-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium shadow-xs"
            >
              <Plus className="size-3.5" />
              {creating ? "Adding..." : "Add to Google Calendar"}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadIcs}
            className="h-8 gap-1.5 rounded-full text-xs font-medium hover:bg-secondary"
          >
            <Download className="size-3.5" />
            .ics (Apple / Outlook)
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyInvite}
            className="h-8 gap-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Details"}
          </Button>
        </Field>
      )}
    </div>
  );
}

function withTime(day: Date, prev: Date | null) {
  const d = new Date(day);
  if (prev) d.setHours(prev.getHours(), prev.getMinutes());
  return d;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
