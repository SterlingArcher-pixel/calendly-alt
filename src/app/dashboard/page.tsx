import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: host } = await supabase.from("hosts").select("*").eq("id", user.id).single();
  const { data: meetingTypes } = await supabase.from("meeting_types").select("*").eq("host_id", user.id).order("sort_order");
  const now = new Date().toISOString();
  const { data: upcomingBookings } = await supabase.from("bookings").select("*, meeting_types(title, color, duration_minutes)").eq("host_id", user.id).in("status", ["confirmed", "rescheduled"]).gte("starts_at", now).order("starts_at").limit(5);
  const { count: pastCount } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("host_id", user.id).eq("status", "confirmed").lt("starts_at", now);
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {host?.name?.split(" ")[0]}</h1>
        <p className="mt-1 text-gray-500">Here&apos;s what&apos;s happening with your scheduling.</p>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        <div className="rounded-xl border bg-white p-5"><p className="text-sm font-medium text-gray-500">Meeting Types</p><p className="mt-2 text-3xl font-bold text-gray-900">{meetingTypes?.length || 0}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm font-medium text-gray-500">Upcoming</p><p className="mt-2 text-3xl font-bold text-indigo-600">{upcomingBookings?.length || 0}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm font-medium text-gray-500">Completed</p><p className="mt-2 text-3xl font-bold text-green-600">{pastCount || 0}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm font-medium text-gray-500">Calendar</p><p className="mt-2 text-lg font-bold text-emerald-600">{host?.google_refresh_token ? "Connected" : "Not connected"}</p></div>
      </div>
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
        {!upcomingBookings?.length ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center"><p className="text-sm text-gray-400">No upcoming bookings yet</p></div>
        ) : (
          <div className="space-y-3">{upcomingBookings.map((b) => { const start = new Date(b.starts_at); const mt = b.meeting_types as any; return (<div key={b.id} className="flex items-center justify-between rounded-xl border bg-white p-4 gap-3"><div className="flex items-center gap-4"><div className="flex flex-col items-center rounded-lg bg-blue-50 px-3.5 py-2 text-center"><span className="text-[10px] font-semibold uppercase text-blue-500">{start.toLocaleDateString("en-US", { month: "short" })}</span><span className="text-xl font-bold text-blue-700">{start.getDate()}</span></div><div><p className="font-medium text-gray-900">{mt?.title || "Meeting"}</p><p className="mt-0.5 text-sm text-gray-500">with {b.guest_name}</p></div></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{b.status}</span></div>); })}</div>
        )}
      </div>
    </div>
  );
}
