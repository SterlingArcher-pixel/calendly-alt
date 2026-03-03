"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import CopyLink from "@/components/CopyLink";

type MeetingType = {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration_minutes: number;
  color: string;
  is_active: boolean;
  buffer_before: number;
  buffer_after: number;
};

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

export default function MeetingTypesPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostId, setHostId] = useState("");
  const [emailPrefix, setEmailPrefix] = useState("");

  // Edit modal state
  const [editing, setEditing] = useState<MeetingType | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDuration, setEditDuration] = useState(30);
  const [editColor, setEditColor] = useState("#3b82f6");
  const [editBufferBefore, setEditBufferBefore] = useState(0);
  const [editBufferAfter, setEditBufferAfter] = useState(0);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create modal
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newColor, setNewColor] = useState("#3b82f6");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setHostId(user.id);
    setEmailPrefix(user.email?.split("@")[0] || "");

    const { data } = await supabase
      .from("meeting_types").select("*").eq("host_id", user.id).order("sort_order");
    setMeetingTypes(data || []);
    setLoading(false);
  }

  function openEdit(mt: MeetingType) {
    setEditing(mt);
    setEditTitle(mt.title);
    setEditDesc(mt.description || "");
    setEditDuration(mt.duration_minutes);
    setEditColor(mt.color);
    setEditBufferBefore(mt.buffer_before || 0);
    setEditBufferAfter(mt.buffer_after || 0);
    setEditActive(mt.is_active);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("meeting_types").update({
      title: editTitle,
      description: editDesc,
      duration_minutes: editDuration,
      color: editColor,
      buffer_before: editBufferBefore,
      buffer_after: editBufferAfter,
      is_active: editActive,
    }).eq("id", editing.id);
    setSaving(false);
    setEditing(null);
    loadData();
  }

  async function deleteMeetingType(id: string) {
    if (!confirm("Are you sure you want to delete this meeting type?")) return;
    const supabase = createClient();
    await supabase.from("meeting_types").delete().eq("id", id);
    loadData();
  }

  async function createMeetingType() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await supabase.from("meeting_types").insert({
      host_id: hostId,
      title: newTitle,
      slug,
      description: newDesc,
      duration_minutes: newDuration,
      color: newColor,
      is_active: true,
      sort_order: meetingTypes.length,
    });
    setSaving(false);
    setCreating(false);
    setNewTitle("");
    setNewDesc("");
    setNewDuration(30);
    setNewColor("#3b82f6");
    loadData();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Types</h1>
          <p className="mt-1 text-gray-500">Create and manage your scheduling links.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Meeting Type
        </button>
      </div>

      {meetingTypes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-16 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-gray-500">No meeting types yet</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create your first
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {meetingTypes.map((mt) => (
            <div key={mt.id} className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: mt.color }} />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{mt.title}</h3>
                    {mt.description && (
                      <p className="mt-0.5 text-sm text-gray-500">{mt.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    mt.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {mt.is_active ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => openEdit(mt)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteMeetingType(mt.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {mt.duration_minutes} min
                </span>
                {(mt.buffer_before > 0 || mt.buffer_after > 0) && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    {mt.buffer_before > 0 ? `${mt.buffer_before}m before` : ""}
                    {mt.buffer_before > 0 && mt.buffer_after > 0 ? " / " : ""}
                    {mt.buffer_after > 0 ? `${mt.buffer_after}m after` : ""}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <code className="flex-1 truncate text-xs text-gray-600">
                  {window.location.host}/{emailPrefix}/{mt.slug}
                </code>
                <CopyLink url={`${window.location.origin}/${emailPrefix}/${mt.slug}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Edit Meeting Type</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
                  <select value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm">
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Buffer before</label>
                  <select value={editBufferBefore} onChange={(e) => setEditBufferBefore(Number(e.target.value))}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm">
                    <option value={0}>None</option>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Buffer after</label>
                  <select value={editBufferAfter} onChange={(e) => setEditBufferAfter(Number(e.target.value))}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm">
                    <option value={0}>None</option>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setEditColor(c)}
                      className={`h-8 w-8 rounded-full transition-transform ${editColor === c ? "scale-110 ring-2 ring-offset-2 ring-blue-500" : "hover:scale-105"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditActive(!editActive)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${editActive ? "bg-blue-600" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editActive ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm text-gray-700">{editActive ? "Active" : "Inactive"}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">New Meeting Type</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Title *</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Initial Screening"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="Brief description of this meeting"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
                <select value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm">
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`h-8 w-8 rounded-full transition-transform ${newColor === c ? "scale-110 ring-2 ring-offset-2 ring-blue-500" : "hover:scale-105"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setCreating(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={createMeetingType} disabled={saving || !newTitle.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
