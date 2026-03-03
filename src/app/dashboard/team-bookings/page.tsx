"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TeamBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [view, setView] = useState<"mine" | "team">("team");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get role
      const { data: host } = await supabase
        .from("hosts").select("id, default_organization_id").eq("id", user.id).single();
      if (host?.default_organization_id) {
        const { data: membership } = await supabase
          .from("org_members").select("role")
          .eq("organization_id", host.default_organization_id)
          .eq("host_id", user.id).single();
        setRole(membership?.role || null);
      }

      const res = await fetch(`/api/team/bookings?host_id=${user.id}&view=${view}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setLoading(false);
    }
    load();
  }, [view]);

  // Toggle always visible for demo

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            {view === "team" ? "All upcoming interviews across your team" : "Your upcoming interviews"}
          </p>
        </div>
        {(
          <div className="flex rounded-lg border bg-white p-1">
            <button
              onClick={() => setView("mine")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "mine" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              My Bookings
            </button>
            <button
              onClick={() => setView("team")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "team" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Team View
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 rounded-xl border bg-white p-4">
              <div className="h-12 w-12 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">No upcoming bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const start = new Date(b.starts_at);
            const mt = b.meeting_types;
            const host = b.hosts;
            return (
              <div key={b.id} className="flex items-center justify-between rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center rounded-lg bg-blue-50 px-3.5 py-2 text-center">
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
                    {view === "team" && host && (
                      <p className="mt-0.5 text-xs text-indigo-500 font-medium">
                        Recruiter: {host.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.google_meet_link && (
                    <a href={b.google_meet_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
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
  );
}
