import type { EventData } from "@/lib/parse/event";

function formatDateForGCal(date: Date, hasTime: boolean): string {
  if (!hasTime) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generates a 1-click Google Calendar web link pre-populated with title, dates,
 * attendees, location/link, and descriptions.
 */
export function createGoogleCalendarUrl(event: EventData, durationMinutes = 60): string {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const title = encodeURIComponent(event.title || "Meeting");

  let datesParam = "";
  if (event.date) {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const startStr = formatDateForGCal(start, event.hasTime);
    const endStr = formatDateForGCal(end, event.hasTime);
    datesParam = `&dates=${startStr}/${endStr}`;
  }

  const detailsParts: string[] = ["Scheduled via Shapeshift"];
  if (event.people.length > 0) {
    detailsParts.push(`Attendees: ${event.people.join(", ")}`);
  }
  if (event.link) {
    detailsParts.push(`Meeting Mode: ${event.link}`);
  }
  const details = encodeURIComponent(detailsParts.join("\n"));

  const location = encodeURIComponent(event.location || event.link || "");
  const add = event.people.length > 0 ? `&add=${encodeURIComponent(event.people.join(","))}` : "";

  return `${base}&text=${title}${datesParam}&details=${details}&location=${location}${add}`;
}

/**
 * Generates a standard RFC 5545 .ics iCalendar file content compatible with
 * Apple Calendar, Microsoft Outlook, Thunderbird, and Google Calendar.
 */
export function generateIcsContent(event: EventData, durationMinutes = 60): string {
  const start = event.date ? new Date(event.date) : new Date();
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const startStr = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const endStr = end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const nowStr = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `shapeshift-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@shapeshift.app`;

  const attendeesLines = event.people.map((p) => `ATTENDEE;CN=${p}:mailto:unknown@example.com`).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shapeshift//AI Morphing Omnibox//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${event.title || "Meeting"}`,
    `DESCRIPTION:${event.link ? `Meeting link: ${event.link}\\n` : ""}Scheduled with Shapeshift`,
    `LOCATION:${event.location || event.link || ""}`,
    attendeesLines ? attendeesLines : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/**
 * Downloads a standard .ics calendar invite directly in the browser.
 */
export function downloadIcsFile(event: EventData, durationMinutes = 60): void {
  const icsContent = generateIcsContent(event, durationMinutes);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(event.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an Outlook web calendar creation URL.
 */
export function createOutlookCalendarUrl(event: EventData, durationMinutes = 60): string {
  const base = "https://outlook.live.com/calendar/0/deeplink/compose";
  const start = event.date ? new Date(event.date) : new Date();
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const params = new URLSearchParams({
    subject: event.title || "Meeting",
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    location: event.location || event.link || "",
    body: `Scheduled with Shapeshift\nAttendees: ${event.people.join(", ")}`,
  });

  return `${base}?${params.toString()}`;
}

/**
 * Formats a clean human-readable invitation block for pasting anywhere.
 */
export function formatInvitationSummary(event: EventData): string {
  const lines = [`📅 ${event.title || "Meeting"}`];
  if (event.date) {
    lines.push(`🕒 ${event.date.toLocaleString(undefined, { dateStyle: "full", timeStyle: event.hasTime ? "short" : undefined })}`);
  }
  if (event.location || event.link) {
    lines.push(`📍 ${event.location || event.link}`);
  }
  if (event.people.length > 0) {
    lines.push(`👥 Attendees: ${event.people.join(", ")}`);
  }
  return lines.join("\n");
}
