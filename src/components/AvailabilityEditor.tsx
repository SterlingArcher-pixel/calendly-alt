"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Rule = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export default function AvailabilityEditor({
  hostId,
  existingRules,
}: {
  hostId: string;
  existingRules: Rule[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Build initial state: one rule per day, prefilled from DB or defaults
  const buildRules = (): Rule[] => {
    return DAYS.map((_, i) => {
      const existing = existingRules.find((r) => r.day_of_week === i);
      if (existing) return existing;
      return {
        day_of_week: i,
        start_time: "09:00",
        end_time: "17:00",
        is_active: i >= 1 && i <= 5, // Mon-Fri default
      };
    });
  };

  const [rules, setRules] = useState<Rule[]>(buildRules);

  const toggleDay = (dayIndex: number) => {
    setRules(
      rules.map((r) =>
        r.day_of_week === dayIndex ? { ...r, is_active: !r.is_active } : r
      )
    );
  };

  const updateTime = (dayIndex: number, field: "start_time" | "end_time", value: string) => {
    setRules(
      rules.map((r) =>
        r.day_of_week === dayIndex ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    // Delete existing rules for this host
    await supabase.from("availability_rules").delete().eq("host_id", hostId);

    // Insert all active rules
    const activeRules = rules
      .filter((r) => r.is_active)
      .map((r) => ({
        host_id: hostId,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        is_active: true,
      }));

    if (activeRules.length > 0) {
      const { error } = await supabase.from("availability_rules").insert(activeRules);
      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    router.refresh();
    setSaving(false);
  };

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">Availability</h2>
      <p className="mb-6 text-sm text-gray-500">Set your weekly available hours</p>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.day_of_week}
            className={`flex items-center gap-4 rounded-lg border p-3 ${
              rule.is_active ? "bg-white" : "bg-gray-50"
            }`}
          >
            {/* Toggle */}
            <button
              onClick={() => toggleDay(rule.day_of_week)}
              className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                rule.is_active ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  rule.is_active ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>

            {/* Day name */}
            <span
              className={`w-24 text-sm font-medium ${
                rule.is_active ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {DAYS[rule.day_of_week]}
            </span>

            {/* Time pickers */}
            {rule.is_active ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={rule.start_time}
                  onChange={(e) => updateTime(rule.day_of_week, "start_time", e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="time"
                  value={rule.end_time}
                  onChange={(e) => updateTime(rule.day_of_week, "end_time", e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                />
              </div>
            ) : (
              <span className="text-sm text-gray-400">Unavailable</span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Availability"}
      </button>
    </div>
  );
}
