"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const TEMPLATE_VARS = [
  { key: "guest_name", label: "Guest Name" },
  { key: "meeting_type", label: "Meeting Type" },
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "duration", label: "Duration" },
  { key: "host_name", label: "Host Name" },
  { key: "facility_name", label: "Facility" },
  { key: "meet_link", label: "Meet Link" },
  { key: "booking_link", label: "Booking Link" },
  { key: "cancel_link", label: "Cancel Link" },
];

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  engagement: { label: "Engagement", icon: "📋", color: "#00A1AB" },
  reminder: { label: "Reminders", icon: "🔔", color: "#D97706" },
  recovery: { label: "Recovery", icon: "👋", color: "#E11D48" },
  custom: { label: "Custom", icon: "⚡", color: "#4F46E5" },
};

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email", icon: "✉️" },
  { value: "sms", label: "SMS", icon: "💬" },
  { value: "both", label: "Both", icon: "📡" },
];

const TRIGGER_UNIT_OPTIONS = [
  { value: "minutes", label: "minutes" },
  { value: "hours", label: "hours" },
  { value: "days", label: "days" },
];

interface Workflow {
  id: string;
  host_id: string;
  workflow_type: string;
  name: string;
  is_enabled: boolean;
  email_subject: string;
  email_body_template: string;
  sms_body: string | null;
  trigger_type: string;
  trigger_amount: number | null;
  trigger_unit: string;
  trigger_hours_before: number | null;
  channel: string;
  category: string;
  meeting_type_id: string | null;
  facility_id: string | null;
  sort_order: number;
}

interface MeetingType {
  id: string;
  title: string;
}

interface Facility {
  id: string;
  name: string;
}

interface WorkflowLog {
  id: string;
  workflow_type: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  sent_at: string;
  channel: string;
  error_message: string | null;
}

const DEFAULT_WORKFLOW: Partial<Workflow> = {
  name: "",
  category: "reminder",
  trigger_type: "before",
  trigger_amount: 24,
  trigger_unit: "hours",
  channel: "email",
  email_subject: "",
  email_body_template: "",
  sms_body: "",
  is_enabled: true,
  meeting_type_id: null,
  facility_id: null,
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Workflow>>(DEFAULT_WORKFLOW);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [wfRes, mtRes, facRes, logRes] = await Promise.all([
      supabase.from("workflows").select("*").eq("host_id", user.id).order("sort_order"),
      supabase.from("meeting_types").select("id, title").eq("host_id", user.id),
      supabase.from("facilities").select("id, name"),
      supabase.from("workflow_logs").select("*").eq("host_id", user.id).order("sent_at", { ascending: false }).limit(20),
    ]);

    setWorkflows(wfRes.data || []);
    setMeetingTypes(mtRes.data || []);
    setFacilities(facRes.data || []);
    setLogs(logRes.data || []);
    setLoading(false);
  }

  async function toggleWorkflow(wf: Workflow) {
    const supabase = createClient();
    await supabase.from("workflows").update({ is_enabled: !wf.is_enabled, updated_at: new Date().toISOString() }).eq("id", wf.id);
    loadData();
  }

  function startEdit(wf: Workflow) {
    if (editingId === wf.id) { setEditingId(null); setIsCreating(false); return; }
    setIsCreating(false);
    setEditingId(wf.id);
    setEditData({
      name: wf.name || wf.workflow_type || "",
      category: wf.category || "custom",
      trigger_type: wf.trigger_type || "before",
      trigger_amount: wf.trigger_amount ?? wf.trigger_hours_before ?? 24,
      trigger_unit: wf.trigger_unit || "hours",
      channel: wf.channel || "email",
      email_subject: wf.email_subject || "",
      email_body_template: wf.email_body_template || "",
      sms_body: wf.sms_body || "",
      meeting_type_id: wf.meeting_type_id,
      facility_id: wf.facility_id,
    });
  }

  function startCreate() {
    setEditingId(null);
    setIsCreating(true);
    setEditData({ ...DEFAULT_WORKFLOW });
  }

  async function saveWorkflow() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      name: editData.name,
      category: editData.category,
      trigger_type: editData.trigger_type,
      trigger_amount: editData.trigger_amount,
      trigger_unit: editData.trigger_unit,
      channel: editData.channel,
      email_subject: editData.email_subject,
      email_body_template: editData.email_body_template,
      sms_body: editData.sms_body || null,
      meeting_type_id: editData.meeting_type_id || null,
      facility_id: editData.facility_id || null,
      updated_at: new Date().toISOString(),
    };

    if (isCreating) {
      await supabase.from("workflows").insert({
        ...payload,
        host_id: user.id,
        workflow_type: editData.name?.toLowerCase().replace(/\s+/g, "_") || "custom",
        is_enabled: true,
      });
    } else if (editingId) {
      await supabase.from("workflows").update(payload).eq("id", editingId);
    }

    setEditingId(null);
    setIsCreating(false);
    setSaving(false);
    loadData();
  }

  async function deleteWorkflow(id: string) {
    const supabase = createClient();
    await supabase.from("workflows").delete().eq("id", id);
    setDeleteConfirm(null);
    setEditingId(null);
    loadData();
  }

  function insertVar(field: "email_subject" | "email_body_template" | "sms_body", varKey: string) {
    const current = (editData[field] as string) || "";
    setEditData({ ...editData, [field]: current + `{{${varKey}}}` });
  }

  async function runReminders() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/cron/reminders", { method: "POST" });
      const data = await res.json();
      setRunResult(`Sent: ${data.sentEmail || 0} emails, ${data.sentSms || 0} SMS. Skipped: ${data.skipped || 0} (already sent).`);
      loadData();
    } catch {
      setRunResult("Error running workflows");
    }
    setRunning(false);
  }

  function getTimingLabel(wf: Workflow): string {
    const amount = wf.trigger_amount ?? wf.trigger_hours_before ?? 0;
    const unit = wf.trigger_unit || "hours";
    const type = wf.trigger_type || "before";
    if (amount === 0) return "Instant";
    return `${amount} ${unit} ${type}`;
  }

  function getChannelIcon(ch: string): string {
    return ch === "sms" ? "💬" : ch === "both" ? "📡" : "✉️";
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

  const categories = ["engagement", "reminder", "recovery", "custom"];

  // --- Edit/Create form ---
  function renderForm() {
    const showSms = editData.channel === "sms" || editData.channel === "both";
    const showEmail = editData.channel === "email" || editData.channel === "both";

    return (
      <div className="border-t bg-gray-50 p-5 space-y-4">
        {/* Row 1: Name + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Workflow Name</label>
            <input
              value={editData.name || ""}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="e.g. 24-Hour Reminder"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Category</label>
            <select
              value={editData.category || "reminder"}
              onChange={(e) => setEditData({ ...editData, category: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c]?.label || c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Timing */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Amount</label>
            <input
              type="number"
              min={0}
              value={editData.trigger_amount ?? 24}
              onChange={(e) => setEditData({ ...editData, trigger_amount: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Unit</label>
            <select
              value={editData.trigger_unit || "hours"}
              onChange={(e) => setEditData({ ...editData, trigger_unit: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {TRIGGER_UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">When</label>
            <select
              value={editData.trigger_type || "before"}
              onChange={(e) => setEditData({ ...editData, trigger_type: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="before">Before</option>
              <option value="after">After</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Channel</label>
            <select
              value={editData.channel || "email"}
              onChange={(e) => setEditData({ ...editData, channel: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {CHANNEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Scoping (meeting type + facility) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Meeting Type (optional)</label>
            <select
              value={editData.meeting_type_id || ""}
              onChange={(e) => setEditData({ ...editData, meeting_type_id: e.target.value || null })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Meeting Types</option>
              {meetingTypes.map((mt) => (
                <option key={mt.id} value={mt.id}>{mt.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Facility (optional)</label>
            <select
              value={editData.facility_id || ""}
              onChange={(e) => setEditData({ ...editData, facility_id: e.target.value || null })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Variable insertion buttons */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Insert Variable</label>
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_VARS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  const field = showSms && !showEmail ? "sms_body" : "email_body_template";
                  insertVar(field, v.key);
                }}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-mono text-gray-600 hover:bg-gray-50 hover:border-teal-300"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>

        {/* Email fields */}
        {showEmail && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email Subject</label>
              <input
                value={editData.email_subject || ""}
                onChange={(e) => setEditData({ ...editData, email_subject: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. Reminder: {{meeting_type}} on {{date}}"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email Body</label>
              <textarea
                value={editData.email_body_template || ""}
                onChange={(e) => setEditData({ ...editData, email_body_template: e.target.value })}
                rows={5}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Hi {{guest_name}},&#10;&#10;Your {{meeting_type}} is on {{date}} at {{time}}.&#10;&#10;Best,&#10;{{host_name}}"
              />
            </div>
          </>
        )}

        {/* SMS field */}
        {showSms && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">SMS Body <span className="text-gray-400">(160 char recommended)</span></label>
            <textarea
              value={editData.sms_body || ""}
              onChange={(e) => setEditData({ ...editData, sms_body: e.target.value })}
              rows={2}
              maxLength={320}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Hi {{guest_name}}, reminder: {{meeting_type}} on {{date}} at {{time}}."
            />
            <p className="mt-1 text-[11px] text-gray-400">{(editData.sms_body || "").length}/160 characters</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {!isCreating && editingId && (
            deleteConfirm === editingId ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Delete this workflow?</span>
                <button onClick={() => deleteWorkflow(editingId)} className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600">Yes, Delete</button>
                <button onClick={() => setDeleteConfirm(null)} className="rounded-md border px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(editingId)} className="text-xs text-red-500 hover:text-red-700">Delete Workflow</button>
            )
          )}
          {isCreating && <div />}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingId(null); setIsCreating(false); }}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveWorkflow}
              disabled={saving || !editData.name}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "#00A1AB" }}
            >
              {saving ? "Saving..." : isCreating ? "Create Workflow" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="mt-1 text-sm text-gray-500">Automated interview communication sequences</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={startCreate}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>+</span> Create Workflow
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
              <><span>⚡</span> Run Now</>
            )}
          </button>
        </div>
      </div>

      {/* Run result banner */}
      {runResult && (
        <div
          className="mb-6 rounded-lg border bg-white px-4 py-3 text-sm"
          style={{ borderColor: runResult.includes("Error") ? "#EF4444" : "#00D08A" }}
        >
          {runResult}
        </div>
      )}

      {/* Create new workflow form */}
      {isCreating && (
        <div className="mb-6 rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center gap-3 p-5">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-semibold text-gray-900">New Workflow</p>
              <p className="text-sm text-gray-500">Configure timing, channel, and templates</p>
            </div>
          </div>
          {renderForm()}
        </div>
      )}

      {/* Workflow categories */}
      {categories.map((cat) => {
        const catMeta = CATEGORY_META[cat];
        const catWorkflows = workflows.filter((wf) => (wf.category || "custom") === cat);
        if (catWorkflows.length === 0) return null;

        return (
          <div key={cat} className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {catMeta?.label || cat}
            </h2>
            <div className="space-y-3">
              {catWorkflows.map((wf) => {
                const isExpanded = editingId === wf.id;
                const scopeLabels: string[] = [];
                if (wf.meeting_type_id) {
                  const mt = meetingTypes.find((m) => m.id === wf.meeting_type_id);
                  if (mt) scopeLabels.push(mt.title);
                }
                if (wf.facility_id) {
                  const f = facilities.find((fac) => fac.id === wf.facility_id);
                  if (f) scopeLabels.push(f.name);
                }

                return (
                  <div
                    key={wf.id}
                    className={`rounded-xl border bg-white transition-shadow ${wf.is_enabled ? "hover:shadow-sm" : "opacity-60"}`}
                  >
                    <div className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-2xl flex-shrink-0">{catMeta?.icon || "📧"}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 truncate">{wf.name || wf.workflow_type}</p>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0"
                              style={{
                                backgroundColor: wf.is_enabled ? "rgba(0, 208, 138, 0.1)" : "#F3F4F6",
                                color: wf.is_enabled ? "#00835A" : "#9CA3AF",
                              }}
                            >
                              {getTimingLabel(wf)}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {getChannelIcon(wf.channel || "email")} {wf.channel || "email"}
                            </span>
                          </div>
                          {scopeLabels.length > 0 && (
                            <p className="mt-0.5 text-xs text-gray-400 truncate">
                              Scoped to: {scopeLabels.join(" · ")}
                            </p>
                          )}
                          {wf.email_subject && (
                            <p className="mt-0.5 text-sm text-gray-500 truncate">
                              Subject: {wf.email_subject}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <button
                          onClick={() => startEdit(wf)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          {isExpanded ? "Close" : "Edit"}
                        </button>
                        <button
                          onClick={() => deleteWorkflow(wf.id)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => toggleWorkflow(wf)}
                          className="relative h-6 w-11 rounded-full transition-colors flex-shrink-0"
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
                    {isExpanded && renderForm()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Stats */}
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
          <p className="text-xs text-gray-500">Messages Sent</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-red-500">
            {logs.filter((l) => l.status === "failed").length}
          </p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
      </div>

      {/* Execution log */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Execution Log</h3>
          <p className="text-sm text-gray-500">Recent workflow activity</p>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">
              No workflow executions yet. Click &quot;Run Now&quot; to process pending workflows.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{log.channel === "sms" ? "💬" : "✉️"}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {log.workflow_type}{" "}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
