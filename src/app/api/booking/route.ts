import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  refreshAccessToken,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/google-calendar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - fetch booking details
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes, slug), hosts(name, email, avatar_url)")
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking });
}

// PATCH - cancel or reschedule
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { booking_id, action, new_starts_at, new_ends_at } = body;

  if (!booking_id || !action) {
    return NextResponse.json({ error: "Missing booking_id or action" }, { status: 400 });
  }

  // Fetch booking
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, duration_minutes), hosts(google_refresh_token)")
    .eq("id", booking_id)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
  }

  const host = booking.hosts as any;
  const mt = booking.meeting_types as any;

  // Try to get Google access token
  let accessToken: string | null = null;
  if (host?.google_refresh_token) {
    try {
      accessToken = await refreshAccessToken(host.google_refresh_token);
    } catch (e) {
      console.error("Failed to refresh token:", e);
    }
  }

  if (action === "cancel") {
    // Update booking status
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking_id);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
    }

    // Delete Google Calendar event
    if (accessToken && booking.google_event_id) {
      try {
        await deleteCalendarEvent({
          accessToken,
          eventId: booking.google_event_id,
        });
      } catch (e) {
        console.error("Failed to delete calendar event:", e);
      }
    }

    return NextResponse.json({ success: true, message: "Booking cancelled" });
  }

  if (action === "reschedule") {
    if (!new_starts_at || !new_ends_at) {
      return NextResponse.json({ error: "Missing new time" }, { status: 400 });
    }

    // Update booking with new time
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        starts_at: new_starts_at,
        ends_at: new_ends_at,
        status: "rescheduled",
      })
      .eq("id", booking_id);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to reschedule booking" }, { status: 500 });
    }

    // Update Google Calendar event
    let meetLink = booking.google_meet_link;
    if (accessToken && booking.google_event_id) {
      try {
        const result = await updateCalendarEvent({
          accessToken,
          eventId: booking.google_event_id,
          summary: `${mt?.title || "Meeting"} with ${booking.guest_name}`,
          description: `Rescheduled meeting.\n\nGuest: ${booking.guest_name}\nEmail: ${booking.guest_email}`,
          startTime: new_starts_at,
          endTime: new_ends_at,
          attendeeEmail: booking.guest_email,
          attendeeName: booking.guest_name,
        });
        if (result.meetLink) meetLink = result.meetLink;
      } catch (e) {
        console.error("Failed to update calendar event:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Booking rescheduled",
      meet_link: meetLink,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
