import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: host } = await supabase
    .from("hosts").select("*").eq("id", user.id).single();

  const { data: meetingTypes } = await supabase
    .from("meeting_types").select("*").eq("host_id", user.id).order("sort_order");

  const now = new Date().toISOString();

  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .in("status", ["confirmed", "rescheduled"])
    .gte("starts_at", now)
    .order("starts_at")
    .limit(5);

  const { count: totalBookings } = await supabase
    .from("bookings").select("*", { count: "exact", head: true })
    .eq("host_id", user.id);

  const { count: pastCount } = await supabase

  const { data: allBookings } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .order("starts_at", { ascending: false })
    .limit(8);
    .from("bookings").select("*", { count: "exact", head: true })
    .eq("host_id", user.id).eq("status", "confirmed").lt("starts_at", now);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {host?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-gray-500">
          Here&apos;s what&apos;s happening with your scheduling.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Meeting Types</p>
            <div className="rounded-lg bg-blue-50 p-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{meetingTypes?.length || 0}</p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Upcoming</p>
            <div className="rounded-lg bg-indigo-50 p-2">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{upcomingBookings?.length || 0}</p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <div className="rounded-lg bg-green-50 p-2">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-green-600">{pastCount || 0}</p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Calendar</p>
            <div className="rounded-lg bg-emerald-50 p-2">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.486a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-emerald-600">
            {host?.google_refresh_token ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>

      {/* Upcoming bookings */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
        {!upcomingBookings?.length ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="mt-3 text-sm text-gray-400">No upcoming bookings yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((b) => {
              const start = new Date(b.starts_at);
              const mt = b.meeting_types as any;
              return (
                <div key={b.id} className="flex items-center justify-between rounded-xl border bg-white p-3 gap-3 transition-shadow hover:shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center rounded-lg bg-blue-50 px-3.5 py-2 text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">
                        {start.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-xl font-bold text-blue-700">{start.getDate()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {mt?.color && (
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mt.color }} />
                        )}
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
                    {b.google_meet_link && (
                      <a
                      
                        href={b.google_meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                        </svg>
                        Join
                      </a>
                    )}
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
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
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="rounded-xl border bg-white">
          <div className="divide-y">
            {(allBookings || []).map((b: any) => {
              const start = new Date(b.starts_at);
              const isPast = start < new Date();
              const mt = b.meeting_types;
              return (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    b.status === "cancelled" ? "bg-red-100" : isPast ? "bg-green-100" : "bg-blue-100"
                  }`}>
                    {b.status === "cancelled" ? (
                      <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : isPast ? (
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{b.guest_name}</span>
                      {b.status === "cancelled" ? " cancelled " : isPast ? " completed " : " booked "}
                      <span className="text-gray-500">{mt?.title || "Meeting"}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                      {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    b.status === "cancelled" ? "bg-red-50 text-red-600" : isPast ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {b.status === "cancelled" ? "cancelled" : isPast ? "completed" : "upcoming"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
</div>
  );
}
