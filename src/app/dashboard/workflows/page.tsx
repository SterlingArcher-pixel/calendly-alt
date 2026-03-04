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
