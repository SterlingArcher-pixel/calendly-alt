"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function CreateMeetingType({ hostId }: { hostId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    duration_minutes: 30,
    color: "#3b82f6",
    buffer_before: 0,
    buffer_after: 5,
  });

  const handleTitleChange = (title: string) => {
    setForm({
      ...form,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    });
  };

  const handleSubmit = async () => {
    if (!form.title || !form.slug) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("meeting_types").insert({
      host_id: hostId,
      ...form,
    });
    if (error) {
      alert(error.message);
    } else {
      setOpen(false);
      setForm({
        title: "",
        slug: "",
        description: "",
        duration_minutes: 30,
        color: "#3b82f6",
        buffer_before: 0,
        buffer_after: 5,
      });
      router.refresh();
    }
    setSaving(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + New Meeting Type
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">New Meeting Type</h3>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Quick Chat, Strategy Call"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">URL Slug</label>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>yourname/</span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Brief description of this meeting type"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Duration</label>
          <div className="flex gap-2">
            {[15, 30, 45, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setForm({ ...form, duration_minutes: d })}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  form.duration_minutes === d
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={`h-8 w-8 rounded-full ${
                  form.color === c ? "ring-2 ring-offset-2" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Buffers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Buffer before (min)</label>
            <select
              value={form.buffer_before}
              onChange={(e) => setForm({ ...form, buffer_before: Number(e.target.value) })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {[0, 5, 10, 15, 30].map((v) => (
                <option key={v} value={v}>{v === 0 ? "None" : `${v} min`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Buffer after (min)</label>
            <select
              value={form.buffer_after}
              onChange={(e) => setForm({ ...form, buffer_after: Number(e.target.value) })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {[0, 5, 10, 15, 30].map((v) => (
                <option key={v} value={v}>{v === 0 ? "None" : `${v} min`}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
