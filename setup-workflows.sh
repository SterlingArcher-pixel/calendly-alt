#!/bin/bash
# Run this from /tmp/calendly-alt
# Creates all workflow files, patches nav, commits and pushes

echo "⚡ Creating workflow directories..."
mkdir -p src/app/dashboard/workflows
mkdir -p src/app/api/cron/reminders

echo "⚡ Creating vercel.json..."
cat > vercel.json << 'VERCELEOF'
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 */1 * * *"
    }
  ]
}
VERCELEOF

echo "⚡ Creating cron API route..."
cat > src/app/api/cron/reminders/route.ts << 'CRONEOF'
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
CRONEOF

echo "⚡ Creating workflows page..."
cat > src/app/dashboard/workflows/page.tsx << 'PAGEEOF'
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const WORKFLOW_META: Record<string, { label: string; description: string; icon: string; timing: string; category: string }> = {
  candidate_prep: {
    label: "Candidate Prep Email",
    description: "Send role-specific preparation instructions immediately when a booking is created",
    icon: "📋",
    timing: "Instant — on booking",
    category: "Engagement",
  },
  reminder_24h: {
    label: "24-Hour Reminder",
    description: "Remind candidates about their upcoming interview 24 hours before",
    icon: "🔔",
    timing: "24 hours before",
    category: "Reminders",
  },
  reminder_2h: {
    label: "2-Hour Reminder",
    description: "Final reminder with quick details 2 hours before the interview",
    icon: "⏰",
    timing: "2 hours before",
    category: "Reminders",
  },
  no_show_followup: {
    label: "No-Show Follow-Up",
    description: "Automatically reach out to candidates who miss their interview",
    icon: "👋",
    timing: "1 hour after missed",
    category: "Recovery",
  },
  post_interview: {
    label: "Post-Interview Thank You",
    description: "Send a thank you note after the interview is completed",
    icon: "✉️",
    timing: "30 min after end",
    category: "Engagement",
  },
};

const HEALTHCARE_TEMPLATES: Record<string, { subject: string; bullets: string[] }> = {
  "RN Initial Phone Screen": {
    subject: "Prepare for Your RN Phone Screen",
    bullets: [
      "Have your RN license number ready for verification",
      "Prepare to discuss your clinical experience and specialties",
      "This is a 15-minute phone call — find a quiet space",
      "Have questions ready about the facility and team",
    ],
  },
  "CNA Interview": {
    subject: "Your CNA Interview — What to Expect",
    bullets: [
      "Bring your CNA certification and a valid photo ID",
      "Wear professional attire (scrubs are fine)",
      "This is a 30-minute in-person interview",
      "Be prepared to discuss patient care scenarios",
    ],
  },
  "Director of Nursing Panel": {
    subject: "Director of Nursing Panel Interview Details",
    bullets: [
      "This is a panel interview with the leadership team",
      "Prepare to discuss staffing strategies and quality metrics",
      "Bring copies of your resume and any certifications",
      "Plan for a 45-60 minute comprehensive discussion",
    ],
  },
  "Medical Assistant Meet & Greet": {
    subject: "Medical Assistant Meet & Greet — Quick Overview",
    bullets: [
      "This is a casual 15-minute conversation with the team",
      "Bring your MA certification if applicable",
      "Great opportunity to ask questions about daily workflow",
      "No formal presentation needed — just be yourself",
    ],
  },
  "LPN Screening": {
    subject: "LPN Screening Call Preparation",
    bullets: [
      "Have your LPN/LVN license number available",
      "This is a 15-minute screening call",
      "Be ready to discuss your medication administration experience",
      "We'll cover scheduling availability and shift preferences",
    ],
  },
};

interface Workflow {
  id: string;
  workflow_type: string;
  is_enabled: boolean;
  email_subject: string;
  email_body_template: string;
}

interface WorkflowLog {
  id: string;
  workflow_type: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  sent_at: string;
  error_message: string | null;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: wf } = await supabase
      .from("workflows")
      .select("*")
      .eq("host_id", user.id)
      .order("created_at");
    setWorkflows(wf || []);

    const { data: logData } = await supabase
      .from("workflow_logs")
      .select("*")
      .eq("host_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(20);
    setLogs(logData || []);
    setLoading(false);
  }

  async function toggleWorkflow(wf: Workflow) {
    const supabase = createClient();
    await supabase
      .from("workflows")
      .update({ is_enabled: !wf.is_enabled, updated_at: new Date().toISOString() })
      .eq("id", wf.id);
    loadData();
  }

  function startEdit(wf: Workflow) {
    if (expandedId === wf.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(wf.id);
    setEditSubject(wf.email_subject || "");
    setEditBody(wf.email_body_template || "");
  }

  async function saveEdit(wfId: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("workflows")
      .update({
        email_subject: editSubject,
        email_body_template: editBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wfId);
    setExpandedId(null);
    setSaving(false);
    loadData();
  }

  async function runReminders() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/cron/reminders", { method: "POST" });
      const data = await res.json();
      setRunResult(
        `Processed: ${data.sent24h || 0} 24hr reminders, ${data.sent2h || 0} 2hr reminders, ${data.sentPrep || 0} prep emails`
      );
      loadData();
    } catch (e) {
      setRunResult("Error running workflows");
    }
    setRunning(false);
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Workflows</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const categories = ["Engagement", "Reminders", "Recovery"];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automated interview communication sequences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showTemplates ? "Hide Templates" : "Healthcare Templates"}
          </button>
          <button
            onClick={runReminders}
            disabled={running}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#00A1AB" }}
          >
            {running ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M12 9v4m0 0v.01" />
                </svg>
                Run Now
              </>
            )}
          </button>
        </div>
      </div>

      {runResult && (
        <div className="mb-6 rounded-lg border bg-white px-4 py-3 text-sm"
          style={{ borderColor: runResult.includes("Processed") ? "#00D08A" : "#EF4444" }}>
          {runResult}
        </div>
      )}

      {showTemplates && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <h3 className="mb-1 text-base font-semibold text-gray-900">Healthcare-Specific Prep Templates</h3>
          <p className="mb-4 text-sm text-gray-500">
            Role-specific preparation instructions sent to candidates before their interview
          </p>
          <div className="space-y-3">
            {Object.entries(HEALTHCARE_TEMPLATES).map(([role, tpl]) => (
              <div key={role} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#00A1AB" }} />
                  <p className="text-sm font-semibold text-gray-900">{role}</p>
                </div>
                <p className="text-xs text-gray-500 mb-2">Subject: {tpl.subject}</p>
                <ul className="space-y-1">
                  {tpl.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span style={{ color: "#00D08A" }}>✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {categories.map((cat) => {
        const catWorkflows = workflows.filter(
          (wf) => WORKFLOW_META[wf.workflow_type]?.category === cat
        );
        if (catWorkflows.length === 0) return null;

        return (
          <div key={cat} className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {cat}
            </h2>
            <div className="space-y-3">
              {catWorkflows.map((wf) => {
                const meta = WORKFLOW_META[wf.workflow_type];
                if (!meta) return null;
                const isExpanded = expandedId === wf.id;

                return (
                  <div
                    key={wf.id}
                    className={`rounded-xl border bg-white transition-shadow ${
                      wf.is_enabled ? "hover:shadow-sm" : "opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{meta.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{meta.label}</p>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: wf.is_enabled ? "rgba(0, 208, 138, 0.1)" : "#F3F4F6",
                                color: wf.is_enabled ? "#00835A" : "#9CA3AF",
                              }}
                            >
                              {meta.timing}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">{meta.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEdit(wf)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          {isExpanded ? "Close" : "Edit Template"}
                        </button>
                        <button
                          onClick={() => toggleWorkflow(wf)}
                          className={`relative h-6 w-11 rounded-full transition-colors`}
                          style={{ backgroundColor: wf.is_enabled ? "#00A1AB" : "#D1D5DB" }}
                        >
                          <span
                            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              wf.is_enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-5">
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                              Email Subject
                            </label>
                            <input
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                              placeholder="e.g. Prepare for Your Interview"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                              Email Body Template
                            </label>
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                              placeholder="Use variables like guest_name, meeting_type, date, time, host_name"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-gray-400">
                              Variables: guest_name, meeting_type, date, time, host_name, meet_link
                            </p>
                            <button
                              onClick={() => saveEdit(wf.id)}
                              disabled={saving}
                              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                              style={{ backgroundColor: "#00A1AB" }}
                            >
                              {saving ? "Saving..." : "Save Template"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "#00A1AB" }}>
            {workflows.filter((w) => w.is_enabled).length}
          </p>
          <p className="text-xs text-gray-500">Active Workflows</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "#00D08A" }}>
            {logs.filter((l) => l.status === "sent").length}
          </p>
          <p className="text-xs text-gray-500">Emails Sent</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-red-500">
            {logs.filter((l) => l.status === "failed").length}
          </p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Execution Log</h3>
          <p className="text-sm text-gray-500">Recent workflow activity</p>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">
              No workflow executions yet. Click &quot;Run Now&quot; to process pending reminders.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => {
              const meta = WORKFLOW_META[log.workflow_type];
              return (
                <div key={log.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{meta?.icon || "📧"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {meta?.label || log.workflow_type}{" "}
                        <span className="font-normal text-gray-400">→</span>{" "}
                        {log.recipient_name}
                      </p>
                      <p className="text-xs text-gray-400">{log.recipient_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                        log.status === "sent"
                          ? "bg-green-50 text-green-700"
                          : log.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.sent_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
PAGEEOF

echo "⚡ Patching Sidebar nav..."
python3 -c "
content = open('src/components/Sidebar.tsx').read()

# Add nav item
content = content.replace(
    '{ href: \"/dashboard/integration\", label: \"Apploi Integration\", icon: \"integration\" },\n  { href: \"/dashboard/settings\", label: \"Settings\", icon: \"settings\" },',
    '{ href: \"/dashboard/integration\", label: \"Apploi Integration\", icon: \"integration\" },\n  { href: \"/dashboard/workflows\", label: \"Workflows\", icon: \"workflow\" },\n  { href: \"/dashboard/settings\", label: \"Settings\", icon: \"settings\" },'
)

# Add workflow icon
workflow_icon = '''    case \"workflow\":
      return (
        <svg className={cn} fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" strokeWidth={1.5}>
          <path strokeLinecap=\"round\" strokeLinejoin=\"round\" d=\"M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z\" />
        </svg>
      );
    case \"settings\":'''

content = content.replace('    case \"settings\":', workflow_icon)

open('src/components/Sidebar.tsx', 'w').write(content)
print('  ✓ Sidebar.tsx patched')
"

echo "⚡ Patching MobileHeader nav..."
python3 -c "
content = open('src/components/MobileHeader.tsx').read()

content = content.replace(
    '{ href: \"/dashboard/integration\", label: \"Apploi Integration\", icon: \"integration\" },\n  { href: \"/dashboard/settings\", label: \"Settings\", icon: \"settings\" },',
    '{ href: \"/dashboard/integration\", label: \"Apploi Integration\", icon: \"integration\" },\n  { href: \"/dashboard/workflows\", label: \"Workflows\", icon: \"workflow\" },\n  { href: \"/dashboard/settings\", label: \"Settings\", icon: \"settings\" },'
)

open('src/components/MobileHeader.tsx', 'w').write(content)
print('  ✓ MobileHeader.tsx patched')
"

echo ""
echo "✅ All files created! Committing..."
git add .
git commit -m "Workflow engine: reminder cron, healthcare email templates, execution log"
git push origin main
