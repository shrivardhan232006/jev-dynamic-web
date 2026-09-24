import { capitalize, collapse, findDate, removeRange, tidy, titleCase } from "./common";

export type EventData = {
  title: string;
  date: Date | null;
  endDate?: Date | null;
  durationMinutes?: number;
  hasTime: boolean;
  people: string[];
  link: string | null;
  location: string | null;
};

const LINKS: Record<string, string> = {
  zoom: "Zoom",
  meet: "Google Meet",
  "google meet": "Google Meet",
  gmeet: "Google Meet",
  teams: "Teams",
  facetime: "FaceTime",
  skype: "Skype",
  discord: "Discord",
  whatsapp: "WhatsApp",
};

const STOP = /\s+(?:on|at|in|for|about|to|from|via|over)\s+.*$/i;

export function parseEvent(text: string, ref?: Date): EventData {
  let rest = ` ${collapse(text)} `;

  const date = findDate(rest, ref);
  let durationMinutes: number | undefined;
  if (date) {
    rest = removeRange(rest, date.index, date.text.length);
    if (date.end && date.start) {
      const diff = Math.round((date.end.getTime() - date.start.getTime()) / (60 * 1000));
      if (diff > 0) durationMinutes = diff;
    }
  }

  // Strip residual date words or typos that might remain
  rest = rest.replace(/\b(tomorrow|tommorow|tommorrow|tomorow|tmrw|today|yesterday|tonight)\b/gi, "");

  let link: string | null = null;
  const linkRe = /\s(?:on|over|via)\s+(google meet|gmeet|zoom|meet|teams|facetime|skype|discord|whatsapp)\b/i;
  const lm = rest.match(linkRe);
  if (lm && lm.index !== undefined) {
    link = LINKS[lm[1].toLowerCase()] ?? null;
    rest = removeRange(rest, lm.index, lm[0].length);
  }

  let location: string | null = null;
  const locRe = /\s(?:at|in)\s+(?!\d)([a-z][\w' ]{1,40}?)(?=\s+(?:with|on|for)\s|\s*$)/i;
  const loc = rest.match(locRe);
  if (loc && loc.index !== undefined) {
    location = titleCase(loc[1].trim());
    rest = removeRange(rest, loc.index, loc[0].length);
  }

  let people: string[] = [];
  const withRe = /\swith\s+(.+)$/i;
  const wm = rest.match(withRe);
  if (wm && wm.index !== undefined) {
    const segment = wm[1].replace(STOP, "");
    people = segment
      .split(/\s*(?:,|&|\band\b)\s*/i)
      .map((p) => p.trim())
      .filter((p) => p && p.split(" ").length <= 3 && !/^(the|my|a)$/i.test(p))
      .map((p) => titleCase(p));
    rest = rest.slice(0, wm.index) + " " + wm[1].slice(segment.length);
  }

  // Clean command prefixes like "create a task in the calendar to...", "add event to calendar:"
  rest = rest.replace(/\b(?:create|add|schedule|set|put)?\s*(?:a\s+)?(?:task|event|meeting|reminder)\s+(?:in|on|to)\s+(?:the\s+)?calendar(?:\s*(?:to|for|about|:))?\s*/i, " ");
  rest = rest.replace(/\b(?:calendar|agenda|schedule)\s*:\s*/i, " ");
  rest = rest.replace(/\b(?:schedule|create|add)\s+(?:a\s+)?(?:task|event|meeting)\s+(?:to|for|about)?\s*/i, " ");

  const rawTitle = capitalize(tidy(rest));
  const title = rawTitle || (/\btask\b/i.test(text) ? "New Task" : "Untitled event");
  return {
    title,
    date: date?.start ?? null,
    endDate: date?.end ?? null,
    durationMinutes,
    hasTime: date?.hasTime ?? false,
    people,
    link,
    location,
  };
}

export function completeEvent(d: EventData) {
  return (d.title ? 0.35 : 0) + (d.date ? 0.3 : 0) + (d.hasTime ? 0.2 : 0) + (d.people.length || d.link || d.location ? 0.15 : 0);
}
