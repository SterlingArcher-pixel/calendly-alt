import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, name, password } = body;

  if (!token || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get the invitation
  const { data: invitation } = await supabase
    .from("invitations")
    .select("*, organizations(name, slug)")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  // Check if host already exists
  let hostId: string;
  const { data: existingHost } = await supabase
    .from("hosts")
    .select("id")
    .eq("email", invitation.email)
    .single();

  if (existingHost) {
    hostId = existingHost.id;
  } else {
    // Create new host record
    const { data: newHost, error: hostError } = await supabase
      .from("hosts")
      .insert({
        name,
        email: invitation.email,
        timezone: "America/Denver",
        default_organization_id: invitation.organization_id,
      })
      .select()
      .single();

    if (hostError) {
      console.error("Host creation error:", hostError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
    hostId = newHost.id;
  }

  // Add to org
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({
      organization_id: invitation.organization_id,
      host_id: hostId,
      role: invitation.role,
      invited_by: invitation.invited_by,
    });

  if (memberError && !memberError.message.includes("duplicate")) {
    console.error("Member add error:", memberError);
    return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
  }

  // Mark invitation as accepted
  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  return NextResponse.json({
    success: true,
    organization: invitation.organizations,
  });
}
