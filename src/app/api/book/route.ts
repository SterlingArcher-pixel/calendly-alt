import { createClient } from "@supabase/supabase-js";
import { refreshAccessToken, createCalendarEvent } from "@/lib/google-calendar";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { host_id, meeting_type_id, guest_name, guest_email, guest_notes, date, time, timezone } = body;

  if (!host_id || !meeting_type_id || !guest_name || !guest_email || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get meeting type
  const { data: meetingType } = await supabase
    .from("meeting_types").select("*").eq("id", meeting_type_id).single();

  if (!meetingType) {
    return NextResponse.json({ error: "Meeting type not found" }, { status: 404 });
  }

  // Get host
  const { data: host } = await supabase
    .from("hosts").select("*").eq("id", host_id).single();

  if (!host) {
    return NextResponse.json({ error: "Host not found" }, { status: 404 });
  }

  // Build timestamps
  const startsAt = new Date(`${date}T${time}:00`);
  const endsAt = new Date(startsAt);
  endsAt.setMinutes(endsAt.getMinutes() + meetingType.duration_minutes);

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from("bookings").select("id").eq("host_id", host_id)
    .in("status", ["confirmed", "rescheduled"])
    .lt("starts_at", endsAt.toISOString()).gt("ends_at", startsAt.toISOString());

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
  }

  // Try to create Google Calendar event
  let googleEventId = null;
  let googleMeetLink = null;

  if (host.google_refresh_token) {
    try {
      const accessToken = await refreshAccessToken(host.google_refresh_token);

      const calEvent = await createCalendarEvent({
        accessToken,
        summary: `${meetingType.title} - ${guest_name}`,
        description: `Booked via CalendlyAlt\n\nGuest: ${guest_name}\nEmail: ${guest_email}${guest_notes ? `\nNotes: ${guest_notes}` : ""}`,
        startTime: startsAt.toISOString(),
        endTime: endsAt.toISOString(),
        attendeeEmail: guest_email,
        attendeeName: guest_name,
      });

      if (calEvent) {
        googleEventId = calEvent.eventId;
        googleMeetLink = calEvent.meetLink;
      }
    } catch (e) {
      console.error("Calendar event creation failed:", e);
    }
  }

  // Create the booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      host_id,
      meeting_type_id,
      guest_name,
      guest_email,
      guest_notes: guest_notes || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      timezone: timezone || "America/Denver",
      status: "confirmed",
      google_event_id: googleEventId,
      google_meet_link: googleMeetLink,
    })
    .select()
    .single();

  if (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Send confirmation email (fire and forget)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://calendly-alt.vercel.app";
  fetch(siteUrl + "/api/send-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guest_name: guest_name,
      guest_email: guest_email,
      host_name: host.name,
      meeting_title: meetingType.title,
      meeting_date: new Date(startsAt).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      }),
      meeting_time: new Date(startsAt).toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit"
      }),
      duration_minutes: meetingType.duration_minutes,
      meet_link: googleMeetLink,
      booking_id: booking.id,
    }),
  }).catch((e) => console.error("Email send failed:", e));

  return NextResponse.json({
    booking,
    booking_id: booking.id,
    meet_link: googleMeetLink,
  });
}
