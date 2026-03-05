import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Only fetch last 90 days of bookings (not all time)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel queries
  const [bookingsRes, meetingTypesRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, status, starts_at, guest_name, guest_email, meeting_type_id, facility_id, meeting_types(title, color, duration_minutes)")
      .eq("host_id", user.id)
      .gte("starts_at", ninetyDaysAgo)
      .order("starts_at", { ascending: false }),
    supabase
      .from("meeting_types")
      .select("id, title, color, duration_minutes, facility_id")
      .eq("host_id", user.id),
  ]);

  return (
    <AnalyticsClient
      bookings={bookingsRes.data || []}
      meetingTypes={meetingTypesRes.data || []}
    />
  );
}
