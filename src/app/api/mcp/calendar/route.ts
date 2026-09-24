import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/mcp/google-auth";

export const runtime = "nodejs";

/** GET: List upcoming events or search. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const q = searchParams.get("q")?.trim() || "";
  const days = Math.min(Number(searchParams.get("days")) || 7, 90);
  const maxResults = Math.min(Number(searchParams.get("max")) || 10, 50);

  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({
      connected: false,
      events: [],
      message: "Google Calendar not connected. Connect in Connected Apps or use Calendar web links.",
    });
  }

  const calendar = google.calendar({ version: "v3", auth });

  try {
    if (action === "calendars") {
      const res = await calendar.calendarList.list();
      return NextResponse.json({
        calendars: (res.data.items ?? []).map((c) => ({
          id: c.id,
          summary: c.summary,
          primary: c.primary,
          backgroundColor: c.backgroundColor,
        })),
      });
    }

    // Free/busy check
    if (action === "freebusy") {
      const now = new Date();
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const res = await calendar.freebusy.query({
        requestBody: {
          timeMin: now.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: "primary" }],
        },
      });
      const busy =
        res.data.calendars?.["primary"]?.busy?.map((b) => ({
          start: b.start,
          end: b.end,
        })) ?? [];
      return NextResponse.json({ busy, timeMin: now.toISOString(), timeMax: end.toISOString() });
    }

    // List or search events (default)
    const now = new Date();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
      q: q || undefined,
    });

    const events = (res.data.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary,
      description: e.description,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location,
      hangoutLink: e.hangoutLink,
      htmlLink: e.htmlLink,
      attendees: (e.attendees ?? []).map((a) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
      })),
      status: e.status,
      creator: e.creator?.email,
    }));

    return NextResponse.json({
      query: q || null,
      timeRange: { from: now.toISOString(), to: timeMax.toISOString() },
      events,
    });
  } catch (err) {
    console.error("[calendar]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Calendar API error" },
      { status: 500 },
    );
  }
}

/** POST: Create a new calendar event. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.summary) {
    return NextResponse.json(
      { error: "Missing required field: summary" },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: "Google Calendar not connected. Please connect your Google account in Connected Apps.",
      },
      { status: 401 },
    );
  }

  const calendar = google.calendar({ version: "v3", auth });

  // Build event object
  const start = body.start
    ? new Date(body.start)
    : new Date(Date.now() + 3600 * 1000);
  const durationMs = (body.durationMinutes || 60) * 60 * 1000;
  const end = body.end ? new Date(body.end) : new Date(start.getTime() + durationMs);

  const eventBody: Record<string, unknown> = {
    summary: body.summary,
    description: body.description || "Created by Shapeshift",
    start: {
      dateTime: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  if (body.location) eventBody.location = body.location;
  if (body.attendees?.length) {
    eventBody.attendees = body.attendees.map((a: string | { email: string }) =>
      typeof a === "string" ? { email: a } : a,
    );
  }

  // Add Google Meet link if requested
  if (body.videoCall) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `shapeshift-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  try {
    const res = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: body.videoCall ? 1 : 0,
      requestBody: eventBody,
    });

    return NextResponse.json({
      success: true,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
      hangoutLink: res.data.hangoutLink,
      summary: res.data.summary,
      start: res.data.start?.dateTime,
      end: res.data.end?.dateTime,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create event" },
      { status: 500 },
    );
  }
}
