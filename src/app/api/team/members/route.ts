import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hostId = searchParams.get("host_id");

  if (!hostId) {
    return NextResponse.json({ error: "Missing host_id" }, { status: 400 });
  }

  // Get the host's org
  const { data: host } = await supabase
    .from("hosts")
    .select("default_organization_id")
    .eq("id", hostId)
    .single();

  if (!host?.default_organization_id) {
    return NextResponse.json({ members: [], org: null });
  }

  const orgId = host.default_organization_id;

  // Get org details
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  // Get members with host details
  const { data: members } = await supabase
    .from("org_members")
    .select("id, role, joined_at, host_id, hosts!org_members_host_id_fkey(id, name, email, avatar_url)")
    .eq("organization_id", orgId)
    .order("joined_at", { ascending: true });

  // Get pending invitations
  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, email, role, status, created_at, expires_at")
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    org,
    members: members || [],
    invitations: invitations || [],
  });
}
