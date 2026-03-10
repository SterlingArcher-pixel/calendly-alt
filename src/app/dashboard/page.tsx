"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFacility } from "@/contexts/FacilityContext";
import Link from "next/link";

export default function DashboardOverview() {
  const { activeFacilityId, activeFacility } = useFacility();
  const [host, setHost] = useState<any>(null);
  const [meetingTypes, setMeetingTypes] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [activeFacilityId]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: hostData } = await supabase.from("hosts").select("*").eq("id", user.id).single();
    setHost(hostData);

    // Meeting types
    let mtQuery = supabase.from("meeting_types").select("*").eq("host_id", user.id).order("sort_order");
    const { data: mts } = await mtQuery;
    setMeetingTypes(mts || []);

    const now = new Date().toISOString();

    // Upcoming bookings
    let upQuery = supabase.from("bookings").select("*, meeting_types(title, color, duration_minutes)")
      .eq("host_id", user.id).in("status", ["confirmed", "rescheduled"]).gte("starts_at", now).order("starts_at").limit(5);
    if (activeFacilityId) upQuery = upQuery.eq("facility_id", activeFacilityId);
    const { data: upcoming } = await upQuery;
    setUpcomingBookings(upcoming || []);

    // Past count
    let pastQ = supabase.from("bookings").select("*", { count: "exact", head: true })
      .eq("host_id", user.id).eq("status", "confirmed").lt("starts_at", now);
    if (activeFacilityId) pastQ = pastQ.eq("facility_id", activeFacilityId);
    const { count: pc } = await pastQ;
    setPastCount(pc || 0);

    // Cancelled count
    let cancelQ = supabase.from("bookings").select("*", { count: "exact", head: true })
      .eq("host_id", user.id).eq("status", "cancelled");
    if (activeFacilityId) cancelQ = cancelQ.eq("facility_id", activeFacilityId);
    const { count: cc } = await cancelQ;
    setCancelledCount(cc || 0);

    // Recent activity
    let actQuery = supabase.from("bookings").select("*, meeting_types(title, color)")
      .eq("host_id", user.id).order("created_at", { ascending: false }).limit(8);
    if (activeFacilityId) actQuery = actQuery.eq("facility_id", activeFacilityId);
    const { data: activity } = await actQuery;
    setRecentActivity(activity || []);

    setLoading(false);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-5 w-48 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      </div>
    );
  }

  const totalBookings = (upcomingBookings.length) + pastCount + cancelledCount;
  const cancelRate = totalBookings > 0 ? ((cancelledCount / totalBookings) * 100).toFixed(1) : "0";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {host?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-gray-500">
          {activeFacility
            ? <>Viewing <span className="font-medium text-gray-700">{activeFacility.name}</span></>
            : "Here\u2019s what\u2019s happening with your scheduling."}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-5">
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            </div>
            <div><p className="text-xs font-medium text-gray-500">Meeting Types</p><p className="text-2xl font-bold text-gray-900">{meetingTypes.length}</p></div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
            </div>
            <div><p className="text-xs font-medium text-gray-500">Upcoming</p><p className="text-2xl font-bold text-indigo-600">{upcomingBookings.length}</p></div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div><p className="text-xs font-medium text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{pastCount}</p></div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            </div>
            <div><p className="text-xs font-medium text-gray-500">Cancel Rate</p><p className="text-2xl font-bold text-red-500">{cancelRate}%</p></div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
            </div>
            <div><p className="text-xs font-medium text-gray-500">Calendar</p><p className="text-lg font-bold text-emerald-600">{host?.google_refresh_token ? "Connected" : "Not connected"}</p></div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Upcoming Bookings */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
            <Link href="/dashboard/bookings" className="text-sm font-medium text-teal-600 hover:text-teal-700">View all</Link>
          </div>
          {!upcomingBookings.length ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
              <p className="mt-3 text-sm text-gray-400">No upcoming bookings{activeFacility ? ` for ${activeFacility.name}` : ""}</p>
              <Link href="/dashboard/meeting-types" className="mt-4 inline-block text-sm font-medium text-teal-600 hover:text-teal-700">Share a booking link to get started</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((b) => {
                const start = new Date(b.starts_at);
                const mt = b.meeting_types as any;
                return (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center rounded-lg bg-teal-50 px-3.5 py-2 text-center">
                        <span className="text-[10px] font-semibold uppercase text-teal-500">{start.toLocaleDateString("en-US", { month: "short" })}</span>
                        <span className="text-xl font-bold text-teal-700">{start.getDate()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {mt?.color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mt.color }} />}
                          <p className="font-medium text-gray-900">{mt?.title || "Meeting"}</p>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          with {b.guest_name} &middot; {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {mt?.duration_minutes && ` (${mt.duration_minutes} min)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.google_meet_link && (
                        <a href={b.google_meet_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                          Join
                        </a>
                      )}
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">{b.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div className="rounded-xl border bg-white">
            {!recentActivity.length ? (
              <div className="p-8 text-center"><p className="text-sm text-gray-400">No recent activity</p></div>
            ) : (
              <div className="divide-y">
                {recentActivity.map((b) => {
                  const mt = b.meeting_types as any;
                  const created = new Date(b.created_at);
                  return (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${b.status === "cancelled" ? "bg-red-50" : b.status === "rescheduled" ? "bg-amber-50" : "bg-green-50"}`}>
                        {b.status === "cancelled" ? (
                          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{b.guest_name}</p>
                        <p className="truncate text-xs text-gray-500">{mt?.title || "Meeting"} &middot; {created.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${b.status === "cancelled" ? "bg-red-50 text-red-600" : b.status === "rescheduled" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>{b.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
