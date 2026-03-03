"use client";

import { useState } from "react";

const tabs = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type Tab = typeof tabs[number]["key"];

function BookingCard({ b, isPast }: { b: any; isPast?: boolean }) {
  const start = new Date(b.starts_at);
  const mt = b.meeting_types;
  return (
    <div className={`flex items-center justify-between rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm ${isPast ? "opacity-75" : ""}`}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center rounded-lg bg-blue-50 px-3.5 py-2 text-center min-w-[56px]">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">
            {start.toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="text-xl font-bold text-blue-700">{start.getDate()}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            {mt?.color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mt.color }} />}
            <p className="font-medium text-gray-900">{mt?.title || "Meeting"}</p>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            with <span className="font-medium text-gray-700">{b.guest_name}</span> &middot;{" "}
            {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ({mt?.duration_minutes || 30} min)
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{b.guest_email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {b.google_meet_link && !isPast && b.status !== "cancelled" && (
          <a href={b.google_meet_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            Join
          </a>
        )}
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          b.status === "cancelled"
            ? "bg-red-50 text-red-700"
            : b.status === "rescheduled"
            ? "bg-amber-50 text-amber-700"
            : isPast
            ? "bg-gray-100 text-gray-500"
            : "bg-blue-50 text-blue-700"
        }`}>
          {isPast && b.status !== "cancelled" ? "completed" : b.status}
        </span>
      </div>
    </div>
  );
}

export default function BookingsClient({
  upcoming, past, cancelled
}: { upcoming: any[]; past: any[]; cancelled: any[] }) {
  const [tab, setTab] = useState<Tab>("upcoming");

  const counts: Record<Tab, number> = {
    upcoming: upcoming.length,
    past: past.length,
    cancelled: cancelled.length,
  };

  const bookings = tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">{counts.upcoming + counts.past} total interviews</p>
        </div>
        <div className="flex rounded-lg border bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                tab === t.key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
              }`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">No {tab} bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => (
            <BookingCard key={b.id} b={b} isPast={tab === "past"} />
          ))}
        </div>
      )}
    </div>
  );
}
