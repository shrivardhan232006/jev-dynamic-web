import { capitalize, collapse, tidy } from "./common";

export type LinkData = {
  url: string | null;
  domain: string | null;
  monogram: string;
  note: string;
  isDrive?: boolean;
  driveQuery?: string;
  fileName?: string;
};

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|dev|io|app|org|net|co|ai|in|so|xyz|me|design|sh|gg|tv)(?:\/[^\s]*)?)/i;

const DRIVE_KEYWORD_RE = /\b(?:google\s+drive|drive|gdrive|onedrive)\b/i;

function extractDriveQuery(text: string): string {
  return text
    .replace(/^https?:\/\/drive\.google\.com[^\s]*/i, "")
    // Remove leading request phrases
    .replace(
      /^(?:give\s+(?:me\s+)?(?:the\s+)?|get\s+(?:me\s+)?(?:the\s+)?|find\s+(?:me\s+)?(?:the\s+)?|show\s+(?:me\s+)?(?:the\s+)?|search\s+(?:for\s+)?|open\s+|where\s+is\s+(?:the\s+)?|what\s+is\s+(?:the\s+)?|link\s+(?:to\s+|for\s+)?|url\s+(?:to\s+|for\s+)?|file\s+(?:of\s+|for\s+)?)+/i,
      "",
    )
    // Remove trailing drive target phrases like "from the drive", "on drive", "in google drive"
    .replace(
      /(?:\s+(?:in|on|from|of|at|inside)\s+(?:the\s+|my\s+)?(?:google\s+)?(?:drive|onedrive|gdrive))\b.*$/i,
      "",
    )
    .replace(/\b(?:google\s+drive|drive|onedrive|gdrive)\b/gi, "")
    .replace(/\s+(?:in|on|from|at)$/i, "")
    .replace(/^(?:the\s+|my\s+|a\s+|an\s+)/i, "")
    .trim();
}

export function parseLink(text: string): LinkData {
  const trimmed = text.trim();

  // Check if it's an explicit Drive search instruction
  const isDriveQuery =
    /drive\.google\.com/i.test(trimmed) ||
    (DRIVE_KEYWORD_RE.test(trimmed) &&
      !/^https?:\/\/(?!drive\.google\.com)/i.test(trimmed));

  if (isDriveQuery) {
    const cleanQuery = extractDriveQuery(trimmed) || "files";
    const driveUrl = /https?:\/\/drive\.google\.com/i.test(trimmed)
      ? trimmed.match(URL_RE)?.[0] ??
        `https://drive.google.com/drive/search?q=${encodeURIComponent(cleanQuery)}`
      : `https://drive.google.com/drive/search?q=${encodeURIComponent(cleanQuery)}`;

    return {
      url: driveUrl,
      domain: "drive.google.com",
      monogram: "▲",
      note: `Search for "${cleanQuery}" in Drive`,
      isDrive: true,
      driveQuery: cleanQuery,
      fileName: cleanQuery,
    };
  }

  const m = text.match(URL_RE);
  if (!m) return { url: null, domain: null, monogram: "", note: capitalize(tidy(text)) };
  const raw = m[1].replace(/[.,)]+$/, "");
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let domain: string | null = null;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    domain = raw.replace(/^https?:\/\//, "").split("/")[0];
  }
  const note = capitalize(tidy(collapse(text.replace(m[0], " "))));
  const isDrive = domain?.includes("drive.google.com") || domain?.includes("onedrive.live.com");

  return {
    url,
    domain,
    monogram: isDrive ? "▲" : (domain?.[0] ?? "").toUpperCase(),
    note,
    isDrive,
  };
}

export function completeLink(d: LinkData) {
  if (d.isDrive) return 0.95;
  return (d.url ? 0.8 : 0) + (d.note ? 0.2 : 0);
}
