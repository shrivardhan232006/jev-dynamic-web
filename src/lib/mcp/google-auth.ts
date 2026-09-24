import "server-only";
import { google, type Auth } from "googleapis";
import fs from "fs";
import path from "path";

const TOKEN_PATH = path.join(process.cwd(), ".google-tokens.json");

// Full read+write scopes as requested
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
];

type StoredTokens = {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
};

function getCredentials() {
  let clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/auth/google/callback";

  if (!clientId || !clientSecret) {
    return null;
  }
  // Strip accidental http:// or https:// if pasted by mistake
  clientId = clientId.replace(/^https?:\/\//i, "");

  return { clientId, clientSecret, redirectUri };
}

function createOAuth2Client(): Auth.OAuth2Client | null {
  const creds = getCredentials();
  if (!creds) return null;
  return new google.auth.OAuth2(
    creds.clientId,
    creds.clientSecret,
    creds.redirectUri,
  );
}

/** Save tokens to a local file or /tmp (Vercel serverless fallback). */
function saveTokens(tokens: StoredTokens): void {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf-8");
    return;
  } catch {
    // Root filesystem is read-only on Vercel; fallback to /tmp
  }

  try {
    fs.writeFileSync(
      path.join("/tmp", ".google-tokens.json"),
      JSON.stringify(tokens, null, 2),
      "utf-8",
    );
  } catch {
    console.warn("[google-auth] Failed to save tokens to disk or /tmp");
  }
}

/** Load tokens from environment variables, local file, or /tmp. */
function loadTokens(): StoredTokens | null {
  // 1. Support GOOGLE_TOKENS_JSON or GOOGLE_REFRESH_TOKEN env vars for zero-config Vercel personal use
  if (process.env.GOOGLE_TOKENS_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_TOKENS_JSON);
    } catch {
      // ignore parse error
    }
  }

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return {
      access_token: "",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN.trim(),
      expiry_date: 0,
      token_type: "Bearer",
      scope: SCOPES.join(" "),
    };
  }

  // 2. Check local file or /tmp
  const candidates = [
    TOKEN_PATH,
    path.join("/tmp", ".google-tokens.json"),
    path.join(process.env.TMPDIR || "/tmp", ".google-tokens.json"),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
      }
    } catch {
      // continue checking next candidate
    }
  }

  return null;
}

/** Delete stored tokens (disconnect). */
export function clearTokens(): void {
  const candidates = [
    TOKEN_PATH,
    path.join("/tmp", ".google-tokens.json"),
    path.join(process.env.TMPDIR || "/tmp", ".google-tokens.json"),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }
}

/** Generate the Google OAuth consent URL. */
export function getAuthUrl(): string | null {
  const client = createOAuth2Client();
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

/** Exchange the authorization code for tokens and save them. */
export async function exchangeCode(
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const client = createOAuth2Client();
  if (!client) return { success: false, error: "OAuth not configured" };

  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return {
        success: false,
        error: "Missing access_token or refresh_token",
      };
    }
    saveTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ?? Date.now() + 3600 * 1000,
      token_type: tokens.token_type ?? "Bearer",
      scope: tokens.scope ?? SCOPES.join(" "),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Get an authenticated OAuth2 client with valid tokens, auto-refreshing if needed. */
export async function getAuthenticatedClient(): Promise<Auth.OAuth2Client | null> {
  const client = createOAuth2Client();
  if (!client) return null;

  const tokens = loadTokens();
  if (!tokens) return null;

  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    token_type: tokens.token_type,
  });

  // Auto-refresh if access token is missing or expired
  if (
    !tokens.access_token ||
    (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60_000)
  ) {
    try {
      const { credentials } = await client.refreshAccessToken();
      if (credentials.access_token) {
        tokens.access_token = credentials.access_token;
        tokens.expiry_date = credentials.expiry_date ?? Date.now() + 3600 * 1000;
        client.setCredentials(credentials);
        saveTokens({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token ?? tokens.refresh_token,
          expiry_date:
            credentials.expiry_date ?? Date.now() + 3600 * 1000,
          token_type: credentials.token_type ?? "Bearer",
          scope: tokens.scope,
        });
      }
    } catch {
      console.warn("[google-auth] Token refresh failed");
      return null;
    }
  }

  return client;
}

/** Check if Google OAuth is configured and connected. */
export function getGoogleAuthStatus(): {
  configured: boolean;
  connected: boolean;
  scopes: string[];
} {
  const creds = getCredentials();
  const tokens = loadTokens();
  return {
    configured: creds !== null,
    connected:
      tokens !== null && (!!tokens.access_token || !!tokens.refresh_token),
    scopes: SCOPES,
  };
}
