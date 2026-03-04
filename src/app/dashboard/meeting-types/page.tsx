"use client";
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
  const [hostSlug, setHostSlug] = useState("");
  const [copiedId, setCopiedId] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", duration_minutes: 30, color: COLORS[0] });
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadTypes(); }, []);

  async function loadTypes() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("meeting_types").select("*").eq("host_id", user.id).order("created_at");
    setTypes(data || []);
    const { data: hostData } = await supabase.from("hosts").select("booking_url_slug").eq("id", user.id).single();
    if (hostData) setHostSlug(hostData.booking_url_slug || "");
    setLoading(false);
  }

  async function handleCreate() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("meeting_types").insert({
      host_id: user.id, title: form.title, slug, description: form.description,
      duration_minutes: form.duration_minutes, color: form.color, is_active: true,
    });
    if (!error) {
      setForm({ title: "", description: "", duration_minutes: 30, color: COLORS[0] });
      setShowForm(false);
      loadTypes();
    }
    setSaving(false);
  }

  function startEdit(mt: MeetingType) {
    setEditingId(mt.id);
    setEditForm({ title: mt.title, description: mt.description || "", duration_minutes: mt.duration_minutes, color: mt.color });
  }

  async function handleEdit() {
    if (!editingId) return;
    setEditSaving(true);
    const supabase = createClient();
    const slug = editForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    await supabase.from("meeting_types").update({
      title: editForm.title, slug, description: editForm.description,
      duration_minutes: editForm.duration_minutes, color: editForm.color,
    }).eq("id", editingId);
    setEditingId(null);
    setEditSaving(false);
    loadTypes();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const supabase = createClient();
    // Nullify bookings referencing this meeting type first
    await supabase.from("bookings").update({ meeting_type_id: null }).eq("meeting_type_id", deleteId);
    await supabase.from("meeting_types").delete().eq("id", deleteId);
    setDeleteId(null);
    setDeleteTitle("");
    setDeleting(false);
    loadTypes();
  }

  async function toggleActive(mt: MeetingType) {
    const supabase = createClient();
    await supabase.from("meeting_types").update({ is_active: !mt.is_active }).eq("id", mt.id);
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
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
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
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. RN Phone Screen"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setForm({ ...form, duration_minutes: d })}
                    className={`flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                      form.duration_minutes === d ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>{d}m</button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description for candidates"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Color</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${form.color === c ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
            <button onClick={handleCreate} disabled={!form.title || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Creating..." : "Create Meeting Type"}
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit Meeting Type</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d} onClick={() => setEditForm({ ...editForm, duration_minutes: d })}
                      className={`flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                        editForm.duration_minutes === d ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}>{d}m</button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Brief description for candidates"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setEditForm({ ...editForm, color: c })}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${editForm.color === c ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditingId(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleEdit} disabled={!editForm.title || editSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="mb-2 text-center text-lg font-semibold text-gray-900">Delete Meeting Type</h3>
            <p className="mb-6 text-center text-sm text-gray-500">
              Are you sure you want to delete <span className="font-medium text-gray-700">{deleteTitle}</span>? Existing bookings will be preserved but unlinked from this type.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setDeleteId(null); setDeleteTitle(""); }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting types list */}
      <div className="space-y-3">
        {types.map((mt) => (
          <div key={mt.id}
            className={`flex items-center justify-between rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm ${!mt.is_active ? "opacity-60" : ""}`}>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${hostSlug}/${mt.slug}`); setCopiedId(mt.id); setTimeout(() => setCopiedId(""), 2000); }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                {copiedId === mt.id ? "Copied!" : "Copy Link"}
              </button>
              <button onClick={() => startEdit(mt)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                title="Edit">
                Edit
              </button>
              <button onClick={() => { setDeleteId(mt.id); setDeleteTitle(mt.title); }}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                title="Delete">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button onClick={() => toggleActive(mt)}
                className={`relative h-6 w-11 rounded-full transition-colors ${mt.is_active ? "bg-blue-600" : "bg-gray-300"}`}>
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${mt.is_active ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
