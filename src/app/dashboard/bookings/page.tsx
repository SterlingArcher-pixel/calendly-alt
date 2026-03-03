import { createClient } from "@/lib/supabase/server";
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
