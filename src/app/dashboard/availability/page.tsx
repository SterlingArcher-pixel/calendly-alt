import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AvailabilityEditor from "@/components/AvailabilityEditor";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: availabilityRules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("host_id", user.id)
    .order("day_of_week");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
        <p className="mt-1 text-gray-500">
          Set your weekly available hours for scheduling.
        </p>
      </div>
      <div className="max-w-2xl">
        <AvailabilityEditor
          hostId={user.id}
          existingRules={availabilityRules || []}
        />
      </div>
    </div>
  );
}
