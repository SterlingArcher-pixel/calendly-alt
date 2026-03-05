import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return null;
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per IP per hour
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(clientIp + ":invite", 5, 3600);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateCheck.resetIn) } }
    );
  }

  const body = await request.json();
  const { token, name, password } = body;

  if (!token || !name || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Enforce password complexity
  const passwordError = validatePasswordComplexity(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

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

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingAuthUser = existingUsers?.users?.find(u => u.email === invitation.email);
  let authUserId: string;

  if (existingAuthUser) {
    authUserId = existingAuthUser.id;
  } else {
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

  const { error: hostError } = await supabase.from("hosts").upsert({
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

  const { error: memberError } = await supabase.from("org_members").insert({
    organization_id: invitation.organization_id,
    host_id: authUserId,
    role: invitation.role,
    invited_by: invitation.invited_by,
  });

  if (memberError && !memberError.message.includes("duplicate")) {
    console.error("Member add error:", memberError);
    return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
  }

  await supabase.from("invitations").update({ status: "accepted" }).eq("id", invitation.id);
  return NextResponse.json({ success: true, organization: invitation.organizations });
}
