"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

export default function GoogleCalendarSection() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("hosts")
        .select("google_refresh_token")
        .eq("id", user.id)
        .single();
      setConnected(!!data?.google_refresh_token);
    }
    check();
  }, [searchParams]);

  async function handleDisconnect() {
    setDisconnecting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("hosts").update({
      google_refresh_token: null,
      google_access_token: null,
    }).eq("id", user.id);
    setConnected(false);
    setDisconnecting(false);
  }

  const justConnected = searchParams.get("calendar") === "connected";
  const hadError = searchParams.get("calendar") === "error";

  return (
    <div className="mb-6 rounded-xl border bg-white p-6">
      <h2 className="mb-1 text-base font-semibold text-gray-900">Google Calendar</h2>
      <p className="mb-4 text-sm text-gray-500">
        Connect your Google Calendar so bookings appear with a Meet link.
      </p>
      {justConnected && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
          Calendar connected successfully
        </div>
      )}
      {hadError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Connection failed — please try again.
        </div>
      )}
      {connected === null ? (
        <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-100" />
      ) : connected ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-gray-700">Connected</span>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      ) : (
        <a
          href="/api/auth/google-calendar"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          Connect Google Calendar
        </a>
      )}
    </div>
  );
}
