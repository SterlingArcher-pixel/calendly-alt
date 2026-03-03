import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    guest_name,
    guest_email,
    host_name,
    meeting_title,
    meeting_date,
    meeting_time,
    duration_minutes,
    meet_link,
    booking_id,
  } = body;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return NextResponse.json({ sent: false, reason: "No API key" });
  }

  const bookingUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL + "/booking/" + booking_id
    : "https://calendly-alt.vercel.app/booking/" + booking_id;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: #3b82f6; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Interview Confirmed</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px; color: #374151;">Hi <strong>${guest_name}</strong>,</p>
        <p style="margin: 0 0 20px; color: #6b7280;">Your interview has been scheduled. Here are the details:</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #111827;">${meeting_title}</p>
          <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">with ${host_name}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
          <p style="margin: 0 0 4px; color: #374151; font-size: 14px;">📅 ${meeting_date}</p>
          <p style="margin: 0 0 4px; color: #374151; font-size: 14px;">🕐 ${meeting_time} (${duration_minutes} min)</p>
          ${meet_link ? '<p style="margin: 0; font-size: 14px;">📹 <a href="' + meet_link + '" style="color: #3b82f6;">Join Google Meet</a></p>' : ''}
        </div>

        <div style="text-align: center;">
          <a href="${bookingUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Manage Booking
          </a>
        </div>

        <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
          Need to change plans? Use the link above to reschedule or cancel.
        </p>
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Scheduling Tool <onboarding@resend.dev>",
        to: [guest_email],
        subject: "Confirmed: " + meeting_title + " with " + host_name,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return NextResponse.json({ sent: false, error: data });
    }
    return NextResponse.json({ sent: true, id: data.id });
  } catch (err) {
    console.error("Email send failed:", err);
    return NextResponse.json({ sent: false, error: String(err) });
  }
}
