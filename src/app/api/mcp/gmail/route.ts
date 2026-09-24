import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/mcp/google-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const action = searchParams.get("action") || "search";
  const messageId = searchParams.get("id");
  const maxResults = Math.min(Number(searchParams.get("max")) || 10, 20);

  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({
      query: q,
      connected: false,
      resultCount: 1,
      emails: [
        {
          id: `gmail-search-${encodeURIComponent(q || "inbox")}`,
          threadId: "fallback-thread",
          snippet: q
            ? `Search Gmail for "${q}". Connect Google Account in Connected Apps for real-time mailbox access.`
            : "Open Gmail Inbox directly, or connect your Google Account in Connected Apps.",
          subject: q ? `Search Gmail: "${q}"` : "Open Gmail Inbox",
          from: "Google Mail <mail-noreply@google.com>",
          date: new Date().toLocaleDateString(),
          url: q
            ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(q)}`
            : "https://mail.google.com/mail/u/0/#inbox",
        },
      ],
    });
  }

  const gmail = google.gmail({ version: "v1", auth });

  try {
    // Read a specific email
    if (action === "read" && messageId) {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "To", "Date"],
      });

      const headers = msg.data.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value ?? "";

      return NextResponse.json({
        id: msg.data.id,
        threadId: msg.data.threadId,
        snippet: msg.data.snippet,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        to: getHeader("To"),
        date: getHeader("Date"),
        labelIds: msg.data.labelIds,
        url: `https://mail.google.com/mail/u/0/#inbox/${msg.data.id}`,
      });
    }

    // List labels
    if (action === "labels") {
      const labels = await gmail.users.labels.list({ userId: "me" });
      return NextResponse.json({
        labels: (labels.data.labels ?? []).map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
        })),
      });
    }

    // Search emails (default action)
    const query = q || "is:inbox";
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });

    const messages = res.data.messages ?? [];

    // Fetch metadata for each message
    const emails = await Promise.all(
      messages.slice(0, maxResults).map(async (m) => {
        try {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: m.id!,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "Date"],
          });

          const headers = msg.data.payload?.headers ?? [];
          const getHeader = (name: string) =>
            headers.find(
              (h) => h.name?.toLowerCase() === name.toLowerCase(),
            )?.value ?? "";

          return {
            id: msg.data.id,
            threadId: msg.data.threadId,
            snippet: msg.data.snippet,
            subject: getHeader("Subject"),
            from: getHeader("From"),
            date: getHeader("Date"),
            labelIds: msg.data.labelIds,
            url: `https://mail.google.com/mail/u/0/#inbox/${msg.data.id}`,
          };
        } catch {
          return null;
        }
      }),
    );

    return NextResponse.json({
      query,
      resultCount: res.data.resultSizeEstimate ?? 0,
      emails: emails.filter(Boolean),
    });
  } catch (err) {
    console.error("[gmail]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Gmail API error",
      },
      { status: 500 },
    );
  }
}

/** Send an email (write access). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.to || !body?.subject) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject" },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedClient();
  if (!auth) {
    const mailto = `mailto:${encodeURIComponent(body.to)}?subject=${encodeURIComponent(body.subject)}&body=${encodeURIComponent(body.body || "")}`;
    return NextResponse.json({
      success: true,
      connected: false,
      fallbackMailto: mailto,
      message: "Google account not connected. Use the mailto link or connect in Connected Apps.",
    });
  }

  const gmail = google.gmail({ version: "v1", auth });

  const rawEmail = [
    `To: ${body.to}`,
    `Subject: ${body.subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    "",
    body.body || "",
  ].join("\r\n");

  const encodedEmail = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedEmail },
    });

    return NextResponse.json({
      success: true,
      messageId: res.data.id,
      threadId: res.data.threadId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to send email",
      },
      { status: 500 },
    );
  }
}
