import { createClient } from "@supabase/supabase-js";
import { refreshAccessToken, createCalendarEvent } from "@/lib/google-calendar";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      facility_id: body.facility_id || null,
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

  // Send confirmation email (fire and forget via Resend directly)
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "Apploi Scheduling <onboarding@resend.dev>",
        to: guest_email,
        subject: `Confirmed: ${meetingType.title} on ${new Date(startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
        html: `<div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #0B2522 0%, #003D37 100%); border-radius: 12px 12px 0 0; padding: 24px;"><h1 style="margin: 0; color: #fff; font-size: 20px;">Interview Confirmed</h1></div><div style="padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;"><p style="margin: 0 0 12px; font-size: 14px; color: #374151;">Hi ${guest_name},</p><p style="margin: 0 0 16px; font-size: 14px; color: #374151;">Your <strong>${meetingType.title}</strong> with <strong>${host.name}</strong> is confirmed.</p><div style="background: #F8F6F3; border-radius: 8px; padding: 16px; margin-bottom: 16px;"><p style="margin: 0 0 4px; font-size: 14px;"><strong>Date:</strong> ${new Date(startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p><p style="margin: 0 0 4px; font-size: 14px;"><strong>Time:</strong> ${new Date(startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (${meetingType.duration_minutes} min)</p>${googleMeetLink ? `<p style="margin: 0; font-size: 14px;"><strong>Join:</strong> <a href="${googleMeetLink}" style="color: #00A1AB;">${googleMeetLink}</a></p>` : ""}</div><p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">Sent by Apploi Scheduling</p></div></div>`,
      }),
    }).catch((e) => console.error("Confirmation email failed:", e));
  }

  return NextResponse.json({
    booking,
    booking_id: booking.id,
    meet_link: googleMeetLink,
  });
}
