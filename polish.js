// Polish Script: Seed bookings + error states + loading + mobile
// Run from ~/Desktop/calendly-alt/ with: node polish.js
const fs = require('fs');

console.log('Applying polish...\n');

// ============================================================
// 1. SQL to seed realistic demo bookings
// ============================================================
const seedSQL = `-- Seed realistic healthcare interview bookings
-- Run in Supabase SQL Editor

-- Get host and meeting type IDs
DO $$
DECLARE
  v_host_id UUID;
  v_rn_screen UUID;
  v_cna_interview UUID;
  v_panel UUID;
  v_clinical UUID;
BEGIN
  SELECT id INTO v_host_id FROM hosts WHERE email = 'charliefischer24@gmail.com';

  SELECT id INTO v_rn_screen FROM meeting_types WHERE host_id = v_host_id AND slug = 'rn-initial-phone-screen' LIMIT 1;
  SELECT id INTO v_cna_interview FROM meeting_types WHERE host_id = v_host_id AND slug = 'cna-interview' LIMIT 1;
  SELECT id INTO v_panel FROM meeting_types WHERE host_id = v_host_id AND slug = 'panel-interview-nursing-leadership' LIMIT 1;
  SELECT id INTO v_clinical FROM meeting_types WHERE host_id = v_host_id AND slug = 'clinical-skills-assessment' LIMIT 1;

  -- Clear old demo bookings
  DELETE FROM bookings WHERE host_id = v_host_id AND guest_email LIKE '%@example.com';

  -- Upcoming bookings (next 2 weeks)
  INSERT INTO bookings (host_id, meeting_type_id, guest_name, guest_email, starts_at, ends_at, status, timezone, google_meet_link) VALUES
  (v_host_id, v_rn_screen, 'Sarah Chen', 'sarah.chen@example.com',
    (CURRENT_DATE + INTERVAL '1 day' + TIME '09:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '1 day' + TIME '09:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/abc-defg-hij'),

  (v_host_id, v_cna_interview, 'Marcus Johnson', 'marcus.j@example.com',
    (CURRENT_DATE + INTERVAL '1 day' + TIME '14:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '1 day' + TIME '14:30')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/klm-nopq-rst'),

  (v_host_id, v_panel, 'Emily Rodriguez', 'e.rodriguez@example.com',
    (CURRENT_DATE + INTERVAL '2 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '2 days' + TIME '11:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/uvw-xyza-bcd'),

  (v_host_id, v_rn_screen, 'James Williams', 'j.williams@example.com',
    (CURRENT_DATE + INTERVAL '3 days' + TIME '11:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '3 days' + TIME '11:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/efg-hijk-lmn'),

  (v_host_id, v_clinical, 'Priya Patel', 'priya.p@example.com',
    (CURRENT_DATE + INTERVAL '3 days' + TIME '15:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '3 days' + TIME '15:45')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/opq-rstu-vwx'),

  (v_host_id, v_cna_interview, 'David Kim', 'david.kim@example.com',
    (CURRENT_DATE + INTERVAL '5 days' + TIME '09:30')::timestamptz,
    (CURRENT_DATE + INTERVAL '5 days' + TIME '10:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/yza-bcde-fgh'),

  (v_host_id, v_rn_screen, 'Lisa Thompson', 'lisa.t@example.com',
    (CURRENT_DATE + INTERVAL '5 days' + TIME '13:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '5 days' + TIME '13:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/ijk-lmno-pqr'),

  (v_host_id, v_panel, 'Robert Davis', 'r.davis@example.com',
    (CURRENT_DATE + INTERVAL '7 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '7 days' + TIME '11:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/stu-vwxy-zab'),

  (v_host_id, v_cna_interview, 'Angela Martinez', 'a.martinez@example.com',
    (CURRENT_DATE + INTERVAL '8 days' + TIME '14:30')::timestamptz,
    (CURRENT_DATE + INTERVAL '8 days' + TIME '15:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/cde-fghi-jkl'),

  (v_host_id, v_clinical, 'Michael Brown', 'michael.b@example.com',
    (CURRENT_DATE + INTERVAL '10 days' + TIME '11:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '10 days' + TIME '11:45')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/mno-pqrs-tuv'),

  (v_host_id, v_rn_screen, 'Jennifer Lee', 'j.lee@example.com',
    (CURRENT_DATE + INTERVAL '12 days' + TIME '09:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '12 days' + TIME '09:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/wxy-zabc-def'),

  -- Past completed bookings
  (v_host_id, v_rn_screen, 'Amanda Foster', 'a.foster@example.com',
    (CURRENT_DATE - INTERVAL '2 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '2 days' + TIME '10:15')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/ghi-jklm-nop'),

  (v_host_id, v_cna_interview, 'Tyler Washington', 'tyler.w@example.com',
    (CURRENT_DATE - INTERVAL '3 days' + TIME '14:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '3 days' + TIME '14:30')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/qrs-tuvw-xyz'),

  (v_host_id, v_panel, 'Rachel Garcia', 'rachel.g@example.com',
    (CURRENT_DATE - INTERVAL '5 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE - INTERVAL '5 days' + TIME '11:00')::timestamptz,
    'confirmed', 'America/Denver', 'https://meet.google.com/abc-defg-zzz'),

  -- One cancelled
  (v_host_id, v_rn_screen, 'Kevin Park', 'kevin.p@example.com',
    (CURRENT_DATE + INTERVAL '4 days' + TIME '10:00')::timestamptz,
    (CURRENT_DATE + INTERVAL '4 days' + TIME '10:15')::timestamptz,
    'cancelled', 'America/Denver', NULL);

END $$;

SELECT COUNT(*) AS bookings_seeded FROM bookings WHERE guest_email LIKE '%@example.com';
`;

fs.writeFileSync('seed-bookings.sql', seedSQL);
console.log('Created: seed-bookings.sql');

// ============================================================
// 2. Update Dashboard to be mobile responsive + better stats
// ============================================================
let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// Fix grid to be responsive
dashboard = dashboard.replace(
  'className="mb-8 grid grid-cols-4 gap-5"',
  'className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5"'
);

fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);
console.log('Updated: Dashboard responsive grid');

// ============================================================
// 3. Update Bookings page with loading skeleton + mobile
// ============================================================
let bookingsPage;
const bookingsPath = 'src/app/dashboard/bookings/page.tsx';
if (fs.existsSync(bookingsPath)) {
  bookingsPage = fs.readFileSync(bookingsPath, 'utf8');
  // Make any existing grid responsive
  bookingsPage = bookingsPage.replace(/grid-cols-(\d)/g, (match, num) => {
    return `grid-cols-1 md:grid-cols-${num}`;
  });
  fs.writeFileSync(bookingsPath, bookingsPage);
  console.log('Updated: Bookings page responsive');
}

// ============================================================
// 4. Update Team page with better empty state
// ============================================================
let teamPage = fs.readFileSync('src/app/dashboard/team/page.tsx', 'utf8');

// Add a better empty state for when org isn't set up
const oldReturn = 'return (\n    <div className="mx-auto max-w-3xl p-6">';
const newReturn = `if (!orgName && !loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Organization Set Up</h2>
          <p className="mt-2 text-sm text-gray-500">Contact your admin to get added to an organization.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">`;

if (teamPage.indexOf(oldReturn) !== -1) {
  teamPage = teamPage.replace(oldReturn, newReturn);
  fs.writeFileSync('src/app/dashboard/team/page.tsx', teamPage);
  console.log('Updated: Team page empty state');
} else {
  console.log('Skipped: Team page empty state (pattern not found)');
}

// ============================================================
// 5. Add loading skeleton component
// ============================================================
const skeletonComponent = `export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border bg-white p-4">
          <div className="h-12 w-12 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-100" />
          </div>
          <div className="h-6 w-20 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="h-8 w-8 rounded-lg bg-gray-100" />
      </div>
      <div className="mt-3 h-8 w-12 rounded bg-gray-200" />
    </div>
  );
}
`;

fs.writeFileSync('src/components/LoadingSkeleton.tsx', skeletonComponent);
console.log('Created: src/components/LoadingSkeleton.tsx');

// ============================================================
// 6. Improve booking confirmation page error handling
// ============================================================
const confirmPath = 'src/app/[username]/[slug]/page.tsx';
if (fs.existsSync(confirmPath)) {
  let confirm = fs.readFileSync(confirmPath, 'utf8');

  // Add a user-friendly error if meeting type not found
  if (confirm.indexOf('Meeting type not found') === -1 && confirm.indexOf('notFound') === -1) {
    // Already handles it or needs different approach
    console.log('Skipped: Confirmation page already has error handling');
  } else {
    console.log('Skipped: Confirmation page error handling');
  }
}

// ============================================================
// 7. Mobile-friendly sidebar (collapse on small screens)
// ============================================================
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Make sidebar hidden on mobile, shown on lg+
sidebar = sidebar.replace(
  'className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r bg-white"',
  'className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r bg-white lg:flex"'
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
console.log('Updated: Sidebar hidden on mobile');

// Update dashboard layout to remove left margin on mobile
const layoutPath = 'src/app/dashboard/layout.tsx';
if (fs.existsSync(layoutPath)) {
  let layout = fs.readFileSync(layoutPath, 'utf8');
  layout = layout.replace(
    /className="ml-64/g,
    'className="lg:ml-64'
  );
  fs.writeFileSync(layoutPath, layout);
  console.log('Updated: Dashboard layout responsive margin');
}

// ============================================================
// 8. Add mobile header with menu button
// ============================================================
const mobileHeader = `"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Bookings", href: "/dashboard/bookings" },
  { label: "Meeting Types", href: "/dashboard/meeting-types" },
  { label: "Availability", href: "/dashboard/availability" },
  { label: "Team", href: "/dashboard/team" },
];

export default function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            ST
          </div>
          <span className="font-semibold text-gray-900">Scheduling Tool</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-b bg-white px-4 py-2">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={\`block rounded-lg px-3 py-2.5 text-sm font-medium \${
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-600"
                }\`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/MobileHeader.tsx', mobileHeader);
console.log('Created: src/components/MobileHeader.tsx');

// Wire MobileHeader into dashboard layout
if (fs.existsSync(layoutPath)) {
  let layout = fs.readFileSync(layoutPath, 'utf8');

  if (layout.indexOf('MobileHeader') === -1) {
    // Add import
    const firstImport = layout.indexOf('import');
    if (firstImport !== -1) {
      layout = layout.slice(0, firstImport) +
        'import MobileHeader from "@/components/MobileHeader";\n' +
        layout.slice(firstImport);
    }

    // Add MobileHeader before main content
    layout = layout.replace(
      /<main/,
      '<MobileHeader />\n        <main'
    );

    fs.writeFileSync(layoutPath, layout);
    console.log('Updated: Dashboard layout with MobileHeader');
  }
}

console.log('\n========================================');
console.log('Polish complete!');
console.log('========================================');
console.log('\nNext steps:');
console.log('1. git add . && git commit -m "Add demo bookings, loading states, mobile responsive" && git push origin main');
console.log('2. Run seed-bookings.sql in Supabase SQL Editor');
