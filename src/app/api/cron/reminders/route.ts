import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_KEY = process.env.RESEND_API_KEY!;

// --- Template variable replacement ---
function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
  }
  return result;
}

function buildVars(booking: any, host: any, mt: any, facility: any): Record<string, string> {
  const start = new Date(booking.starts_at);
  return {
    guest_name: booking.guest_name || "there",
    guest_email: booking.guest_email || "",
    meeting_type: mt?.title || "Interview",
    date: start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    time: start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    duration: `${mt?.duration_minutes || 30}`,
    host_name: host?.name || "your interviewer",
    host_email: host?.email || "",
    facility_name: facility?.name || "",
    meet_link: booking.google_meet_link || "",
    booking_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://calendly-alt.vercel.app"}/booking/${booking.id}`,
    cancel_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://calendly-alt.vercel.app"}/booking/${booking.id}?action=cancel`,
  };
}

// --- Email builder (wraps template in branded layout) ---
function buildEmailHtml(subject: string, bodyTemplate: string, vars: Record<string, string>): string {
  const body = replaceVars(bodyTemplate, vars);
  // Convert newlines to <br> if body doesn't contain HTML tags
  const formattedBody = body.includes("<") ? body : body.replace(/\n/g, "<br>");

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #0B2522 0%, #003D37 100%); border-radius: 12px 12px 0 0; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <div style="background: #00D08A; width: 28px; height: 28px; border-radius: 6px; text-align: center; line-height: 28px; font-weight: bold; color: #0B2522; font-size: 13px;">A</div>
      <span style="color: rgba(255,255,255,0.7); font-size: 13px;">Apploi Scheduling</span>
    </div>
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${replaceVars(subject, vars)}</h1>
  </div>
  <div style="padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
    <div style="font-size: 14px; color: #374151; line-height: 1.6;">${formattedBody}</div>
    ${vars.meet_link ? `<div style="margin-top: 16px;"><a href="${vars.meet_link}" style="display: inline-block; background: #00A1AB; color: white; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none;">Join Google Meet →</a></div>` : ""}
    <p style="margin: 20px 0 0; font-size: 12px; color: #9CA3AF; text-align: center;">Sent by Apploi Scheduling</p>
  </div>
</div>`;
}

// --- Send email ---
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

// --- Send SMS (placeholder — swap in Twilio/etc.) ---
async function sendSms(to: string, body: string): Promise<boolean> {
  // TODO: Integrate Twilio or other SMS provider
  // For now, log that SMS would be sent
  console.log(`[SMS] Would send to ${to}: ${body.substring(0, 100)}...`);
  return true;
}

// --- Log execution ---
async function logExecution(
  workflowId: string,
  bookingId: string,
  hostId: string,
  workflowType: string,
  recipientEmail: string,
  recipientName: string,
  channel: string,
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
    channel,
    status,
    error_message: errorMessage || null,
  });
}

// --- Convert trigger to milliseconds ---
function triggerToMs(amount: number, unit: string): number {
  switch (unit) {
    case "minutes": return amount * 60 * 1000;
    case "hours": return amount * 60 * 60 * 1000;
    case "days": return amount * 24 * 60 * 60 * 1000;
    default: return amount * 60 * 60 * 1000;
  }
}

interface Workflow {
  id: string;
  host_id: string;
  workflow_type: string;
  name: string;
  is_enabled: boolean;
  email_subject: string;
  email_body_template: string;
  sms_body: string | null;
  trigger_type: string;       // 'before' | 'after'
  trigger_amount: number;
  trigger_unit: string;       // 'minutes' | 'hours' | 'days'
  channel: string;            // 'email' | 'sms' | 'both'
  category: string;
  meeting_type_id: string | null;
  facility_id: string | null;
  // Legacy field (kept for backward compat)
  trigger_hours_before: number | null;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let sentEmail = 0;
  let sentSms = 0;
  let skipped = 0;

  // Get all active workflows
  const { data: allWorkflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("is_enabled", true);

  if (!allWorkflows || allWorkflows.length === 0) {
    return NextResponse.json({ sentEmail: 0, sentSms: 0, skipped: 0, message: "No active workflows" });
  }

  // Group workflows by host
  const hostWorkflows: Record<string, Workflow[]> = {};
  for (const wf of allWorkflows as Workflow[]) {
    if (!hostWorkflows[wf.host_id]) hostWorkflows[wf.host_id] = [];
    hostWorkflows[wf.host_id].push(wf);
  }

  for (const [hostId, workflows] of Object.entries(hostWorkflows)) {
    // Fetch host info
    const { data: host } = await supabase
      .from("hosts")
      .select("*")
      .eq("id", hostId)
      .single();

    // Fetch upcoming + recent bookings (for both before and after triggers)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, meeting_types(id, title, duration_minutes, color), facilities(id, name)")
      .eq("host_id", hostId)
      .in("status", ["confirmed", "rescheduled", "completed"])
      .gte("starts_at", twoDaysAgo.toISOString())
      .order("starts_at");

    if (!bookings) continue;

    for (const wf of workflows) {
      // Determine effective trigger amount/unit
      const triggerAmount = wf.trigger_amount ?? wf.trigger_hours_before ?? 24;
      const triggerUnit = wf.trigger_unit || "hours";
      const triggerType = wf.trigger_type || "before";
      const channel = wf.channel || "email";
      const triggerMs = triggerToMs(triggerAmount, triggerUnit);

      for (const booking of bookings) {
        const startsAt = new Date(booking.starts_at);
        const endsAt = new Date(booking.ends_at || startsAt.getTime() + (booking.meeting_types?.duration_minutes || 30) * 60 * 1000);
        const mt = booking.meeting_types as any;
        const facility = booking.facilities as any;

        // Check meeting type filter
        if (wf.meeting_type_id && wf.meeting_type_id !== mt?.id) continue;
        // Check facility filter
        if (wf.facility_id && wf.facility_id !== booking.facility_id) continue;
        // Skip cancelled bookings for before-triggers
        if (triggerType === "before" && booking.status === "cancelled") continue;

        // Calculate the trigger fire time
        let fireTime: Date;
        if (triggerType === "before") {
          fireTime = new Date(startsAt.getTime() - triggerMs);
        } else {
          // "after" triggers fire relative to end time
          fireTime = new Date(endsAt.getTime() + triggerMs);
        }

        // Check if we're in the send window:
        // Fire time should be in the past (trigger is due) but not more than 25 hours ago
        const timeSinceFire = now.getTime() - fireTime.getTime();
        if (timeSinceFire < 0 || timeSinceFire > 25 * 60 * 60 * 1000) continue;

        // Check if already sent (look in workflow_logs)
        const { data: existing } = await supabase
          .from("workflow_logs")
          .select("id")
          .eq("workflow_id", wf.id)
          .eq("booking_id", booking.id)
          .in("status", ["sent"])
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        // Build template variables
        const vars = buildVars(booking, host, mt, facility);

        // Send based on channel
        const subject = wf.email_subject || `Interview ${triggerType === "before" ? "Reminder" : "Follow-up"} — {{meeting_type}}`;
        const bodyTemplate = wf.email_body_template || `Hi {{guest_name}},\n\nYour {{meeting_type}} is scheduled for {{date}} at {{time}} with {{host_name}}.\n\nBest regards,\n{{host_name}}`;

        if (channel === "email" || channel === "both") {
          const html = buildEmailHtml(subject, bodyTemplate, vars);
          const finalSubject = replaceVars(subject, vars);
          const sent = await sendEmail(booking.guest_email, finalSubject, html);
          await logExecution(wf.id, booking.id, hostId, wf.workflow_type || wf.name || "custom", booking.guest_email, booking.guest_name, "email", sent ? "sent" : "failed");
          if (sent) sentEmail++;
        }

        if ((channel === "sms" || channel === "both") && booking.guest_phone) {
          const smsTemplate = wf.sms_body || `Hi {{guest_name}}, reminder: {{meeting_type}} on {{date}} at {{time}}.`;
          const smsText = replaceVars(smsTemplate, vars);
          const sent = await sendSms(booking.guest_phone, smsText);
          await logExecution(wf.id, booking.id, hostId, wf.workflow_type || wf.name || "custom", booking.guest_email, booking.guest_name, "sms", sent ? "sent" : "failed");
          if (sent) sentSms++;
        }
      }
    }
  }

  return NextResponse.json({
    sentEmail,
    sentSms,
    skipped,
    processedAt: now.toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const fakeReq = new NextRequest(req.url, { method: "POST", headers: req.headers });
  return POST(fakeReq);
}
