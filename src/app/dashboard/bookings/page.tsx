import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const now = new Date().toISOString();

  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .in("status", ["confirmed", "rescheduled"])
    .gte("starts_at", now)
    .order("starts_at");

  const { data: pastBookings } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .lt("starts_at", now)
    .order("starts_at", { ascending: false })
    .limit(20);

  const { data: cancelledBookings } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", user.id)
    .in("status", ["cancelled", "no_show"])
    .order("starts_at", { ascending: false })
    .limit(10);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const BookingRow = ({ booking, showStatus = true }: { booking: any; showStatus?: boolean }) => {
    const mt = booking.meeting_types as any;
    const statusColors: Record<string, string> = {
      confirmed: "bg-green-50 text-green-700",
      rescheduled: "bg-yellow-50 text-yellow-700",
      cancelled: "bg-red-50 text-red-700",
      no_show: "bg-gray-100 text-gray-600",
    };
    return (
      <tr className="border-b last:border-b-0 hover:bg-gray-50">
        <td className="py-3.5 pl-6 pr-3">
          <div className="flex items-center gap-2.5">
            {mt?.color && (
              <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: mt.color }} />
            )}
            <span className="font-medium text-gray-900">{mt?.title || "Meeting"}</span>
          </div>
        </td>
        <td className="px-3 py-3.5">
          <div>
            <p className="font-medium text-gray-900">{booking.guest_name}</p>
            <p className="text-xs text-gray-500">{booking.guest_email}</p>
          </div>
        </td>
        <td className="px-3 py-3.5 text-sm text-gray-600">
          {formatDate(booking.starts_at)}
        </td>
        <td className="px-3 py-3.5 text-sm text-gray-600">
          {formatTime(booking.starts_at)} - {formatTime(booking.ends_at)}
        </td>
        <td className="px-3 py-3.5">
          {showStatus && (
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] || "bg-gray-100 text-gray-600"}`}>
              {booking.status}
            </span>
          )}
        </td>
        <td className="py-3.5 pl-3 pr-6">
          <div className="flex items-center gap-2">
            {booking.google_meet_link && (
              <a
                href={booking.google_meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
              >
                Meet
              </a>
            )}
            {showStatus && booking.status !== "cancelled" && (
              <a
                href={`/booking/${booking.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Manage
              </a>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-1 text-gray-500">
          View and manage all your scheduled meetings.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-3 gap-5">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Upcoming</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{upcomingBookings?.length || 0}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Past</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{pastBookings?.length || 0}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Cancelled / No-show</p>
          <p className="mt-1 text-3xl font-bold text-red-500">{cancelledBookings?.length || 0}</p>
        </div>
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Upcoming</h2>
        {!upcomingBookings?.length ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-400">No upcoming bookings</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="py-3 pl-6 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Guest</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Time</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="py-3 pl-3 pr-6 text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past */}
      {pastBookings && pastBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Past</h2>
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="py-3 pl-6 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Guest</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Time</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="py-3 pl-3 pr-6 text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastBookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancelled */}
      {cancelledBookings && cancelledBookings.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Cancelled / No-show</h2>
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="py-3 pl-6 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Guest</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Time</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="py-3 pl-3 pr-6 text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cancelledBookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
