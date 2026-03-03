export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to refresh token");
  return data.access_token;
}

export async function createCalendarEvent({
  accessToken,
  summary,
  description,
  startTime,
  endTime,
  attendeeEmail,
  attendeeName,
}: {
  accessToken: string;
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  attendeeEmail: string;
  attendeeName: string;
}) {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: startTime },
        end: { dateTime: endTime },
        attendees: [{ email: attendeeEmail, displayName: attendeeName }],
        conferenceData: {
          createRequest: {
            requestId: `calendlyalt-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 1440 },
            { method: "popup", minutes: 30 },
          ],
        },
      }),
    }
  );
  const data = await res.json();
  return {
    eventId: data.id,
    meetLink: data.conferenceData?.entryPoints?.[0]?.uri || null,
    htmlLink: data.htmlLink,
  };
}

export async function deleteCalendarEvent({
  accessToken,
  eventId,
}: {
  accessToken: string;
  eventId: string;
}) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return res.ok;
}

export async function updateCalendarEvent({
  accessToken,
  eventId,
  summary,
  description,
  startTime,
  endTime,
  attendeeEmail,
  attendeeName,
}: {
  accessToken: string;
  eventId: string;
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  attendeeEmail: string;
  attendeeName: string;
}) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: startTime },
        end: { dateTime: endTime },
        attendees: [{ email: attendeeEmail, displayName: attendeeName }],
      }),
    }
  );
  const data = await res.json();
  return {
    eventId: data.id,
    meetLink: data.conferenceData?.entryPoints?.[0]?.uri || null,
  };
}
