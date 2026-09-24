export type PasswordData = {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  label: string;
};

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*_+-=?";

export function parsePassword(text: string): PasswordData {
  const t = text.toLowerCase().trim();

  const lengthMatch = t.match(/\b(\d{1,3})\s*(?:char(?:acter)?s?|ch|len(?:gth)?|digits?|long)?\b/);
  let length = lengthMatch ? Number(lengthMatch[1]) : 16;
  if (length < 4) length = 16;
  if (length > 128) length = 128;

  const includeNumbers = !/\b(no\s*(?:numbers?|digits?)|alpha(?:betic)?(?:\s*only)?)\b/.test(t);
  const includeSymbols = !/\b(no\s*(?:symbols?|special|punctuation)|alpha(?:numeric)?(?:\s*only)?)\b/.test(t);
  const includeUppercase = !/\b(no\s*(?:upper(?:case)?|caps?)|lower(?:case)?\s*only)\b/.test(t);
  const includeLowercase = !/\b(no\s*(?:lower(?:case)?)|upper(?:case)?\s*only)\b/.test(t);

  // Build a label from the context
  let label = "Strong password";
  const pinMatch = /\b(pin|otp|numeric)\b/.test(t);
  if (pinMatch) label = "PIN / OTP";
  else if (/\b(api\s*key|token)\b/.test(t)) label = "API key";
  else if (/\b(passphrase)\b/.test(t)) label = "Passphrase";

  return {
    length,
    includeUppercase: pinMatch ? false : includeUppercase,
    includeLowercase: pinMatch ? false : includeLowercase,
    includeNumbers,
    includeSymbols: pinMatch ? false : includeSymbols,
    label,
  };
}

export function generatePassword(data: PasswordData): string {
  let pool = "";
  if (data.includeUppercase) pool += UPPER;
  if (data.includeLowercase) pool += LOWER;
  if (data.includeNumbers) pool += DIGITS;
  if (data.includeSymbols) pool += SYMBOLS;
  if (!pool) pool = LOWER + DIGITS;

  const arr = new Uint32Array(data.length);
  crypto.getRandomValues(arr);
  let result = Array.from(arr, (n) => pool[n % pool.length]).join("");

  // Guarantee at least one from each enabled set
  const guarantee: string[] = [];
  if (data.includeUppercase && !/[A-Z]/.test(result)) guarantee.push(UPPER);
  if (data.includeLowercase && !/[a-z]/.test(result)) guarantee.push(LOWER);
  if (data.includeNumbers && !/[0-9]/.test(result)) guarantee.push(DIGITS);
  if (data.includeSymbols && !/[!@#$%^&*_+\-=?]/.test(result)) guarantee.push(SYMBOLS);

  for (let i = 0; i < guarantee.length && i < result.length; i++) {
    const set = guarantee[i];
    const pos = Math.floor(Math.random() * result.length);
    const ch = set[Math.floor(Math.random() * set.length)];
    result = result.slice(0, pos) + ch + result.slice(pos + 1);
  }

  return result;
}

export function completePassword(): number {
  return 1;
}
