"use client";
import GoogleCalendarSection from "./GoogleCalendarSection";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [host, setHost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    timezone: "America/Denver",
    booking_url_slug: "",
  });
  const [notifications, setNotifications] = useState([
    { label: "Email confirmation to candidates", desc: "Send booking confirmation via email", on: true },
    { label: "Calendar invite", desc: "Auto-create Google Calendar event with Meet link", on: true },
    { label: "SMS reminders", desc: "24hr + 2hr interview reminders via SMS", on: false },
    { label: "Cancellation notifications", desc: "Email candidate when interview is cancelled", on: true },
  ]);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  function toggleNotification(index: number) {
    setNotifications(prev => prev.map((n, i) => i === index ? { ...n, on: !n.on } : n));
  }

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

  async function handleDeleteAccount() {
    if (!host || deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    const supabase = createClient();
    const userId = host.id;

    // Cascade delete: bookings → meeting_types → availability_rules → availability_overrides → hosts
    await supabase.from("bookings").delete().eq("host_id", userId);
    await supabase.from("meeting_types").delete().eq("host_id", userId);
    await supabase.from("availability_rules").delete().eq("host_id", userId);
    await supabase.from("availability_overrides").delete().eq("host_id", userId);
    await supabase.from("hosts").delete().eq("id", userId);

    // Sign out
    await supabase.auth.signOut();
    router.push("/");
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-700">
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
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Timezone</label>
            <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500">
              {timezones.map(tz => (<option key={tz} value={tz}>{tz.replace("_", " ")}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Booking URL Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">calendly-alt.vercel.app/</span>
              <input value={form.booking_url_slug} onChange={(e) => setForm({ ...form, booking_url_slug: e.target.value })}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="charlie-fischer" />
            </div>
          </div>
        </div>
      </div>

      <GoogleCalendarSection />
      {/* Notifications */}
      <div className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Notifications</h2>
        <div className="space-y-4">
          {notifications.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button type="button" onClick={() => toggleNotification(i)}
                className={`relative h-6 w-11 rounded-full transition-colors ${item.on ? "bg-teal-600" : "bg-gray-300"}`}>
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${item.on ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="mb-2 text-base font-semibold text-red-900">Danger Zone</h2>
        <p className="mb-4 text-sm text-red-700">Permanently delete your account and all associated data including bookings, meeting types, and availability rules.</p>
        <button onClick={() => setShowDeleteConfirm(true)}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
          Delete Account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mb-2 text-center text-lg font-semibold text-gray-900">Delete Your Account?</h3>
            <p className="mb-4 text-center text-sm text-gray-500">
              This will permanently delete your profile, all meeting types, availability rules, and booking history. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE" || deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-[#F8F6F3]/80 px-1 py-4 backdrop-blur">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
