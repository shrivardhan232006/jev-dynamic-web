export type JsonData = {
  input: string;
  formatted: string | null;
  error: string | null;
  lineCount: number;
  keyCount: number;
  sizeBytes: number;
};

export function parseJson(text: string): JsonData {
  const t = text.trim();

  // Strip leading command words
  const stripped = t
    .replace(/^(?:format|prettify|parse|validate|beautify|lint|minify|pretty\s*print|json)\s+/i, "")
    .replace(/^(?:format|prettify|parse|validate|beautify|lint|minify|pretty\s*print|json)\s+/i, "")
    .trim();

  // Try to extract JSON from the text
  const jsonStr = extractJson(stripped) ?? extractJson(t);

  if (!jsonStr) {
    return { input: t, formatted: null, error: "No valid JSON found", lineCount: 0, keyCount: 0, sizeBytes: 0 };
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const formatted = JSON.stringify(parsed, null, 2);
    const keyCount = countKeys(parsed);
    return {
      input: jsonStr,
      formatted,
      error: null,
      lineCount: formatted.split("\n").length,
      keyCount,
      sizeBytes: new Blob([jsonStr]).size,
    };
  } catch (err) {
    return {
      input: jsonStr,
      formatted: null,
      error: err instanceof Error ? err.message : "Invalid JSON",
      lineCount: 0,
      keyCount: 0,
      sizeBytes: new Blob([jsonStr]).size,
    };
  }
}

function extractJson(text: string): string | null {
  // Already starts with { or [
  if (/^[\[{]/.test(text.trim())) return text.trim();

  // Try finding JSON within the text
  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    try {
      JSON.parse(braceMatch[1]);
      return braceMatch[1];
    } catch {
      // not valid
    }
  }

  const bracketMatch = text.match(/(\[[\s\S]*\])/);
  if (bracketMatch) {
    try {
      JSON.parse(bracketMatch[1]);
      return bracketMatch[1];
    } catch {
      // not valid
    }
  }

  return null;
}

function countKeys(obj: unknown): number {
  if (obj === null || typeof obj !== "object") return 0;
  if (Array.isArray(obj)) return obj.reduce((sum: number, item) => sum + countKeys(item), 0);
  const entries = Object.entries(obj as Record<string, unknown>);
  return entries.length + entries.reduce((sum: number, [, v]) => sum + countKeys(v), 0);
}

export function completeJson(d: JsonData): number {
  if (d.formatted) return 1;
  if (d.error && d.input.length > 2) return 0.6;
  return 0;
}
