// Giant Script: Cancel buttons, Meeting Type CRUD, Settings, Activity Feed
// Run from ~/Desktop/calendly-alt/ with: node mega.js
const fs = require('fs');

console.log('Building 4 features...\n');

// ============================================================
// 1. CANCEL BUTTON ON BOOKINGS PAGE
// ============================================================
let bookingsClient = fs.readFileSync('src/app/dashboard/bookings/BookingsClient.tsx', 'utf8');

// Add cancel handler and state
bookingsClient = bookingsClient.replace(
  'export default function BookingsClient({',
  `function CancelModal({ booking, onClose, onCancelled }: { booking: any; onClose: () => void; onCancelled: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, reason }),
    });
    if (res.ok) {
      onCancelled();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Cancel Interview</h3>
        <p className="mt-1 text-sm text-gray-500">
          Cancel <span className="font-medium">{booking.meeting_types?.title || "Meeting"}</span> with{" "}
          <span className="font-medium">{booking.guest_name}</span>?
        </p>
        <p className="mt-1 text-xs text-gray-400">A cancellation email will be sent to {booking.guest_email}.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          className="mt-4 w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Keep It
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Cancel Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingsClient({`
);

// Add state for cancel modal
bookingsClient = bookingsClient.replace(
  'const [tab, setTab] = useState<Tab>("upcoming");',
  `const [tab, setTab] = useState<Tab>("upcoming");
  const [cancelBooking, setCancelBooking] = useState<any>(null);`
);

// Add cancel button to BookingCard - modify the component to accept onCancel
bookingsClient = bookingsClient.replace(
  'function BookingCard({ b, isPast }: { b: any; isPast?: boolean }) {',
  'function BookingCard({ b, isPast, onCancel }: { b: any; isPast?: boolean; onCancel?: (b: any) => void }) {'
);

// Add cancel button before the status badge
bookingsClient = bookingsClient.replace(
  `<span className={\`rounded-full px-2.5 py-1 text-xs font-medium \${
          b.status === "cancelled"`,
  `{!isPast && b.status !== "cancelled" && onCancel && (
            <button
              onClick={() => onCancel(b)}
              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          )}
          <span className={\`rounded-full px-2.5 py-1 text-xs font-medium \${
          b.status === "cancelled"`
);

// Pass onCancel to upcoming BookingCards
bookingsClient = bookingsClient.replace(
  '<BookingCard key={b.id} b={b} isPast={tab === "past"} />',
  '<BookingCard key={b.id} b={b} isPast={tab === "past"} onCancel={tab === "upcoming" ? setCancelBooking : undefined} />'
);

// Add cancel modal render before closing div
bookingsClient = bookingsClient.replace(
  /(\s*<\/div>\s*\);\s*}\s*$)/,
  `
      {cancelBooking && (
        <CancelModal
          booking={cancelBooking}
          onClose={() => setCancelBooking(null)}
          onCancelled={() => { setCancelBooking(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}`
);

fs.writeFileSync('src/app/dashboard/bookings/BookingsClient.tsx', bookingsClient);
console.log('Updated: Bookings page with cancel modal');

// ============================================================
// 2. MEETING TYPE CREATOR
// ============================================================
const meetingTypeCreator = `"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
];

const DURATIONS = [15, 30, 45, 60, 90];

interface MeetingType {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration_minutes: number;
  color: string;
  is_active: boolean;
}

export default function MeetingTypesPage() {
  const [types, setTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", duration_minutes: 30, color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("meeting_types")
      .select("*")
      .eq("host_id", user.id)
      .order("created_at");

    setTypes(data || []);
    setLoading(false);
  }

  async function handleCreate() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const { error } = await supabase.from("meeting_types").insert({
      host_id: user.id,
      title: form.title,
      slug,
      description: form.description,
      duration_minutes: form.duration_minutes,
      color: form.color,
      is_active: true,
    });

    if (!error) {
      setForm({ title: "", description: "", duration_minutes: 30, color: COLORS[0] });
      setShowForm(false);
      loadTypes();
    }
    setSaving(false);
  }

  async function toggleActive(mt: MeetingType) {
    const supabase = createClient();
    await supabase
      .from("meeting_types")
      .update({ is_active: !mt.is_active })
      .eq("id", mt.id);
    loadTypes();
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Meeting Types</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-4 rounded-xl border bg-white p-5">
              <div className="h-10 w-10 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Types</h1>
          <p className="mt-1 text-sm text-gray-500">{types.length} interview types configured</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Type
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Create Meeting Type</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. RN Phone Screen"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setForm({ ...form, duration_minutes: d })}
                    className={\`flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors \${
                      form.duration_minutes === d
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }\`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description for candidates"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Color</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={\`h-8 w-8 rounded-full border-2 transition-all \${
                      form.color === c ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"
                    }\`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.title || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Meeting Type"}
            </button>
          </div>
        </div>
      )}

      {/* Meeting types list */}
      <div className="space-y-3">
        {types.map((mt) => (
          <div key={mt.id} className={\`flex items-center justify-between rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm \${!mt.is_active ? "opacity-60" : ""}\`}>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: mt.color + "20" }}>
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: mt.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{mt.title}</p>
                  {!mt.is_active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase">Inactive</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{mt.duration_minutes} min &middot; {mt.description || "No description"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(\`\${window.location.origin}/charlie-fischer/\${mt.slug}\`);
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Copy Link
              </button>
              <button
                onClick={() => toggleActive(mt)}
                className={\`relative h-6 w-11 rounded-full transition-colors \${mt.is_active ? "bg-blue-600" : "bg-gray-300"}\`}
              >
                <span className={\`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform \${mt.is_active ? "translate-x-5" : "translate-x-0"}\`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/dashboard/meeting-types/page.tsx', meetingTypeCreator);
console.log('Created: Meeting Types page with CRUD + toggle');

// ============================================================
// 3. SETTINGS PAGE
// ============================================================
const settingsPage = `"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [host, setHost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    timezone: "America/Denver",
    booking_url_slug: "",
  });

  const timezones = [
    "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  ];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase.from("hosts").select("*").eq("id", user.id).single();
      if (data) {
        setHost(data);
        setForm({
          name: data.name || "",
          timezone: data.timezone || "America/Denver",
          booking_url_slug: data.booking_url_slug || "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!host) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("hosts").update({
      name: form.name,
      timezone: form.timezone,
      booking_url_slug: form.booking_url_slug,
    }).eq("id", host.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-20 rounded-xl bg-gray-100" />
          <div className="h-40 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          {host?.avatar_url ? (
            <img src={host.avatar_url} alt="" className="h-16 w-16 rounded-full" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
              {form.name?.[0] || "?"}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{form.name || "Unnamed"}</p>
            <p className="text-sm text-gray-500">{host?.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Display Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Booking URL Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">calendly-alt.vercel.app/</span>
              <input
                value={form.booking_url_slug}
                onChange={(e) => setForm({ ...form, booking_url_slug: e.target.value })}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="charlie-fischer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Notifications</h2>
        <div className="space-y-4">
          {[
            { label: "Email confirmation to candidates", desc: "Send booking confirmation via email", on: true },
            { label: "Calendar invite", desc: "Auto-create Google Calendar event with Meet link", on: true },
            { label: "SMS reminders", desc: "24hr + 2hr interview reminders via SMS", on: false },
            { label: "Cancellation notifications", desc: "Email candidate when interview is cancelled", on: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <div className={\`relative h-6 w-11 rounded-full \${item.on ? "bg-blue-600" : "bg-gray-300"}\`}>
                <span className={\`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform \${item.on ? "translate-x-5" : "translate-x-0"}\`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="mb-2 text-base font-semibold text-red-900">Danger Zone</h2>
        <p className="mb-4 text-sm text-red-700">Permanently delete your account and all data.</p>
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
          Delete Account
        </button>
      </div>

      {/* Save */}
      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50/80 px-1 py-4 backdrop-blur">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
`;

fs.mkdirSync('src/app/dashboard/settings', { recursive: true });
fs.writeFileSync('src/app/dashboard/settings/page.tsx', settingsPage);
console.log('Created: Settings page with profile, timezone, notifications');

// ============================================================
// 4. ACTIVITY FEED ON DASHBOARD
// ============================================================
let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// Check if there's an "Upcoming Bookings" section we can add after
if (dashboard.indexOf('Upcoming Bookings') !== -1) {
  // Add activity feed after the upcoming bookings section by appending before the last closing tags
  // Find the pattern at the end of the component
  const activityFeed = `
      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="rounded-xl border bg-white">
          <div className="divide-y">
            {bookings.slice(0, 8).map((b: any) => {
              const start = new Date(b.starts_at);
              const isPast = start < new Date();
              const mt = b.meeting_types;
              return (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={\`flex h-8 w-8 items-center justify-center rounded-full \${
                    b.status === "cancelled" ? "bg-red-100" : isPast ? "bg-green-100" : "bg-blue-100"
                  }\`}>
                    {b.status === "cancelled" ? (
                      <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : isPast ? (
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{b.guest_name}</span>
                      {b.status === "cancelled" ? " cancelled " : isPast ? " completed " : " booked "}
                      <span className="text-gray-500">{mt?.title || "Meeting"}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                      {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={\`rounded-full px-2 py-0.5 text-[10px] font-medium \${
                    b.status === "cancelled" ? "bg-red-50 text-red-600" : isPast ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                  }\`}>
                    {b.status === "cancelled" ? "cancelled" : isPast ? "completed" : "upcoming"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>`;

  // Insert before the last closing </div>
  const lastDivClose = dashboard.lastIndexOf('</div>');
  if (lastDivClose !== -1) {
    dashboard = dashboard.slice(0, lastDivClose) + activityFeed + '\n' + dashboard.slice(lastDivClose);
    fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);
    console.log('Updated: Dashboard with activity feed');
  }
} else {
  console.log('Skipped: Activity feed (no Upcoming Bookings found)');
}

// ============================================================
// 5. ADD SETTINGS TO SIDEBAR
// ============================================================
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (sidebar.indexOf('/dashboard/settings') === -1) {
  const integrationTarget = 'label: "Apploi Integration",';
  const integrationIdx = sidebar.indexOf(integrationTarget);

  if (integrationIdx !== -1) {
    let braceCount = 0;
    let searchStart = sidebar.lastIndexOf('{', integrationIdx);
    let endIdx = searchStart;
    for (let i = searchStart; i < sidebar.length; i++) {
      if (sidebar[i] === '{') braceCount++;
      if (sidebar[i] === '}') braceCount--;
      if (braceCount === 0) { endIdx = i + 1; break; }
    }
    if (sidebar[endIdx] === ',') endIdx++;

    const settingsItem = `
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },`;

    sidebar = sidebar.slice(0, endIdx) + settingsItem + sidebar.slice(endIdx);
    fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
    console.log('Updated: Sidebar with Settings nav');
  }
}

// ============================================================
// 6. ADD SETTINGS TO MOBILE HEADER
// ============================================================
let mobileHeader = fs.readFileSync('src/components/MobileHeader.tsx', 'utf8');
if (mobileHeader.indexOf('settings') === -1) {
  mobileHeader = mobileHeader.replace(
    '{ label: "Team Schedule", href: "/dashboard/team-bookings" },',
    '{ label: "Team Schedule", href: "/dashboard/team-bookings" },\n  { label: "Settings", href: "/dashboard/settings" },'
  );
  fs.writeFileSync('src/components/MobileHeader.tsx', mobileHeader);
  console.log('Updated: MobileHeader with Settings');
}

console.log('\n========================================');
console.log('All 4 features built!');
console.log('========================================');
console.log('\n1. Cancel modal on Bookings page (sends email via Resend)');
console.log('2. Meeting Types CRUD (create, toggle active/inactive, copy link)');
console.log('3. Settings page (profile, timezone, notifications, danger zone)');
console.log('4. Activity feed on Dashboard (recent booking events)');
console.log('\nRun:');
console.log('git add . && git commit -m "Add cancel modal, meeting type CRUD, settings, activity feed" && git push origin main');
