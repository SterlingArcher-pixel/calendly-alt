"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type TimeBlock = {
  id?: string;
  start_time: string;
  end_time: string;
};

type DaySchedule = {
  day_of_week: number;
  is_active: boolean;
  blocks: TimeBlock[];
};

export default function AvailabilityEditor({
  hostId,
  existingRules,
}: {
  hostId: string;
  existingRules: any[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const buildSchedule = (): DaySchedule[] => {
    return DAYS.map((_, i) => {
      const dayRules = existingRules.filter((r) => r.day_of_week === i);
      if (dayRules.length > 0) {
        return {
          day_of_week: i,
          is_active: dayRules.some((r) => r.is_active),
          blocks: dayRules.map((r) => ({
            id: r.id,
            start_time: r.start_time,
            end_time: r.end_time,
          })),
        };
      }
      return {
        day_of_week: i,
        is_active: i >= 1 && i <= 5,
        blocks: [{ start_time: "09:00", end_time: "17:00" }],
      };
    });
  };

  const [schedule, setSchedule] = useState<DaySchedule[]>(buildSchedule);

  const toggleDay = (dayIndex: number) => {
    setSchedule(
      schedule.map((d) =>
        d.day_of_week === dayIndex ? { ...d, is_active: !d.is_active } : d
      )
    );
  };

  const updateBlock = (
    dayIndex: number,
    blockIndex: number,
    field: "start_time" | "end_time",
    value: string
  ) => {
    setSchedule(
      schedule.map((d) =>
        d.day_of_week === dayIndex
          ? {
              ...d,
              blocks: d.blocks.map((b, bi) =>
                bi === blockIndex ? { ...b, [field]: value } : b
              ),
            }
          : d
      )
    );
  };

  const addBlock = (dayIndex: number) => {
    setSchedule(
      schedule.map((d) => {
        if (d.day_of_week !== dayIndex) return d;
        const lastBlock = d.blocks[d.blocks.length - 1];
        const lastEnd = lastBlock?.end_time || "12:00";
        // Start new block 1 hour after last end
        const [h] = lastEnd.split(":").map(Number);
        const newStart = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:00`;
        const newEnd = `${String(Math.min(h + 2, 23)).padStart(2, "0")}:00`;
        return {
          ...d,
          blocks: [...d.blocks, { start_time: newStart, end_time: newEnd }],
        };
      })
    );
  };

  const removeBlock = (dayIndex: number, blockIndex: number) => {
    setSchedule(
      schedule.map((d) => {
        if (d.day_of_week !== dayIndex) return d;
        if (d.blocks.length <= 1) return d;
        return {
          ...d,
          blocks: d.blocks.filter((_, bi) => bi !== blockIndex),
        };
      })
    );
  };

  const copyToAll = (dayIndex: number) => {
    const source = schedule.find((d) => d.day_of_week === dayIndex);
    if (!source) return;
    setSchedule(
      schedule.map((d) => ({
        ...d,
        is_active: d.day_of_week === 0 || d.day_of_week === 6 ? d.is_active : true,
        blocks: d.day_of_week === 0 || d.day_of_week === 6
          ? d.blocks
          : source.blocks.map((b) => ({ start_time: b.start_time, end_time: b.end_time })),
      }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    await supabase.from("availability_rules").delete().eq("host_id", hostId);

    const rows: any[] = [];
    schedule.forEach((day) => {
      if (!day.is_active) return;
      day.blocks.forEach((block) => {
        rows.push({
          host_id: hostId,
          day_of_week: day.day_of_week,
          start_time: block.start_time,
          end_time: block.end_time,
          is_active: true,
        });
      });
    });

    if (rows.length > 0) {
      const { error } = await supabase.from("availability_rules").insert(rows);
      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    router.refresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Availability</h2>
          <p className="text-sm text-gray-500">Set your weekly available hours</p>
        </div>
      </div>

      <div className="space-y-3">
        {schedule.map((day) => (
          <div
            key={day.day_of_week}
            className={`rounded-lg border p-3 transition-colors ${
              day.is_active ? "bg-white" : "bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Toggle */}
              <button
                onClick={() => toggleDay(day.day_of_week)}
                className={`flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  day.is_active ? "bg-teal-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    day.is_active ? "translate-x-[18px]" : "translate-x-0.5"
                  }`}
                />
              </button>

              {/* Day name */}
              <span
                className={`w-24 shrink-0 text-sm font-medium ${
                  day.is_active ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {DAYS[day.day_of_week]}
              </span>

              {/* Time blocks */}
              {day.is_active ? (
                <div className="flex flex-1 flex-col gap-2">
                  {day.blocks.map((block, bi) => (
                    <div key={bi} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={block.start_time}
                        onChange={(e) =>
                          updateBlock(day.day_of_week, bi, "start_time", e.target.value)
                        }
                        className="rounded border px-2 py-1 text-sm"
                      />
                      <span className="text-gray-400">—</span>
                      <input
                        type="time"
                        value={block.end_time}
                        onChange={(e) =>
                          updateBlock(day.day_of_week, bi, "end_time", e.target.value)
                        }
                        className="rounded border px-2 py-1 text-sm"
                      />
                      {day.blocks.length > 1 && (
                        <button
                          onClick={() => removeBlock(day.day_of_week, bi)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Remove time block"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Unavailable</span>
              )}

              {/* Add block + Copy to weekdays */}
              {day.is_active && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => addBlock(day.day_of_week)}
                    className="rounded p-1.5 text-gray-400 hover:bg-teal-50 hover:text-teal-600"
                    title="Add time block"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => copyToAll(day.day_of_week)}
                    className="rounded p-1.5 text-gray-400 hover:bg-teal-50 hover:text-teal-600"
                    title="Copy to all weekdays"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Availability"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
