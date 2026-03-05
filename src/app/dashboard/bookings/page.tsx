import BookingsClient from "./BookingsClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const now = new Date().toISOString();

  // Parallel queries with limits
  const [upcomingRes, pastRes, cancelledRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, meeting_types(title, color, duration_minutes)")
      .eq("host_id", user.id)
      .in("status", ["confirmed", "rescheduled"])
      .gte("starts_at", now)
      .order("starts_at")
      .limit(50),
    supabase
      .from("bookings")
      .select("*, meeting_types(title, color, duration_minutes)")
      .eq("host_id", user.id)
      .eq("status", "confirmed")
      .lt("starts_at", now)
      .order("starts_at", { ascending: false })
      .limit(100),
    supabase
      .from("bookings")
      .select("*, meeting_types(title, color, duration_minutes)")
      .eq("host_id", user.id)
      .eq("status", "cancelled")
      .order("starts_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <BookingsClient
      upcoming={upcomingRes.data || []}
      past={pastRes.data || []}
      cancelled={cancelledRes.data || []}
    />
  );
}
