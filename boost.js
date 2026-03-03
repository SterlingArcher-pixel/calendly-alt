// Three features: Bookings filters, Cancel emails, Analytics
// Run from ~/Desktop/calendly-alt/ with: node boost.js
const fs = require('fs');

console.log('Building 3 features...\n');

// ============================================================
// 1. BOOKINGS PAGE WITH FILTERS (upcoming/past/cancelled)
// ============================================================
const bookingsPage = `import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BookingsClient from "./BookingsClient";

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const now = new Date().toISOString();

  const { data: upcoming } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .in("status", ["confirmed", "rescheduled"])
    .gte("starts_at", now)
    .order("starts_at");

  const { data: past } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .eq("status", "confirmed")
    .lt("starts_at", now)
    .order("starts_at", { ascending: false });

  const { data: cancelled } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .eq("status", "cancelled")
    .order("starts_at", { ascending: false });

  return <BookingsClient upcoming={upcoming || []} past={past || []} cancelled={cancelled || []} />;
}
`;

const bookingsClient = `"use client";

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
    <div className={\`flex items-center justify-between rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm \${isPast ? "opacity-75" : ""}\`}>
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
        <span className={\`rounded-full px-2.5 py-1 text-xs font-medium \${
          b.status === "cancelled"
            ? "bg-red-50 text-red-700"
            : b.status === "rescheduled"
            ? "bg-amber-50 text-amber-700"
            : isPast
            ? "bg-gray-100 text-gray-500"
            : "bg-blue-50 text-blue-700"
        }\`}>
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
              className={\`rounded-md px-3 py-1.5 text-sm font-medium transition-colors \${
                tab === t.key ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }\`}
            >
              {t.label}
              <span className={\`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] \${
                tab === t.key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
              }\`}>
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
`;

fs.mkdirSync('src/app/dashboard/bookings', { recursive: true });
fs.writeFileSync('src/app/dashboard/bookings/page.tsx', bookingsPage);
fs.writeFileSync('src/app/dashboard/bookings/BookingsClient.tsx', bookingsClient);
console.log('Created: Bookings page with Upcoming/Past/Cancelled tabs');

// ============================================================
// 2. CANCEL BOOKING API + EMAIL
// ============================================================
const cancelAPI = `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { bookingId, reason } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get booking details before cancelling
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, duration_minutes), hosts(name, email)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Update status
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send cancellation email
  try {
    const start = new Date(booking.starts_at);
    const host = booking.hosts as any;
    const mt = booking.meeting_types as any;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${process.env.RESEND_API_KEY}\`,
      },
      body: JSON.stringify({
        from: "Scheduling Tool <onboarding@resend.dev>",
        to: booking.guest_email,
        subject: \`Cancelled: \${mt?.title || "Meeting"} with \${host?.name || "Recruiter"}\`,
        html: \`
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px; color: #991B1B; font-size: 18px;">Interview Cancelled</h2>
              <p style="margin: 0; color: #DC2626; font-size: 14px;">
                Your \${mt?.title || "meeting"} has been cancelled.
              </p>
            </div>
            <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">
                <strong>What:</strong> \${mt?.title || "Meeting"}
              </p>
              <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">
                <strong>When:</strong> \${start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at \${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
              <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">
                <strong>With:</strong> \${host?.name || "Recruiter"}
              </p>
              \${reason ? \`<p style="margin: 8px 0 0; font-size: 14px; color: #6B7280;"><strong>Reason:</strong> \${reason}</p>\` : ""}
            </div>
            <p style="font-size: 13px; color: #9CA3AF; text-align: center;">
              Sent by Scheduling Tool
            </p>
          </div>
        \`,
      }),
    });

    if (!res.ok) {
      console.error("Cancel email failed:", await res.text());
    }
  } catch (e) {
    console.error("Cancel email error:", e);
  }

  return NextResponse.json({ success: true });
}
`;

fs.mkdirSync('src/app/api/bookings/cancel', { recursive: true });
fs.writeFileSync('src/app/api/bookings/cancel/route.ts', cancelAPI);
console.log('Created: Cancel booking API with email notification');

// ============================================================
// 3. RESCHEDULE API
// ============================================================
const rescheduleAPI = `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { bookingId, newStartsAt, newEndsAt } = await req.json();

  if (!bookingId || !newStartsAt || !newEndsAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, duration_minutes), hosts(name, email)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("bookings")
    .update({ starts_at: newStartsAt, ends_at: newEndsAt, status: "rescheduled" })
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send reschedule email
  try {
    const newStart = new Date(newStartsAt);
    const host = booking.hosts as any;
    const mt = booking.meeting_types as any;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${process.env.RESEND_API_KEY}\`,
      },
      body: JSON.stringify({
        from: "Scheduling Tool <onboarding@resend.dev>",
        to: booking.guest_email,
        subject: \`Rescheduled: \${mt?.title || "Meeting"} with \${host?.name || "Recruiter"}\`,
        html: \`
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px; color: #92400E; font-size: 18px;">Interview Rescheduled</h2>
              <p style="margin: 0; color: #B45309; font-size: 14px;">
                Your \${mt?.title || "meeting"} has been moved to a new time.
              </p>
            </div>
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">New Time</p>
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #15803D;">
                \${newStart.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <p style="margin: 4px 0 0; font-size: 14px; color: #16A34A;">
                \${newStart.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (\${mt?.duration_minutes || 30} min)
              </p>
            </div>
            \${booking.google_meet_link ? \`
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="\${booking.google_meet_link}" style="display: inline-block; background: #16A34A; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                  Join Google Meet
                </a>
              </div>
            \` : ""}
            <p style="font-size: 13px; color: #9CA3AF; text-align: center;">
              Sent by Scheduling Tool
            </p>
          </div>
        \`,
      }),
    });
  } catch (e) {
    console.error("Reschedule email error:", e);
  }

  return NextResponse.json({ success: true });
}
`;

fs.mkdirSync('src/app/api/bookings/reschedule', { recursive: true });
fs.writeFileSync('src/app/api/bookings/reschedule/route.ts', rescheduleAPI);
console.log('Created: Reschedule booking API with email notification');

// ============================================================
// 4. ANALYTICS DASHBOARD
// ============================================================
const analyticsPage = `import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // All bookings for this host
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("id, status, starts_at, guest_name, guest_email, meeting_type_id, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .order("starts_at", { ascending: false });

  // Meeting types
  const { data: meetingTypes } = await supabase
    .from("meeting_types")
    .select("id, title, color, duration_minutes")
    .eq("host_id", user.id);

  return <AnalyticsClient bookings={allBookings || []} meetingTypes={meetingTypes || []} />;
}
`;

const analyticsClient = `"use client";

interface Booking {
  id: string;
  status: string;
  starts_at: string;
  guest_name: string;
  guest_email: string;
  meeting_type_id: string;
  meeting_types: { title: string; color: string; duration_minutes: number } | null;
}

interface MeetingType {
  id: string;
  title: string;
  color: string;
  duration_minutes: number;
}

export default function AnalyticsClient({
  bookings,
  meetingTypes,
}: {
  bookings: Booking[];
  meetingTypes: MeetingType[];
}) {
  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recent = bookings.filter(b => new Date(b.starts_at) >= thirtyDaysAgo);
  const upcoming = bookings.filter(b => new Date(b.starts_at) > now && b.status !== "cancelled");
  const completed = bookings.filter(b => new Date(b.starts_at) <= now && b.status === "confirmed");
  const cancelled = bookings.filter(b => b.status === "cancelled");
  const cancelRate = bookings.length > 0 ? ((cancelled.length / bookings.length) * 100).toFixed(1) : "0";

  // Total interview hours
  const totalMinutes = completed.reduce((sum, b) => {
    const mt = b.meeting_types;
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
    const hour = i + 7; // 7am to 6pm
    return {
      label: hour <= 12 ? \`\${hour}am\` : \`\${hour - 12}pm\`,
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
      label: \`Week \${i + 1}\`,
      count,
      start: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
  const maxWeek = Math.max(...weeklyTrend.map(w => w.count), 1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Recruiting activity overview</p>
      </div>

      {/* Top stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Interviews</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Upcoming</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{upcoming.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{completed.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Cancel Rate</p>
          <p className="mt-2 text-3xl font-bold text-red-500">{cancelRate}%</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Interview Hours</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{totalHours}h</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By meeting type */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">By Meeting Type</h2>
          <div className="space-y-3">
            {byType.map((mt) => (
              <div key={mt.id} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: mt.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{mt.title}</span>
                    <span className="text-sm font-semibold text-gray-900 ml-2">{mt.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: \`\${bookings.length > 0 ? (mt.count / bookings.length) * 100 : 0}%\`,
                        backgroundColor: mt.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By day of week */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Busiest Days</h2>
          <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
            {byDay.map((d) => (
              <div key={d.name} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-900">{d.count}</span>
                <div
                  className="w-full rounded-t-md bg-blue-500 transition-all"
                  style={{ height: \`\${(d.count / maxDay) * 120}px\`, minHeight: d.count > 0 ? 8 : 2, backgroundColor: d.count === maxDay ? '#2563EB' : '#93C5FD' }}
                />
                <span className="text-[10px] font-medium text-gray-500">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Peak hours */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Peak Hours</h2>
          <div className="flex items-end justify-between gap-1" style={{ height: 160 }}>
            {byHour.map((h) => (
              <div key={h.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-gray-900">{h.count || ""}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{ height: \`\${(h.count / maxHour) * 120}px\`, minHeight: h.count > 0 ? 8 : 2, backgroundColor: h.count === maxHour ? '#7C3AED' : '#C4B5FD' }}
                />
                <span className="text-[9px] font-medium text-gray-500">{h.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly trend */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Weekly Trend</h2>
          <div className="flex items-end justify-between gap-4" style={{ height: 160 }}>
            {weeklyTrend.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-sm font-bold text-gray-900">{w.count}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{ height: \`\${(w.count / maxWeek) * 120}px\`, minHeight: w.count > 0 ? 8 : 2, backgroundColor: '#10B981' }}
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
`;

fs.mkdirSync('src/app/dashboard/analytics', { recursive: true });
fs.writeFileSync('src/app/dashboard/analytics/page.tsx', analyticsPage);
fs.writeFileSync('src/app/dashboard/analytics/AnalyticsClient.tsx', analyticsClient);
console.log('Created: Analytics dashboard with charts');

// ============================================================
// 5. ADD ANALYTICS TO SIDEBAR
// ============================================================
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (sidebar.indexOf('/dashboard/analytics') === -1) {
  const bookingsTarget = 'label: "Bookings",';
  const bookingsIdx = sidebar.indexOf(bookingsTarget);

  if (bookingsIdx !== -1) {
    let braceCount = 0;
    let searchStart = sidebar.lastIndexOf('{', bookingsIdx);
    let endIdx = searchStart;
    for (let i = searchStart; i < sidebar.length; i++) {
      if (sidebar[i] === '{') braceCount++;
      if (sidebar[i] === '}') braceCount--;
      if (braceCount === 0) { endIdx = i + 1; break; }
    }
    if (sidebar[endIdx] === ',') endIdx++;

    const analyticsItem = `
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },`;

    sidebar = sidebar.slice(0, endIdx) + analyticsItem + sidebar.slice(endIdx);
    fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
    console.log('Updated: Sidebar with Analytics nav');
  }
}

// ============================================================
// 6. ADD ANALYTICS TO MOBILE HEADER
// ============================================================
let mobileHeader = fs.readFileSync('src/components/MobileHeader.tsx', 'utf8');
if (mobileHeader.indexOf('analytics') === -1) {
  mobileHeader = mobileHeader.replace(
    '{ label: "Bookings", href: "/dashboard/bookings" },',
    '{ label: "Bookings", href: "/dashboard/bookings" },\n  { label: "Analytics", href: "/dashboard/analytics" },'
  );
  fs.writeFileSync('src/components/MobileHeader.tsx', mobileHeader);
  console.log('Updated: MobileHeader with Analytics');
}

console.log('\n========================================');
console.log('All 3 features built!');
console.log('========================================');
console.log('\n1. Bookings page with Upcoming/Past/Cancelled tabs');
console.log('2. Cancel + Reschedule APIs with branded emails');
console.log('3. Analytics dashboard with 5 stat cards + 4 charts');
console.log('\nRun:');
console.log('git add . && git commit -m "Add bookings filters, cancel/reschedule emails, analytics dashboard" && git push origin main');
