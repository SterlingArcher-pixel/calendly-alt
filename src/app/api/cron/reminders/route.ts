import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_KEY = process.env.RESEND_API_KEY!;

const HEALTHCARE_PREP: Record<string, string[]> = {
  "rn initial phone screen": [
    "Have your RN license number ready for verification",
    "Prepare to discuss your clinical experience and specialties",
    "Find a quiet space for this 15-minute phone call",
    "Have questions ready about the facility and team",
  ],
  "cna interview": [
    "Bring your CNA certification and a valid photo ID",
    "Wear professional attire (scrubs are fine)",
    "Be prepared to discuss patient care scenarios",
    "Arrive 10 minutes early to complete paperwork",
  ],
  "director of nursing panel": [
    "This is a panel interview with the leadership team",
    "Prepare to discuss staffing strategies and quality metrics",
    "Bring copies of your resume and any certifications",
    "Plan for a 45-60 minute comprehensive discussion",
  ],
  "medical assistant meet & greet": [
    "This is a casual 15-minute conversation with the team",
    "Bring your MA certification if applicable",
    "Great opportunity to ask questions about daily workflow",
    "No formal presentation needed — just be yourself",
  ],
  "lpn screening": [
    "Have your LPN/LVN license number available",
    "Be ready to discuss medication administration experience",
    "We'll cover scheduling availability and shift preferences",
    "This is a quick 15-minute screening call",
  ],
};

function getPrepBullets(meetingTypeTitle: string): string[] {
  const key = meetingTypeTitle.toLowerCase();
  return HEALTHCARE_PREP[key] || [
    "Review the job description before your interview",
    "Prepare questions about the role and team",
    "Bring a valid photo ID and any relevant certifications",
    "Arrive 5-10 minutes early (or be ready for the call)",
  ];
}

function buildPrepEmail(booking: any, host: any, mt: any): string {
  const start = new Date(booking.starts_at);
  const bullets = getPrepBullets(mt?.title || "");
  const bulletHtml = bullets
    .map(
      (b) =>
        `<tr><td style="padding: 6px 0; vertical-align: top; color: #00D08A; font-size: 16px; width: 24px;">✓</td><td style="padding: 6px 0; font-size: 14px; color: #374151;">${b}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0B2522 0%, #003D37 100%); border-radius: 12px 12px 0 0; padding: 28px 24px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="background: #00D08A; width: 28px; height: 28px; border-radius: 6px; text-align: center; line-height: 28px; font-weight: bold; color: #0B2522; font-size: 13px;">A</div>
          <span style="color: rgba(255,255,255,0.7); font-size: 13px;">Apploi Scheduling</span>
        </div>
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Prepare for Your Interview</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.6); font-size: 14px;">${mt?.title || "Interview"} with ${host?.name || "your interviewer"}</p>
      </div>
      <div style="padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="background: #F8F6F3; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; font-size: 13px; color: #6B7280; width: 70px;">📅 Date</td>
              <td style="padding: 4px 0; font-size: 14px; color: #111827; font-weight: 500;">${start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 13px; color: #6B7280;">⏰ Time</td>
              <td style="padding: 4px 0; font-size: 14px; color: #111827; font-weight: 500;">${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (${mt?.duration_minutes || 30} min)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 13px; color: #6B7280;">👤 With</td>
              <td style="padding: 4px 0; font-size: 14px; color: #111827; font-weight: 500;">${host?.name || "Recruiter"}</td>
            </tr>
            ${booking.google_meet_link ? `<tr><td style="padding: 4px 0; font-size: 13px; color: #6B7280;">📹 Link</td><td style="padding: 4px 0;"><a href="${booking.google_meet_link}" style="color: #00A1AB; font-size: 14px; font-weight: 500;">Join Google Meet</a></td></tr>` : ""}
          </table>
        </div>
        <h3 style="margin: 0 0 12px; font-size: 15px; color: #111827;">What to Prepare</h3>
        <table style="border-collapse: collapse;">${bulletHtml}</table>
        <p style="margin: 20px 0 0; font-size: 12px; color: #9CA3AF; text-align: center;">Sent by Apploi Scheduling</p>
      </div>
    </div>
  `;
}

function buildReminderEmail(booking: any, host: any, mt: any, hoursUntil: string): string {
  const start = new Date(booking.starts_at);
  const urgencyColor = hoursUntil === "2 hours" ? "#F59E0B" : "#00A1AB";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0B2522 0%, #003D37 100%); border-radius: 12px 12px 0 0; padding: 24px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div style="background: #00D08A; width: 28px; height: 28px; border-radius: 6px; text-align: center; line-height: 28px; font-weight: bold; color: #0B2522; font-size: 13px;">A</div>
          <span style="color: rgba(255,255,255,0.7); font-size: 13px;">Apploi Scheduling</span>
        </div>
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
          ${hoursUntil === "2 hours" ? "⏰ Starting Soon!" : "🔔 Interview Tomorrow"}
        </h1>
      </div>
      <div style="padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <div style="background: ${urgencyColor}10; border-left: 3px solid ${urgencyColor}; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #111827;">
            Your <strong>${mt?.title || "interview"}</strong> is in <strong>${hoursUntil}</strong>
          </p>
        </div>
        <div style="background: #F8F6F3; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #374151;">
            <strong>📅</strong> ${start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <p style="margin: 0 0 6px; font-size: 14px; color: #374151;">
            <strong>⏰</strong> ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (${mt?.duration_minutes || 30} min)
          </p>
          <p style="margin: 0; font-size: 14px; color: #374151;">
            <strong>👤</strong> ${host?.name || "Your interviewer"}
          </p>
        </div>
        ${booking.google_meet_link ? `<a href="${booking.google_meet_link}" style="display: inline-block; background: #00A1AB; color: white; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none;">Join Google Meet →</a>` : ""}
        <p style="margin: 20px 0 0; font-size: 12px; color: #9CA3AF; text-align: center;">Sent by Apploi Scheduling</p>
      </div>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: "Apploi Scheduling <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function logExecution(
  workflowId: string | null,
  bookingId: string,
  hostId: string,
  workflowType: string,
  recipientEmail: string,
  recipientName: string,
  status: string,
  errorMessage?: string
) {
  await supabase.from("workflow_logs").insert({
    workflow_id: workflowId,
    booking_id: bookingId,
    host_id: hostId,
    workflow_type: workflowType,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    status,
    error_message: errorMessage || null,
  });
}

interface Workflow { id: string; host_id: string; workflow_type: string; is_enabled: boolean; email_subject: string; email_body_template: string; }

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let sent24h = 0;
  let sent2h = 0;
  let sentPrep = 0;

  const { data: allWorkflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("is_enabled", true);

  if (!allWorkflows || allWorkflows.length === 0) {
    return NextResponse.json({ sent24h: 0, sent2h: 0, sentPrep: 0, message: "No active workflows" });
  }

  const hostWorkflows: Record<string, Workflow[]> = {};
  for (const wf of allWorkflows as Workflow[]) {
    if (!hostWorkflows[wf.host_id]) hostWorkflows[wf.host_id] = [];
    hostWorkflows[wf.host_id].push(wf);
  }

  for (const [hostId, workflows] of Object.entries(hostWorkflows)) {
    const { data: host } = await supabase
      .from("hosts")
      .select("*")
      .eq("id", hostId)
      .single();

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, meeting_types(title, duration_minutes, color)")
      .eq("host_id", hostId)
      .in("status", ["confirmed", "rescheduled"])
      .gte("starts_at", now.toISOString())
      .order("starts_at");

    if (!bookings) continue;

    for (const booking of bookings) {
      const startsAt = new Date(booking.starts_at);
      const hoursUntil = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      const mt = booking.meeting_types as any;

      const prepWf = workflows.find((w) => w.workflow_type === "candidate_prep");
      if (prepWf && !booking.prep_email_sent && hoursUntil > 2 && hoursUntil <= 168) {
        const subject = `Prepare for Your Interview — ${mt?.title || "Interview"}`;
        const html = buildPrepEmail(booking, host, mt);
        const sent = await sendEmail(booking.guest_email, subject, html);
        await logExecution(prepWf.id, booking.id, hostId, "candidate_prep", booking.guest_email, booking.guest_name, sent ? "sent" : "failed");
        if (sent) {
          await supabase.from("bookings").update({ prep_email_sent: true }).eq("id", booking.id);
          sentPrep++;
        }
      }

      const rem24Wf = workflows.find((w) => w.workflow_type === "reminder_24h");
      if (rem24Wf && !booking.reminder_24h_sent && hoursUntil <= 24 && hoursUntil > 3) {
        const subject = `Tomorrow: ${mt?.title || "Interview"} Reminder`;
        const html = buildReminderEmail(booking, host, mt, "24 hours");
        const sent = await sendEmail(booking.guest_email, subject, html);
        await logExecution(rem24Wf.id, booking.id, hostId, "reminder_24h", booking.guest_email, booking.guest_name, sent ? "sent" : "failed");
        if (sent) {
          await supabase.from("bookings").update({ reminder_24h_sent: true }).eq("id", booking.id);
          sent24h++;
        }
      }

      const rem2Wf = workflows.find((w) => w.workflow_type === "reminder_2h");
      if (rem2Wf && !booking.reminder_2h_sent && hoursUntil <= 2 && hoursUntil > 0.25) {
        const subject = `Starting Soon: ${mt?.title || "Interview"} in 2 Hours`;
        const html = buildReminderEmail(booking, host, mt, "2 hours");
        const sent = await sendEmail(booking.guest_email, subject, html);
        await logExecution(rem2Wf.id, booking.id, hostId, "reminder_2h", booking.guest_email, booking.guest_name, sent ? "sent" : "failed");
        if (sent) {
          await supabase.from("bookings").update({ reminder_2h_sent: true }).eq("id", booking.id);
          sent2h++;
        }
      }
    }
  }

  return NextResponse.json({
    sent24h,
    sent2h,
    sentPrep,
    processedAt: now.toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const fakeReq = new NextRequest(req.url, { method: "POST", headers: req.headers });
  return POST(fakeReq);
}
