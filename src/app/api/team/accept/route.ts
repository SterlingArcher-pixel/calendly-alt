import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service role key — required to create auth users
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, name, password } = body;

  if (!token || !name || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
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

  if (new Date(invitation.expires_at) < new Date()) {
    await supabase.from("invitations").update({ status: "expired" }).eq("id", invitation.id);
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  // Check if auth user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingAuthUser = existingUsers?.users?.find(u => u.email === invitation.email);

  let authUserId: string;

  if (existingAuthUser) {
    // User already has an auth account — just use their ID
    authUserId = existingAuthUser.id;
  } else {
    // Create real Supabase auth account with email + password
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authError || !authData.user) {
      console.error("Auth creation error:", authError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
    authUserId = authData.user.id;
  }

  // Upsert hosts record using the auth user ID
  const { error: hostError } = await supabase
    .from("hosts")
    .upsert({
      id: authUserId,
      name,
      email: invitation.email,
      timezone: "America/Denver",
      default_organization_id: invitation.organization_id,
    }, { onConflict: "id" });

  if (hostError) {
    console.error("Host upsert error:", hostError);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // Add to org (ignore duplicate)
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({
      organization_id: invitation.organization_id,
      host_id: authUserId,
      role: invitation.role,
      invited_by: invitation.invited_by,
    });

  if (memberError && !memberError.message.includes("duplicate")) {
    console.error("Member add error:", memberError);
    return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
  }

  // Mark invitation accepted
  await supabase.from("invitations").update({ status: "accepted" }).eq("id", invitation.id);

  return NextResponse.json({ success: true, organization: invitation.organizations });
}
