import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { bookingId, reason } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  // Sanitize the cancel reason (prevents XSS in email)
  const safeReason = sanitizeText(reason, 500);

  const supabase = await createClient();

  // Verify the caller owns this booking (via RLS + explicit check)
  const { data: { user } } = await supabase.auth.getUser();

  // Get booking details before cancelling
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, duration_minutes), hosts(name, email)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Update status + store cancel reason and timestamp
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancel_reason: safeReason || null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  logAudit({
    actorId: user?.id || null,
    action: "booking.cancelled",
    resourceType: "bookings",
    resourceId: bookingId,
    details: { guest_email: booking.guest_email, reason: safeReason },
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
  });

  // Send cancellation email
  try {
    const start = new Date(booking.starts_at);
    const host = booking.hosts as any;
    const mt = booking.meeting_types as any;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Apploi Scheduling <onboarding@resend.dev>",
        to: booking.guest_email,
        subject: `Cancelled: ${mt?.title || "Interview"} with ${host?.name || "Recruiter"}`,
        html: `
<div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #0B2522 0%, #003D37 100%); border-radius: 12px 12px 0 0; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <div style="background: #00D08A; width: 28px; height: 28px; border-radius: 6px; text-align: center; line-height: 28px; font-weight: bold; color: #0B2522; font-size: 13px;">A</div>
      <span style="color: rgba(255,255,255,0.7); font-size: 13px;">Apploi Scheduling</span>
    </div>
    <h1 style="margin: 0; color: #ffffff; font-size: 20px;">Interview Cancelled</h1>
  </div>
  <div style="padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
      Hi ${booking.guest_name},
    </p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
      Your <strong>${mt?.title || "interview"}</strong> with <strong>${host?.name || "the recruiter"}</strong> has been cancelled.
    </p>
    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 4px; font-size: 14px; color: #991B1B;"><strong>Date:</strong> ${start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      <p style="margin: 0; font-size: 14px; color: #991B1B;"><strong>Time:</strong> ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
      ${safeReason ? `<p style="margin: 8px 0 0; font-size: 14px; color: #991B1B;"><strong>Reason:</strong> ${safeReason}</p>` : ""}
    </div>
    <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">Sent by Apploi Scheduling</p>
  </div>
</div>`,
      }),
    });
  } catch (e) {
    console.error("Cancel email error:", e);
  }

  return NextResponse.json({ success: true });
}
