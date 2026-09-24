"use client";

export type WebhookSettings = {
  url: string;
  enabled: boolean;
  autoDispatch: boolean;
};

const STORAGE_KEY = "shapeshift:webhook:settings";

export function getWebhookSettings(): WebhookSettings {
  if (typeof window === "undefined") {
    return { url: "", enabled: false, autoDispatch: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { url: "", enabled: false, autoDispatch: false };
    return JSON.parse(raw);
  } catch {
    return { url: "", enabled: false, autoDispatch: false };
  }
}

export function saveWebhookSettings(settings: WebhookSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable
  }
}

/**
 * Dispatches a payload to the user's configured webhook (Zapier, Make, n8n, Slack, etc.)
 */
export async function dispatchWebhook(payload: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const settings = getWebhookSettings();
  if (!settings.url || !settings.enabled) {
    return { success: false, message: "Webhook not configured or disabled" };
  }

  try {
    const res = await fetch(settings.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        source: "shapeshift",
        dispatchedAt: new Date().toISOString(),
      }),
      mode: "no-cors", // Allows sending to third-party webhooks without CORS errors
    });
    return { success: true, message: "Dispatched to webhook successfully!" };
  } catch (err) {
    return { success: false, message: (err as Error).message || "Failed to dispatch" };
  }
}
