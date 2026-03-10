import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { host_id, email, role } = body;

  if (!host_id || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get the host's org and verify they're admin
  const { data: host } = await supabase
    .from("hosts")
    .select("id, name, default_organization_id")
    .eq("id", host_id)
    .single();

  if (!host?.default_organization_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const orgId = host.default_organization_id;

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("host_id", host_id)
    .single();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can invite" }, { status: 403 });
  }

  // Check if already a member
  const { data: existingHost } = await supabase
    .from("hosts")
    .select("id")
    .eq("email", email)
    .single();

  if (existingHost) {
    const { data: existingMember } = await supabase
      .from("org_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("host_id", existingHost.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "Already a team member" }, { status: 409 });
    }
  }

  // Check for pending invite
  const { data: existingInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", email)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return NextResponse.json({ error: "Invitation already pending" }, { status: 409 });
  }

  // Get org name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  // Create invitation
  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: orgId,
      email,
      role: role || "recruiter",
      invited_by: host_id,
    })
    .select()
    .single();

  if (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }

  // Send invite email via Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://calendly-alt.vercel.app";
  const inviteUrl = siteUrl + "/invite/" + invitation.token;

  if (RESEND_API_KEY) {
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0B2522 0%, #003D37 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">You're Invited</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 16px; color: #374151;">Hi there,</p>
          <p style="margin: 0 0 20px; color: #6b7280;">
            <strong>${host.name}</strong> has invited you to join
            <strong>${org?.name || "their team"}</strong> as a
            <strong>${role || "recruiter"}</strong> on Apploi Scheduling.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0B2522 0%, #003D37 100%); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>

          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
            This invitation expires in 7 days.
          </p>
        </div>
      </div>
    `;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: "Apploi Scheduling <onboarding@resend.dev>",
          to: [email],
          subject: host.name + " invited you to " + (org?.name || "their team") + " on Apploi Scheduling",
          html: htmlBody,
        }),
      });
    } catch (e) {
      console.error("Invite email failed:", e);
    }
  }

  return NextResponse.json({ invitation });
}
