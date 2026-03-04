import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: meetingTypes } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("host_id", user.id)
    .order("sort_order");

  const now = new Date().toISOString();

  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .in("status", ["confirmed", "rescheduled"])
    .gte("starts_at", now)
    .order("starts_at")
    .limit(5);

  const { count: pastCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("host_id", user.id)
    .eq("status", "confirmed")
    .lt("starts_at", now);

  const { data: recentActivity } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color)")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { count: cancelledCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("host_id", user.id)
    .eq("status", "cancelled");

  const totalBookings =
    (upcomingBookings?.length || 0) + (pastCount || 0) + (cancelledCount || 0);
  const cancelRate =
    totalBookings > 0
      ? ((cancelledCount || 0) / totalBookings * 100).toFixed(1)
      : "0";

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {host?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-gray-500">
          Here&apos;s what&apos;s happening with your scheduling.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-5">
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Meeting Types</p>
              <p className="text-2xl font-bold text-gray-900">{meetingTypes?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Upcoming</p>
              <p className="text-2xl font-bold text-indigo-600">{upcomingBookings?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{pastCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Cancel Rate</p>
              <p className="text-2xl font-bold text-red-500">{cancelRate}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Calendar</p>
              <p className="text-lg font-bold text-emerald-600">
                {host?.google_refresh_token ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Upcoming Bookings */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming Bookings
            </h2>
            <Link
              href="/dashboard/bookings"
              className="text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              View all
            </Link>
          </div>
          {!upcomingBookings?.length ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <p className="mt-3 text-sm text-gray-400">
                No upcoming bookings yet
              </p>
              <Link
                href="/dashboard/meeting-types"
                className="mt-4 inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Share a booking link to get started
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((b) => {
                const start = new Date(b.starts_at);
                const mt = b.meeting_types as any;
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center rounded-lg bg-teal-50 px-3.5 py-2 text-center">
                        <span className="text-[10px] font-semibold uppercase text-teal-500">
                          {start.toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-xl font-bold text-teal-700">
                          {start.getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {mt?.color && (
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: mt.color }}
                            />
                          )}
                          <p className="font-medium text-gray-900">
                            {mt?.title || "Meeting"}
                          </p>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          with {b.guest_name} &middot;{" "}
                          {start.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {mt?.duration_minutes && ` (${mt.duration_minutes} min)`}
                        </p>
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
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                        {b.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <div className="rounded-xl border bg-white">
            {!recentActivity?.length ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentActivity.map((b) => {
                  const mt = b.meeting_types as any;
                  const created = new Date(b.created_at);
                  const statusConfig: Record<string, { icon: string; color: string; bg: string }> = {
                    confirmed: { icon: "check", color: "text-green-600", bg: "bg-green-50" },
                    cancelled: { icon: "x", color: "text-red-500", bg: "bg-red-50" },
                    rescheduled: { icon: "refresh", color: "text-amber-600", bg: "bg-amber-50" },
                  };
                  const cfg = statusConfig[b.status] || statusConfig.confirmed;

                  return (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${cfg.bg}`}>
                        {b.status === "cancelled" ? (
                          <svg className={`h-4 w-4 ${cfg.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : b.status === "rescheduled" ? (
                          <svg className={`h-4 w-4 ${cfg.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                          </svg>
                        ) : (
                          <svg className={`h-4 w-4 ${cfg.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {b.guest_name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {mt?.title || "Meeting"} &middot;{" "}
                          {created.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          b.status === "cancelled"
                            ? "bg-red-50 text-red-600"
                            : b.status === "rescheduled"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="mt-4 rounded-xl border bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Links</h3>
            <div className="space-y-2">
              {(meetingTypes || []).slice(0, 3).map((mt: any) => (
                <div key={mt.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mt.color }} />
                    <span className="text-xs font-medium text-gray-700">{mt.title}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">/{host?.booking_url_slug}/{mt.slug}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
