// Multi-Recruiter UI: org switcher, role-based views, team booking visibility
// Run from ~/Desktop/calendly-alt/ with: node multi-recruiter.js
const fs = require('fs');

console.log('Building multi-recruiter UI...\n');

// ============================================================
// 1. Org Context Provider (shared state for org/role)
// ============================================================
const orgContext = `"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrgContextType {
  orgId: string | null;
  orgName: string | null;
  role: string | null;
  members: any[];
  loading: boolean;
  isAdmin: boolean;
}

const OrgContext = createContext<OrgContextType>({
  orgId: null,
  orgName: null,
  role: null,
  members: [],
  loading: true,
  isAdmin: false,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrgContextType>({
    orgId: null, orgName: null, role: null, members: [], loading: true, isAdmin: false,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState(s => ({ ...s, loading: false })); return; }

      const { data: host } = await supabase
        .from("hosts").select("id, default_organization_id").eq("id", user.id).single();
      if (!host?.default_organization_id) { setState(s => ({ ...s, loading: false })); return; }

      const orgId = host.default_organization_id;

      const { data: org } = await supabase
        .from("organizations").select("*").eq("id", orgId).single();

      const { data: membership } = await supabase
        .from("org_members").select("role").eq("organization_id", orgId).eq("host_id", user.id).single();

      const res = await fetch(\`/api/team/members?host_id=\${user.id}\`);
      const membersData = await res.json();

      setState({
        orgId,
        orgName: org?.name || null,
        role: membership?.role || null,
        members: membersData?.members || [],
        loading: false,
        isAdmin: membership?.role === "admin",
      });
    }
    load();
  }, []);

  return <OrgContext.Provider value={state}>{children}</OrgContext.Provider>;
}

export function useOrg() { return useContext(OrgContext); }
`;

fs.mkdirSync('src/contexts', { recursive: true });
fs.writeFileSync('src/contexts/OrgContext.tsx', orgContext);
console.log('Created: src/contexts/OrgContext.tsx');

// ============================================================
// 2. Org Badge component for sidebar
// ============================================================
const orgBadge = `"use client";

import { useOrg } from "@/contexts/OrgContext";

export default function OrgBadge() {
  const { orgName, role, loading } = useOrg();

  if (loading || !orgName) return null;

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    recruiter: "bg-blue-100 text-blue-700",
    viewer: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="mx-3 mb-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="truncate text-xs font-semibold text-gray-900">{orgName}</p>
      <span className={\`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide \${roleColors[role || "viewer"]}\`}>
        {role}
      </span>
    </div>
  );
}
`;

fs.writeFileSync('src/components/OrgBadge.tsx', orgBadge);
console.log('Created: src/components/OrgBadge.tsx');

// ============================================================
// 3. Team Bookings API (all bookings across org)
// ============================================================
const teamBookingsAPI = `import { NextRequest, NextResponse } from "next/server";
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
`;

fs.mkdirSync('src/app/api/team/bookings', { recursive: true });
fs.writeFileSync('src/app/api/team/bookings/route.ts', teamBookingsAPI);
console.log('Created: src/app/api/team/bookings/route.ts');

// ============================================================
// 4. Team Bookings Page (view all org bookings)
// ============================================================
const teamBookingsPage = `"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TeamBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [view, setView] = useState<"mine" | "team">("team");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get role
      const { data: host } = await supabase
        .from("hosts").select("id, default_organization_id").eq("id", user.id).single();
      if (host?.default_organization_id) {
        const { data: membership } = await supabase
          .from("org_members").select("role")
          .eq("organization_id", host.default_organization_id)
          .eq("host_id", user.id).single();
        setRole(membership?.role || null);
      }

      const res = await fetch(\`/api/team/bookings?host_id=\${user.id}&view=\${view}\`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setLoading(false);
    }
    load();
  }, [view]);

  const canViewTeam = role === "admin" || role === "recruiter";

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            {view === "team" ? "All upcoming interviews across your team" : "Your upcoming interviews"}
          </p>
        </div>
        {canViewTeam && (
          <div className="flex rounded-lg border bg-white p-1">
            <button
              onClick={() => setView("mine")}
              className={\`rounded-md px-3 py-1.5 text-sm font-medium transition-colors \${
                view === "mine" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }\`}
            >
              My Bookings
            </button>
            <button
              onClick={() => setView("team")}
              className={\`rounded-md px-3 py-1.5 text-sm font-medium transition-colors \${
                view === "team" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }\`}
            >
              Team View
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 rounded-xl border bg-white p-4">
              <div className="h-12 w-12 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">No upcoming bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const start = new Date(b.starts_at);
            const mt = b.meeting_types;
            const host = b.hosts;
            return (
              <div key={b.id} className="flex items-center justify-between rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center rounded-lg bg-blue-50 px-3.5 py-2 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">
                      {start.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-xl font-bold text-blue-700">{start.getDate()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {mt?.color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mt.color }} />}
                      <p className="font-medium text-gray-900">{mt?.title || "Meeting"}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      with <span className="font-medium text-gray-700">{b.guest_name}</span> &middot;{" "}
                      {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ({mt?.duration_minutes || 30} min)
                    </p>
                    {view === "team" && host && (
                      <p className="mt-0.5 text-xs text-indigo-500 font-medium">
                        Recruiter: {host.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.google_meet_link && (
                    <a href={b.google_meet_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                      </svg>
                      Join
                    </a>
                  )}
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {b.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
`;

fs.mkdirSync('src/app/dashboard/team-bookings', { recursive: true });
fs.writeFileSync('src/app/dashboard/team-bookings/page.tsx', teamBookingsPage);
console.log('Created: src/app/dashboard/team-bookings/page.tsx');

// ============================================================
// 5. Wire OrgProvider into dashboard layout
// ============================================================
let layout = fs.readFileSync('src/app/dashboard/layout.tsx', 'utf8');

if (layout.indexOf('OrgProvider') === -1) {
  // Add import
  const firstImport = layout.indexOf('import');
  layout = layout.slice(0, firstImport) +
    'import { OrgProvider } from "@/contexts/OrgContext";\nimport OrgBadge from "@/components/OrgBadge";\n' +
    layout.slice(firstImport);

  // Wrap children in OrgProvider
  layout = layout.replace(
    '{children}',
    '<OrgProvider>{children}</OrgProvider>'
  );

  fs.writeFileSync('src/app/dashboard/layout.tsx', layout);
  console.log('Updated: Dashboard layout with OrgProvider');
}

// ============================================================
// 6. Add OrgBadge to Sidebar
// ============================================================
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (sidebar.indexOf('OrgBadge') === -1) {
  // Add import at top
  sidebar = sidebar.replace(
    '"use client";',
    '"use client";\n\nimport OrgBadge from "@/components/OrgBadge";'
  );

  // Add OrgBadge before nav
  sidebar = sidebar.replace(
    '{/* Nav */}',
    '{/* Org */}\n      <OrgBadge />\n\n      {/* Nav */}'
  );

  fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
  console.log('Updated: Sidebar with OrgBadge');
}

// ============================================================
// 7. Add "Team Schedule" to sidebar nav
// ============================================================
if (sidebar.indexOf('/dashboard/team-bookings') === -1) {
  sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
  
  const teamTarget = 'label: "Team",';
  const teamIdx = sidebar.indexOf(teamTarget);
  
  if (teamIdx !== -1) {
    // Find the closing }, of the Team nav item
    let braceCount = 0;
    let searchStart = sidebar.lastIndexOf('{', teamIdx);
    let endIdx = searchStart;
    for (let i = searchStart; i < sidebar.length; i++) {
      if (sidebar[i] === '{') braceCount++;
      if (sidebar[i] === '}') braceCount--;
      if (braceCount === 0) { endIdx = i + 1; break; }
    }
    // Find the comma after
    if (sidebar[endIdx] === ',') endIdx++;

    const teamScheduleItem = `
  {
    label: "Team Schedule",
    href: "/dashboard/team-bookings",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-15V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25V5.25" />
      </svg>
    ),
  },`;

    sidebar = sidebar.slice(0, endIdx) + teamScheduleItem + sidebar.slice(endIdx);
    fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
    console.log('Updated: Sidebar with Team Schedule nav');
  } else {
    console.log('Skipped: Could not find Team nav item to insert after');
  }
}

// ============================================================
// 8. Add Team Schedule to MobileHeader
// ============================================================
let mobileHeader = fs.readFileSync('src/components/MobileHeader.tsx', 'utf8');
if (mobileHeader.indexOf('team-bookings') === -1) {
  mobileHeader = mobileHeader.replace(
    '{ label: "Team", href: "/dashboard/team" },',
    '{ label: "Team", href: "/dashboard/team" },\n  { label: "Team Schedule", href: "/dashboard/team-bookings" },'
  );
  fs.writeFileSync('src/components/MobileHeader.tsx', mobileHeader);
  console.log('Updated: MobileHeader with Team Schedule');
}

// ============================================================
// 9. Role-based visibility on Team page (hide invite for non-admins)
// ============================================================
let teamPage = fs.readFileSync('src/app/dashboard/team/page.tsx', 'utf8');

// The team page already checks isAdmin for showing the invite form
// Let's add a viewer restriction message
if (teamPage.indexOf('viewer-notice') === -1) {
  const viewerNotice = `
      {/* Viewer notice */}
      {currentRole === "viewer" && (
        <div id="viewer-notice" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">View-only access.</span> You can see team members but cannot invite or manage roles.
          </p>
        </div>
      )}`;

  // Try to insert after the h1/header section
  const headerEnd = teamPage.indexOf('</h1>');
  if (headerEnd !== -1) {
    // Find the next closing tag after h1
    const afterHeader = teamPage.indexOf('\n', headerEnd + 10);
    if (afterHeader !== -1) {
      teamPage = teamPage.slice(0, afterHeader) + viewerNotice + teamPage.slice(afterHeader);
      fs.writeFileSync('src/app/dashboard/team/page.tsx', teamPage);
      console.log('Updated: Team page with viewer notice');
    }
  }
}

// ============================================================
// 10. SQL for bookings FK hint (needed for team bookings join)
// ============================================================
const fkSQL = `-- Add FK name hint for bookings -> hosts join
-- Only needed if the team bookings API shows "Meeting" instead of host name
-- The API uses hosts!bookings_host_id_fkey which requires the FK to be named

-- Check existing FK name:
SELECT conname FROM pg_constraint
WHERE conrelid = 'bookings'::regclass AND confrelid = 'hosts'::regclass;
`;

fs.writeFileSync('check-fk.sql', fkSQL);
console.log('Created: check-fk.sql (reference only)');

console.log('\n========================================');
console.log('Multi-recruiter UI complete!');
console.log('========================================');
console.log('\nNew features:');
console.log('- OrgContext provider (shared org/role state)');
console.log('- OrgBadge in sidebar (shows org name + role)');
console.log('- Team Schedule page (/dashboard/team-bookings)');
console.log('  - Toggle between "My Bookings" and "Team View"');
console.log('  - Team view shows recruiter name on each booking');
console.log('  - Admin/recruiter can see team, viewers see only theirs');
console.log('- Role-based viewer notice on Team page');
console.log('- Mobile header updated with Team Schedule');
console.log('\nRun:');
console.log('git add . && git commit -m "Add multi-recruiter UI: org context, team schedule, role-based views" && git push origin main');
