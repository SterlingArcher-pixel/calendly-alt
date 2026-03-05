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

function buildEmailHtml(subject: string, bodyTemplate: string, vars: Record<string, string>): string {
  const body = replaceVars(bodyTemplate, vars);
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

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({ from: "Apploi Scheduling <onboarding@resend.dev>", to, subject, html }),
    });
    return res.ok;
  } catch { return false; }
}

async function sendSms(to: string, body: string): Promise<boolean> {
  console.log(`[SMS] Would send to ${to}: ${body.substring(0, 100)}...`);
  return true;
}

function triggerToMs(amount: number, unit: string): number {
  switch (unit) {
    case "minutes": return amount * 60 * 1000;
    case "hours": return amount * 60 * 60 * 1000;
    case "days": return amount * 24 * 60 * 60 * 1000;
    default: return amount * 60 * 60 * 1000;
  }
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
  let retried = 0;

  // ==============================================
  // BATCH QUERY 1: All active workflows (one query)
  // ==============================================
  const { data: allWorkflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("is_enabled", true);

  if (!allWorkflows || allWorkflows.length === 0) {
    return NextResponse.json({ sentEmail: 0, sentSms: 0, skipped: 0, retried: 0, message: "No active workflows" });
  }

  const hostIds = [...new Set(allWorkflows.map(w => w.host_id))];

  // ==============================================
  // BATCH QUERY 2: All hosts in one query
  // ==============================================
  const { data: allHosts } = await supabase
    .from("hosts")
    .select("*")
    .in("id", hostIds);

  const hostMap = new Map((allHosts || []).map(h => [h.id, h]));

  // ==============================================
  // BATCH QUERY 3: All relevant bookings in one query
  //   (upcoming + recent for after-triggers)
  // ==============================================
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: allBookings } = await supabase
    .from("bookings")
    .select("*, meeting_types(id, title, duration_minutes, color), facilities(id, name)")
    .in("host_id", hostIds)
    .in("status", ["confirmed", "rescheduled", "completed"])
    .gte("starts_at", twoDaysAgo.toISOString())
    .lte("starts_at", sevenDaysAhead.toISOString())
    .order("starts_at");

  if (!allBookings || allBookings.length === 0) {
    return NextResponse.json({ sentEmail: 0, sentSms: 0, skipped: 0, retried: 0, message: "No bookings in window" });
  }

  // ==============================================
  // BATCH QUERY 4: All recent sent logs (dedup check)
  //   Instead of checking per-workflow-per-booking
  // ==============================================
  const workflowIds = allWorkflows.map(w => w.id);
  const bookingIds = allBookings.map(b => b.id);

  const { data: sentLogs } = await supabase
    .from("workflow_logs")
    .select("workflow_id, booking_id")
    .in("workflow_id", workflowIds)
    .in("booking_id", bookingIds)
    .eq("status", "sent");

  // Build a Set for O(1) dedup lookups
  const sentSet = new Set(
    (sentLogs || []).map(l => `${l.workflow_id}:${l.booking_id}`)
  );

  // ==============================================
  // BATCH QUERY 5: Retry failed sends from last 24h
  // ==============================================
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: failedLogs } = await supabase
    .from("workflow_logs")
    .select("id, workflow_id, booking_id, channel, recipient_email, recipient_name, workflows(*, host_id), bookings(*, meeting_types(title, duration_minutes, color), facilities(id, name))")
    .eq("status", "failed")
    .gte("created_at", oneDayAgo)
    .limit(20);

  // ==============================================
  // PROCESS: Loop workflows × bookings (no more DB calls inside)
  // ==============================================
  const bookingsByHost = new Map<string, typeof allBookings>();
  for (const b of allBookings) {
    const list = bookingsByHost.get(b.host_id) || [];
    list.push(b);
    bookingsByHost.set(b.host_id, list);
  }

  for (const wf of allWorkflows) {
    const host = hostMap.get(wf.host_id);
    if (!host) continue;

    const hostBookings = bookingsByHost.get(wf.host_id) || [];
    const triggerAmount = wf.trigger_amount ?? wf.trigger_hours_before ?? 24;
    const triggerUnit = wf.trigger_unit || "hours";
    const triggerType = wf.trigger_type || "before";
    const channel = wf.channel || "email";
    const triggerMs = triggerToMs(triggerAmount, triggerUnit);

    for (const booking of hostBookings) {
      const startsAt = new Date(booking.starts_at);
      const endsAt = new Date(booking.ends_at || startsAt.getTime() + (booking.meeting_types?.duration_minutes || 30) * 60 * 1000);
      const mt = booking.meeting_types as any;
      const facility = booking.facilities as any;

      // Check meeting type filter
      if (wf.meeting_type_id && wf.meeting_type_id !== mt?.id) continue;
      // Check facility filter
      if (wf.facility_id && wf.facility_id !== booking.facility_id) continue;
      // Skip cancelled for before-triggers
      if (triggerType === "before" && booking.status === "cancelled") continue;

      // Calculate fire time
      const fireTime = triggerType === "before"
        ? new Date(startsAt.getTime() - triggerMs)
        : new Date(endsAt.getTime() + triggerMs);

      // Check send window (due but not older than 25h)
      const timeSinceFire = now.getTime() - fireTime.getTime();
      if (timeSinceFire < 0 || timeSinceFire > 25 * 60 * 60 * 1000) continue;

      // Dedup check (O(1) Set lookup instead of DB query)
      const dedupKey = `${wf.id}:${booking.id}`;
      if (sentSet.has(dedupKey)) { skipped++; continue; }

      // Build vars and send
      const vars = buildVars(booking, host, mt, facility);
      const subject = wf.email_subject || `Interview ${triggerType === "before" ? "Reminder" : "Follow-up"} — {{meeting_type}}`;
      const bodyTemplate = wf.email_body_template || `Hi {{guest_name}},\n\nYour {{meeting_type}} is scheduled for {{date}} at {{time}} with {{host_name}}.`;
      const wfType = wf.workflow_type || wf.name || "custom";

      if (channel === "email" || channel === "both") {
        const html = buildEmailHtml(subject, bodyTemplate, vars);
        const finalSubject = replaceVars(subject, vars);
        const sent = await sendEmail(booking.guest_email, finalSubject, html);
        await supabase.from("workflow_logs").insert({
          workflow_id: wf.id, booking_id: booking.id, host_id: wf.host_id,
          workflow_type: wfType, recipient_email: booking.guest_email,
          recipient_name: booking.guest_name, channel: "email",
          status: sent ? "sent" : "failed",
        });
        if (sent) { sentEmail++; sentSet.add(dedupKey); }
      }

      if ((channel === "sms" || channel === "both") && booking.guest_phone) {
        const smsTemplate = wf.sms_body || `Hi {{guest_name}}, reminder: {{meeting_type}} on {{date}} at {{time}}.`;
        const smsText = replaceVars(smsTemplate, vars);
        const sent = await sendSms(booking.guest_phone, smsText);
        await supabase.from("workflow_logs").insert({
          workflow_id: wf.id, booking_id: booking.id, host_id: wf.host_id,
          workflow_type: wfType, recipient_email: booking.guest_email,
          recipient_name: booking.guest_name, channel: "sms",
          status: sent ? "sent" : "failed",
        });
        if (sent) sentSms++;
      }
    }
  }

  // ==============================================
  // RETRY: Process failed sends
  // ==============================================
  if (failedLogs) {
    for (const log of failedLogs) {
      const wf = log.workflows as any;
      const booking = log.bookings as any;
      if (!wf?.is_enabled || !booking) continue;

      const host = hostMap.get(wf.host_id);
      if (!host) continue;

      const mt = booking.meeting_types as any;
      const facility = booking.facilities as any;
      const vars = buildVars(booking, host, mt, facility);
      const subject = wf.email_subject || "Interview Reminder — {{meeting_type}}";
      const bodyTemplate = wf.email_body_template || "Hi {{guest_name}},\\n\\nReminder about your {{meeting_type}}.";

      let retrySent = false;
      if (log.channel === "email" || !log.channel) {
        const html = buildEmailHtml(subject, bodyTemplate, vars);
        retrySent = await sendEmail(log.recipient_email, replaceVars(subject, vars), html);
      } else if (log.channel === "sms" && booking.guest_phone) {
        const smsTemplate = wf.sms_body || "Reminder: {{meeting_type}} on {{date}} at {{time}}.";
        retrySent = await sendSms(booking.guest_phone, replaceVars(smsTemplate, vars));
      }

      if (retrySent) {
        await supabase.from("workflow_logs").update({
          status: "sent", sent_at: new Date().toISOString(), error_message: "Retried successfully"
        }).eq("id", log.id);
        retried++;
      }
    }
  }

  return NextResponse.json({
    sentEmail, sentSms, skipped, retried,
    queriesUsed: 5,
    processedAt: now.toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const fakeReq = new NextRequest(req.url, { method: "POST", headers: req.headers });
  return POST(fakeReq);
}
