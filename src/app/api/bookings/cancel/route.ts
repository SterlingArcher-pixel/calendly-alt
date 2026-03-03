import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { bookingId, reason } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get booking details before cancelling
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, duration_minutes), hosts(name, email)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Update status
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send cancellation email
  try {
    const start = new Date(booking.starts_at);
    const host = booking.hosts as any;
    const mt = booking.meeting_types as any;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Scheduling Tool <onboarding@resend.dev>",
        to: booking.guest_email,
        subject: `Cancelled: ${mt?.title || "Meeting"} with ${host?.name || "Recruiter"}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px; color: #991B1B; font-size: 18px;">Interview Cancelled</h2>
              <p style="margin: 0; color: #DC2626; font-size: 14px;">
                Your ${mt?.title || "meeting"} has been cancelled.
              </p>
            </div>
            <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">
                <strong>What:</strong> ${mt?.title || "Meeting"}
              </p>
              <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">
                <strong>When:</strong> ${start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
              <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">
                <strong>With:</strong> ${host?.name || "Recruiter"}
              </p>
              ${reason ? `<p style="margin: 8px 0 0; font-size: 14px; color: #6B7280;"><strong>Reason:</strong> ${reason}</p>` : ""}
            </div>
            <p style="font-size: 13px; color: #9CA3AF; text-align: center;">
              Sent by Scheduling Tool
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      console.error("Cancel email failed:", await res.text());
    }
  } catch (e) {
    console.error("Cancel email error:", e);
  }

  return NextResponse.json({ success: true });
}
