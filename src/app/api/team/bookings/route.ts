import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const hostId = req.nextUrl.searchParams.get("host_id");
  const view = req.nextUrl.searchParams.get("view") || "mine"; // mine | team

  if (!hostId) return NextResponse.json({ error: "Missing host_id" }, { status: 400 });

  // Get host's org
  const { data: host } = await supabase
    .from("hosts").select("id, default_organization_id").eq("id", hostId).single();

  if (!host?.default_organization_id) {
    return NextResponse.json({ bookings: [] });
  }

  const now = new Date().toISOString();

  if (view === "team") {
    // Get all org member host IDs
    const { data: members } = await supabase
      .from("org_members")
      .select("host_id")
      .eq("organization_id", host.default_organization_id);

    const hostIds = members?.map(m => m.host_id) || [hostId];

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, meeting_types(title, color, duration_minutes), hosts!bookings_host_id_fkey(name, email)")
      .in("host_id", hostIds)
      .in("status", ["confirmed", "rescheduled"])
      .gte("starts_at", now)
      .order("starts_at")
      .limit(50);

    return NextResponse.json({ bookings: bookings || [] });
  }

  // Default: just my bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, meeting_types(title, color, duration_minutes)")
    .eq("host_id", hostId)
    .in("status", ["confirmed", "rescheduled"])
    .gte("starts_at", now)
    .order("starts_at")
    .limit(50);

  return NextResponse.json({ bookings: bookings || [] });
}
