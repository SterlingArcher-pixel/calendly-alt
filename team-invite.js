// Team Invite Flow for Scheduling Tool
// Run from ~/Desktop/calendly-alt/ with: node team-invite.js
const fs = require('fs');
const path = require('path');

console.log('Building team invite flow...\n');

// ============================================================
// 1. SQL for invitations table + seed org
// ============================================================
const teamSQL = `-- Team Invite Flow Schema
-- Run this in Supabase SQL Editor

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'viewer')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES hosts(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Allow public read for invite acceptance (by token)
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invitations by token"
  ON invitations FOR SELECT
  USING (true);

CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM org_members
      WHERE host_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Invitations can be updated on accept"
  ON invitations FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);

-- Create the org for Charlie
INSERT INTO organizations (name, slug)
VALUES ('Apploi Demo', 'apploi-demo')
ON CONFLICT (slug) DO NOTHING;

-- Make Charlie an admin (get his host ID dynamically)
INSERT INTO org_members (organization_id, host_id, role)
SELECT o.id, h.id, 'admin'
FROM organizations o, hosts h
WHERE o.slug = 'apploi-demo'
AND h.email = 'charliefischer24@gmail.com'
ON CONFLICT (organization_id, host_id) DO NOTHING;

-- Update Charlie's default org
UPDATE hosts
SET default_organization_id = (SELECT id FROM organizations WHERE slug = 'apploi-demo')
WHERE email = 'charliefischer24@gmail.com';

SELECT 'Team invite schema + org created' AS result;
`;

fs.writeFileSync('team-setup.sql', teamSQL);
console.log('Created: team-setup.sql');

// ============================================================
// 2. API: GET /api/team/members
// ============================================================
fs.mkdirSync('src/app/api/team/members', { recursive: true });

const membersRoute = `import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    .select("id, role, joined_at, host_id, hosts(id, name, email, avatar_url)")
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
`;

fs.writeFileSync('src/app/api/team/members/route.ts', membersRoute);
console.log('Created: src/app/api/team/members/route.ts');

// ============================================================
// 3. API: POST /api/team/invite
// ============================================================
fs.mkdirSync('src/app/api/team/invite', { recursive: true });

const inviteRoute = `import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    const htmlBody = \`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #3b82f6; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">You're Invited</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 16px; color: #374151;">Hi there,</p>
          <p style="margin: 0 0 20px; color: #6b7280;">
            <strong>\${host.name}</strong> has invited you to join
            <strong>\${org?.name || "their team"}</strong> as a
            <strong>\${role || "recruiter"}</strong> on Scheduling Tool.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="\${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>

          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
            This invitation expires in 7 days.
          </p>
        </div>
      </div>
    \`;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: "Scheduling Tool <onboarding@resend.dev>",
          to: [email],
          subject: host.name + " invited you to " + (org?.name || "their team"),
          html: htmlBody,
        }),
      });
    } catch (e) {
      console.error("Invite email failed:", e);
    }
  }

  return NextResponse.json({ invitation });
}
`;

fs.writeFileSync('src/app/api/team/invite/route.ts', inviteRoute);
console.log('Created: src/app/api/team/invite/route.ts');

// ============================================================
// 4. API: POST /api/team/accept
// ============================================================
fs.mkdirSync('src/app/api/team/accept', { recursive: true });

const acceptRoute = `import { createClient } from "@supabase/supabase-js";
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
`;

fs.writeFileSync('src/app/api/team/accept/route.ts', acceptRoute);
console.log('Created: src/app/api/team/accept/route.ts');

// ============================================================
// 5. Public invite acceptance page
// ============================================================
fs.mkdirSync('src/app/invite/[token]', { recursive: true });

const invitePage = `"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    async function loadInvite() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("invitations")
          .select("*, organizations(name, slug)")
          .eq("token", token)
          .eq("status", "pending")
          .single();

        if (!data) {
          setError("This invitation is invalid or has already been used.");
        } else if (new Date(data.expires_at) < new Date()) {
          setError("This invitation has expired.");
        } else {
          setInvitation(data);
        }
      } catch {
        setError("Could not load invitation.");
      }
      setLoading(false);
    }
    loadInvite();
  }, [token]);

  async function handleAccept() {
    if (!name.trim()) return;
    setAccepting(true);

    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setAccepted(true);
        setOrgName(data.organization?.name || "the team");
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Something went wrong");
    }
    setAccepting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to {orgName}!</h1>
          <p className="mt-2 text-gray-500">
            You've successfully joined the team. You can now sign in to start scheduling interviews.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Invitation Error</h1>
          <p className="mt-2 text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <span className="text-lg font-bold text-blue-600">ST</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Join {invitation?.organizations?.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            You've been invited as a <span className="font-medium text-gray-700">{invitation?.role}</span>
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span className="text-sm text-blue-700">{invitation?.email}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>

          <button
            onClick={handleAccept}
            disabled={accepting || !name.trim()}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {accepting ? "Joining..." : "Accept & Join Team"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Powered by Scheduling Tool
        </p>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/invite/[token]/page.tsx', invitePage);
console.log('Created: src/app/invite/[token]/page.tsx');

// ============================================================
// 6. Team Dashboard Page
// ============================================================
fs.mkdirSync('src/app/dashboard/team', { recursive: true });

const teamPage = `"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  role: string;
  joined_at: string;
  host_id: string;
  hosts: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [hostId, setHostId] = useState("");
  const [userRole, setUserRole] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: host } = await supabase
        .from("hosts")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!host) return;
      setHostId(host.id);

      const res = await fetch("/api/team/members?host_id=" + host.id);
      const data = await res.json();

      setMembers(data.members || []);
      setInvitations(data.invitations || []);
      setOrgName(data.org?.name || "");

      // Find current user's role
      const me = (data.members || []).find((m: Member) => m.host_id === host.id);
      setUserRole(me?.role || "");

      setLoading(false);
    }
    load();
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setSending(true);
    setMessage("");

    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host_id: hostId,
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    });

    const data = await res.json();

    if (data.error) {
      setMessage(data.error);
    } else {
      setMessage("Invitation sent to " + inviteEmail);
      setInviteEmail("");
      // Refresh members
      const refreshRes = await fetch("/api/team/members?host_id=" + hostId);
      const refreshData = await refreshRes.json();
      setInvitations(refreshData.invitations || []);
    }
    setSending(false);
  }

  const roleColors: Record<string, string> = {
    admin: "bg-purple-50 text-purple-700",
    recruiter: "bg-blue-50 text-blue-700",
    viewer: "bg-gray-100 text-gray-600",
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="mt-1 text-gray-500">
          Manage your {orgName} team members and invitations.
        </p>
      </div>

      {/* Invite Form (admin only) */}
      {userRole === "admin" && (
        <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Invite a Recruiter</h2>
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="recruiter@example.com"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={sending || !inviteEmail.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Invite"}
            </button>
          </div>
          {message && (
            <p className={"mt-3 text-sm " + (message.includes("sent") ? "text-green-600" : "text-red-600")}>
              {message}
            </p>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            Members ({members.length})
          </h2>
        </div>
        <div className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                {member.hosts?.avatar_url ? (
                  <img src={member.hosts.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {member.hosts?.name?.[0] || "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.hosts?.name}</p>
                  <p className="text-xs text-gray-500">{member.hosts?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={"rounded-full px-3 py-1 text-xs font-medium " + (roleColors[member.role] || "bg-gray-100 text-gray-600")}>
                  {member.role}
                </span>
                <span className="text-xs text-gray-400">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">
              Pending Invitations ({invitations.length})
            </h2>
          </div>
          <div className="divide-y">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-sm">
                    <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                    <p className="text-xs text-gray-500">Invited {new Date(inv.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={"rounded-full px-3 py-1 text-xs font-medium " + (roleColors[inv.role] || "")}>
                    {inv.role}
                  </span>
                  <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                    pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/app/dashboard/team/page.tsx', teamPage);
console.log('Created: src/app/dashboard/team/page.tsx');

// ============================================================
// 7. Update Sidebar to add Team nav item
// ============================================================
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (sidebar.indexOf('Team') === -1 || sidebar.indexOf('/dashboard/team') === -1) {
  // Add Team nav item after Availability and before Apploi Integration
  sidebar = sidebar.replace(
    /(\{\/\*\s*Apploi Integration\s*\*\/\})/,
    `{/* Team */}
        <a
          href="/dashboard/team"
          className={\`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors \${
            pathname === "/dashboard/team"
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }\`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          Team
        </a>

        $1`
  );

  fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
  console.log('Updated: src/components/Sidebar.tsx (added Team nav)');
} else {
  console.log('Skipped: Sidebar already has Team nav');
}

console.log('\n========================================');
console.log('Team invite flow built!');
console.log('========================================');
console.log('\nNext steps:');
console.log('1. git add . && git commit -m "Add team invite flow with email invitations" && git push origin main');
console.log('2. Run team-setup.sql in Supabase SQL Editor');
console.log('3. Test: Go to /dashboard/team, invite an email, check the invite page');
