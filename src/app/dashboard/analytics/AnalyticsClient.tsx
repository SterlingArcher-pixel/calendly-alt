"use client";

import { useFacility } from "@/contexts/FacilityContext";

interface Booking {
  id: string;
  status: string;
  starts_at: string;
  guest_name: string;
  guest_email: string;
  meeting_type_id: string;
  facility_id: string | null;
  meeting_types: { title: string; color: string; duration_minutes: number } | null;
}

interface MeetingType {
  id: string;
  title: string;
  color: string;
  duration_minutes: number;
  facility_id: string | null;
}

export default function AnalyticsClient({
  bookings: allBookings,
  meetingTypes: allMeetingTypes,
}: {
  bookings: Booking[];
  meetingTypes: MeetingType[];
}) {
  const { activeFacilityId } = useFacility();

  // Filter by active facility
  const bookings = activeFacilityId
    ? allBookings.filter(b => b.facility_id === activeFacilityId)
    : allBookings;
  const meetingTypes = activeFacilityId
    ? allMeetingTypes.filter(mt => mt.facility_id === activeFacilityId || !mt.facility_id)
    : allMeetingTypes;

  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recent = bookings.filter(b => new Date(b.starts_at) >= thirtyDaysAgo);
  const upcoming = bookings.filter(b => new Date(b.starts_at) > now && b.status !== "cancelled");
  const completed = bookings.filter(b => new Date(b.starts_at) <= now && b.status === "confirmed");
  const cancelled = bookings.filter(b => b.status === "cancelled");
  const cancelRate = bookings.length > 0
    ? ((cancelled.length / bookings.length) * 100).toFixed(1)
    : "0";

  // Total interview hours
  const totalMinutes = completed.reduce((sum, b) => {
    const mt = Array.isArray(b.meeting_types) ? b.meeting_types[0] : b.meeting_types;
    return sum + (mt?.duration_minutes || 30);
  }, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Bookings by meeting type
  const byType = meetingTypes.map(mt => {
    const count = bookings.filter(b => b.meeting_type_id === mt.id).length;
    return { ...mt, count };
  }).sort((a, b) => b.count - a.count);

  // Bookings by day of week
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay = dayNames.map((name, i) => ({
    name,
    count: bookings.filter(b => new Date(b.starts_at).getDay() === i).length,
  }));
  const maxDay = Math.max(...byDay.map(d => d.count), 1);

  // Bookings by hour
  const byHour = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 7;
    return {
      label: hour <= 12 ? `${hour}am` : `${hour - 12}pm`,
      count: bookings.filter(b => new Date(b.starts_at).getHours() === hour).length,
    };
  });
  const maxHour = Math.max(...byHour.map(h => h.count), 1);

  // Weekly trend (last 4 weeks)
  const weeklyTrend = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(Date.now() - (3 - i) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = bookings.filter(b => {
      const d = new Date(b.starts_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    return {
      label: `Week ${i + 1}`,
      count,
      start: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
  const maxWeek = Math.max(...weeklyTrend.map(w => w.count), 1);

  // --- Color palette (intentionally distinct from meeting type colors) ---
  const kpiAccents = {
    total:    { border: '#1e293b', text: 'text-gray-900' },        // slate-800 — anchor stat
    upcoming: { border: '#d97706', text: 'text-amber-600' },       // amber — warm, forward-looking
    completed:{ border: '#0d9488', text: 'text-teal-600' },        // teal — brand-aligned success
    cancel:   { border: '#e11d48', text: 'text-rose-600' },        // rose — alert, not the same red as meeting types
    hours:    { border: '#4f46e5', text: 'text-indigo-600' },      // indigo — distinct from purple meeting types
  };

  // Chart palettes — each chart gets its own color lane
  const chartColors = {
    busiestDays: { peak: '#d97706', base: '#fde68a' },     // amber
    peakHours:   { peak: '#475569', base: '#cbd5e1' },     // slate (neutral, analytic)
    weeklyTrend: { peak: '#4f46e5', base: '#a5b4fc' },     // indigo
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Recruiting activity overview</p>
      </div>

      {/* Top stats — colored left border accent, dark numbers */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border bg-white p-5 border-l-4" style={{ borderLeftColor: kpiAccents.total.border }}>
          <p className="text-sm font-medium text-gray-500">Total Interviews</p>
          <p className={`mt-2 text-3xl font-bold ${kpiAccents.total.text}`}>{bookings.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 border-l-4" style={{ borderLeftColor: kpiAccents.upcoming.border }}>
          <p className="text-sm font-medium text-gray-500">Upcoming</p>
          <p className={`mt-2 text-3xl font-bold ${kpiAccents.upcoming.text}`}>{upcoming.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 border-l-4" style={{ borderLeftColor: kpiAccents.completed.border }}>
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className={`mt-2 text-3xl font-bold ${kpiAccents.completed.text}`}>{completed.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 border-l-4" style={{ borderLeftColor: kpiAccents.cancel.border }}>
          <p className="text-sm font-medium text-gray-500">Cancel Rate</p>
          <p className={`mt-2 text-3xl font-bold ${kpiAccents.cancel.text}`}>{cancelRate}%</p>
        </div>
        <div className="rounded-xl border bg-white p-5 border-l-4" style={{ borderLeftColor: kpiAccents.hours.border }}>
          <p className="text-sm font-medium text-gray-500">Interview Hours</p>
          <p className={`mt-2 text-3xl font-bold ${kpiAccents.hours.text}`}>{totalHours}h</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By meeting type — keeps its own per-type colors from DB */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">By Meeting Type</h2>
          <div className="space-y-3">
            {byType.map((mt) => (
              <div key={mt.id} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: mt.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{mt.title}</span>
                    <span className="text-sm font-semibold text-gray-900 ml-2">{mt.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${bookings.length > 0 ? (mt.count / bookings.length) * 100 : 0}%`,
                        backgroundColor: mt.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By day of week — amber palette */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Busiest Days</h2>
          <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
            {byDay.map((d) => (
              <div key={d.name} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-900">{d.count}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(d.count / maxDay) * 120}px`,
                    minHeight: d.count > 0 ? 8 : 2,
                    backgroundColor: d.count === maxDay
                      ? chartColors.busiestDays.peak
                      : chartColors.busiestDays.base,
                  }}
                />
                <span className="text-[10px] font-medium text-gray-500">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Peak hours — slate palette */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Peak Hours</h2>
          <div className="flex items-end justify-between gap-1" style={{ height: 160 }}>
            {byHour.map((h) => (
              <div key={h.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-gray-900">{h.count || ""}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(h.count / maxHour) * 120}px`,
                    minHeight: h.count > 0 ? 8 : 2,
                    backgroundColor: h.count === maxHour
                      ? chartColors.peakHours.peak
                      : chartColors.peakHours.base,
                  }}
                />
                <span className="text-[9px] font-medium text-gray-500">{h.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly trend — indigo palette */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Weekly Trend</h2>
          <div className="flex items-end justify-between gap-4" style={{ height: 160 }}>
            {weeklyTrend.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-sm font-bold text-gray-900">{w.count}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(w.count / maxWeek) * 120}px`,
                    minHeight: w.count > 0 ? 8 : 2,
                    backgroundColor: w.count === maxWeek
                      ? chartColors.weeklyTrend.peak
                      : chartColors.weeklyTrend.base,
                  }}
                />
                <span className="text-[10px] font-medium text-gray-500">{w.start}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
