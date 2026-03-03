import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import CreateMeetingType from "@/components/CreateMeetingType";
import AvailabilityEditor from "@/components/AvailabilityEditor";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Fetch host record
  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch meeting types
  const { data: meetingTypes } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("host_id", user.id)
    .order("sort_order");

  // Fetch availability rules
  const { data: availabilityRules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("host_id", user.id)
    .order("day_of_week");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              CA
            </div>
            <span className="font-semibold">CalendlyAlt</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {host?.avatar_url && (
                <img
                  src={host.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600">{host?.name}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold">
            Welcome, {host?.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-gray-500">
            Your scheduling page:{" "}
            <code className="rounded bg-gray-100 px-2 py-1 text-sm text-blue-600">
              localhost:3000/{user.email?.split("@")[0]}
            </code>
          </p>
        </div>

        {/* Stats */}
        <div className="mb-10 grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Meeting Types</p>
            <p className="mt-1 text-2xl font-bold">
              {meetingTypes?.length || 0}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Timezone</p>
            <p className="mt-1 text-lg font-semibold">
              {host?.timezone || "Not set"}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Calendar</p>
            <p className="mt-1 text-lg font-semibold text-green-600">
              ✓ Connected
            </p>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Meeting Types */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Meeting Types</h2>
              <CreateMeetingType hostId={user.id} />
            </div>

            {!meetingTypes?.length ? (
              <div className="mt-6 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                <p className="text-gray-400">
                  No meeting types yet. Create your first one to get started.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {meetingTypes.map((mt) => (
                  <div
                    key={mt.id}
                    className="flex items-center justify-between rounded-xl border bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: mt.color }}
                      />
                      <div>
                        <p className="font-medium">{mt.title}</p>
                        <p className="text-xs text-gray-500">
                          {mt.duration_minutes} min · /{mt.slug}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        mt.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {mt.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Availability */}
          <AvailabilityEditor
            hostId={user.id}
            existingRules={availabilityRules || []}
          />
        </div>
      </main>
    </div>
  );
}
