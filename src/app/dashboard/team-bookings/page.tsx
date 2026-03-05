"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFacility } from "@/contexts/FacilityContext";

export default function TeamBookingsPage() {
  const { activeFacilityId, activeFacility } = useFacility();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [view, setView] = useState<"mine" | "team">("team");
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const res = await fetch(`/api/team/bookings?host_id=${user.id}&view=${view}`);
      const data = await res.json();
      setAllBookings(data.bookings || []);
      setLoading(false);
    }
    load();
  }, [view]);

  // Filter by facility
  const bookings = activeFacilityId
    ? allBookings.filter(b => b.facility_id === activeFacilityId)
    : allBookings;

  // --- Calendar helpers ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthName = currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" });

  const canGoBack = () => {
    return year > today.getFullYear() ||
      (year === today.getFullYear() && month > today.getMonth());
  };

  const prevMonth = () => {
    if (!canGoBack()) return;
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const formatDateISO = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const isToday = (y: number, m: number, d: number) => {
    return today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  };

  // Build a map of date → booking count
  const bookingsByDate = new Map<string, any[]>();
  for (const b of bookings) {
    const dateKey = new Date(b.starts_at).toISOString().split("T")[0];
    if (!bookingsByDate.has(dateKey)) bookingsByDate.set(dateKey, []);
    bookingsByDate.get(dateKey)!.push(b);
  }

  // Get bookings for selected date
  const selectedBookings = selectedDate ? (bookingsByDate.get(selectedDate) || []) : [];
  selectedBookings.sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeFacility
              ? `Interviews at ${activeFacility.name}`
              : view === "team"
                ? "All upcoming interviews across your team"
                : "Your upcoming interviews"}
          </p>
        </div>
        <div className="flex rounded-lg border bg-white p-1">
          <button
            onClick={() => setView("mine")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "mine" ? "bg-teal-50 text-teal-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            My Bookings
          </button>
          <button
            onClick={() => setView("team")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "team" ? "bg-teal-50 text-teal-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Team View
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-16 rounded-xl bg-gray-100" />)}
        </div>
      ) : (
        <>
          {/* Calendar */}
          <div className="rounded-xl border bg-white p-6 mb-6">
            {/* Month navigation */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">{bookings.length} interview{bookings.length !== 1 ? "s" : ""} total</span>
                <div className="flex gap-1">
                  <button
                    onClick={prevMonth}
                    disabled={!canGoBack()}
                    className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-gray-100">
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} className="aspect-square" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateISO = formatDateISO(year, month, day);
                const dayBookings = bookingsByDate.get(dateISO) || [];
                const hasBookings = dayBookings.length > 0;
                const isSelected = selectedDate === dateISO;
                const isTodayDate = isToday(year, month, day);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateISO)}
                    className={`relative flex flex-col items-center justify-center rounded-xl aspect-square transition-all ${
                      isSelected
                        ? "bg-teal-600 text-white shadow-sm"
                        : isTodayDate
                          ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                          : hasBookings
                            ? "hover:bg-gray-50"
                            : "text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? "text-white" : hasBookings ? "text-gray-900" : ""}`}>
                      {day}
                    </span>
                    {hasBookings && (
                      <div className="mt-0.5 flex items-center gap-0.5">
                        {dayBookings.length <= 3 ? (
                          dayBookings.map((_: any, idx: number) => (
                            <div
                              key={idx}
                              className={`h-1.5 w-1.5 rounded-full ${
                                isSelected ? "bg-white/70" : "bg-gray-400"
                              }`}
                            />
                          ))
                        ) : (
                          <>
                            <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-gray-400"}`} />
                            <span className={`text-[9px] font-medium ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                              +{dayBookings.length}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected date interviews */}
          {selectedDate && (
            <div className="rounded-xl border bg-white">
              <div className="border-b px-5 py-4">
                <h3 className="text-base font-semibold text-gray-900">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedBookings.length} interview{selectedBookings.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>

              {selectedBookings.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400">No interviews scheduled for this day</p>
                </div>
              ) : (
                <div className="divide-y">
                  {selectedBookings.map((b: any) => {
                    const start = new Date(b.starts_at);
                    const mt = b.meeting_types;
                    const host = b.hosts;

                    return (
                      <div key={b.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          {/* Time column */}
                          <div className="w-20 text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </p>
                            <p className="text-[11px] text-gray-400">{mt?.duration_minutes || 30} min</p>
                          </div>

                          {/* Color bar */}
                          <div
                            className="w-1 h-10 rounded-full flex-shrink-0"
                            style={{ backgroundColor: mt?.color || "#6B7280" }}
                          />

                          {/* Details */}
                          <div>
                            <p className="font-medium text-gray-900">{b.guest_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm text-gray-500">{mt?.title || "Interview"}</span>
                              {view === "team" && host && (
                                <>
                                  <span className="text-gray-300">&middot;</span>
                                  <span className="text-xs font-medium text-teal-600">{host.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {b.google_meet_link && (
                            <a
                              href={b.google_meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                              </svg>
                              Join
                            </a>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              b.status === "cancelled"
                                ? "bg-red-50 text-red-700"
                                : b.status === "rescheduled"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-teal-50 text-teal-700"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* No bookings at all */}
          {!selectedDate && bookings.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <p className="mt-3 text-sm text-gray-400">
                No upcoming interviews{activeFacility ? ` for ${activeFacility.name}` : ""}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
