import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { bookingId, newStartsAt, newEndsAt } = await req.json();

  if (!bookingId || !newStartsAt || !newEndsAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, duration_minutes), hosts(name, email)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("bookings")
    .update({ starts_at: newStartsAt, ends_at: newEndsAt, status: "rescheduled" })
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send reschedule email
  try {
    const newStart = new Date(newStartsAt);
    const host = booking.hosts as any;
    const mt = booking.meeting_types as any;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Scheduling Tool <onboarding@resend.dev>",
        to: booking.guest_email,
        subject: `Rescheduled: ${mt?.title || "Meeting"} with ${host?.name || "Recruiter"}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px; color: #92400E; font-size: 18px;">Interview Rescheduled</h2>
              <p style="margin: 0; color: #B45309; font-size: 14px;">
                Your ${mt?.title || "meeting"} has been moved to a new time.
              </p>
            </div>
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">New Time</p>
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #15803D;">
                ${newStart.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <p style="margin: 4px 0 0; font-size: 14px; color: #16A34A;">
                ${newStart.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (${mt?.duration_minutes || 30} min)
              </p>
            </div>
            ${booking.google_meet_link ? `
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${booking.google_meet_link}" style="display: inline-block; background: #16A34A; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                  Join Google Meet
                </a>
              </div>
            ` : ""}
            <p style="font-size: 13px; color: #9CA3AF; text-align: center;">
              Sent by Scheduling Tool
            </p>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error("Reschedule email error:", e);
  }

  return NextResponse.json({ success: true });
}
