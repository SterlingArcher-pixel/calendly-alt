import { createClient } from "@/lib/supabase/server";
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
    .select("id, status, starts_at, guest_name, guest_email, meeting_type_id, facility_id, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .order("starts_at", { ascending: false });

  // Meeting types
  const { data: meetingTypes } = await supabase
    .from("meeting_types")
    .select("id, title, color, duration_minutes, facility_id")
    .eq("host_id", user.id);

  return <AnalyticsClient bookings={allBookings || []} meetingTypes={meetingTypes || []} />;
}
