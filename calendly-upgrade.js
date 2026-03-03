// CalendlyAlt Upgrade Script
// Run from ~/Desktop/calendly-alt/ with: node calendly-upgrade.js
const fs = require('fs');
const path = require('path');

console.log('Starting CalendlyAlt upgrades...\n');

// ============================================================
// 1. CREATE ICS UTILITY
// ============================================================
const icsUtil = `export function generateICS({
  title,
  description,
  startTime,
  endTime,
  location,
  organizerName,
  organizerEmail,
  attendeeName,
  attendeeEmail,
}: {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
}): string {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toISOString().replace(/[-:]/g, "").replace(/\\.\\d{3}/, "");
  };

  const uid = crypto.randomUUID() + "@calendlyalt";
  const now = formatDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CalendlyAlt//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    "UID:" + uid,
    "DTSTAMP:" + now,
    "DTSTART:" + formatDate(startTime),
    "DTEND:" + formatDate(endTime),
    "SUMMARY:" + title,
  ];

  if (description) lines.push("DESCRIPTION:" + description.replace(/\\n/g, "\\\\n"));
  if (location) lines.push("LOCATION:" + location);
  if (organizerName && organizerEmail) {
    lines.push("ORGANIZER;CN=" + organizerName + ":mailto:" + organizerEmail);
  }
  if (attendeeName && attendeeEmail) {
    lines.push(
      "ATTENDEE;CN=" + attendeeName + ";RSVP=TRUE:mailto:" + attendeeEmail
    );
  }
  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");
  return lines.join("\\r\\n");
}

export function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
`;

fs.writeFileSync('src/lib/ics.ts', icsUtil);
console.log('Created: src/lib/ics.ts');

// ============================================================
// 2. ADD ICS DOWNLOAD TO BOOKING CONFIRMATION PAGE
// ============================================================
let bookingPage = fs.readFileSync('src/app/[username]/[slug]/page.tsx', 'utf8');

// Add import at top
if (!bookingPage.includes('generateICS')) {
  bookingPage = bookingPage.replace(
    '"use client";',
    '"use client";\nimport { generateICS, downloadICS } from "@/lib/ics";'
  );
}

// Add ICS download handler function inside the component, after the guestTimezone useEffect
if (!bookingPage.includes('handleDownloadICS')) {
  bookingPage = bookingPage.replace(
    '// Load host + meeting type',
    `const handleDownloadICS = () => {
    if (!meetingType || !host || !selectedDate || !selectedTime) return;
    const startDate = new Date(selectedDate + "T" + selectedTime + ":00");
    const endDate = new Date(startDate.getTime() + meetingType.duration_minutes * 60000);
    const ics = generateICS({
      title: meetingType.title + " with " + host.name,
      description: "Booked via CalendlyAlt" + (meetLink ? "\\nGoogle Meet: " + meetLink : ""),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      location: meetLink || undefined,
      organizerName: host.name,
      organizerEmail: host.email || undefined,
      attendeeName: guestName,
      attendeeEmail: guestEmail,
    });
    downloadICS(ics, meetingType.title.replace(/\\s+/g, "-").toLowerCase() + ".ics");
  };

  // Load host + meeting type`
  );
}

// Add download button after the "Reschedule or Cancel" link on confirmation page
if (!bookingPage.includes('Add to Calendar')) {
  bookingPage = bookingPage.replace(
    `Reschedule or Cancel
              </a>
            )}`,
    `Reschedule or Cancel
              </a>
            )}

            <button
              onClick={handleDownloadICS}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Add to Calendar (.ics)
            </button>`
  );
}

fs.writeFileSync('src/app/[username]/[slug]/page.tsx', bookingPage);
console.log('Updated: src/app/[username]/[slug]/page.tsx (ICS download on confirmation)');

// ============================================================
// 3. ADD ICS DOWNLOAD TO BOOKING MANAGEMENT PAGE
// ============================================================
let managePage = fs.readFileSync('src/app/booking/[id]/page.tsx', 'utf8');

// Add import
if (!managePage.includes('generateICS')) {
  managePage = managePage.replace(
    '"use client";',
    '"use client";\nimport { generateICS, downloadICS } from "@/lib/ics";'
  );
}

// Add download handler after the currentMonth state
if (!managePage.includes('handleDownloadICS')) {
  managePage = managePage.replace(
    'useEffect(() => {\n    fetchBooking();\n  }, [bookingId]);',
    `const handleDownloadICS = () => {
    if (!booking) return;
    const ics = generateICS({
      title: booking.meeting_types.title + " with " + booking.hosts.name,
      description: "Booked via CalendlyAlt" + (booking.google_meet_link ? "\\nGoogle Meet: " + booking.google_meet_link : ""),
      startTime: booking.starts_at,
      endTime: booking.ends_at,
      location: booking.google_meet_link || undefined,
      organizerName: booking.hosts.name,
      organizerEmail: booking.hosts.email,
      attendeeName: booking.guest_name,
      attendeeEmail: booking.guest_email,
    });
    downloadICS(ics, booking.meeting_types.title.replace(/\\s+/g, "-").toLowerCase() + ".ics");
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);`
  );
}

// Add download button after the Meet link on booking manage page
if (!managePage.includes('Add to Calendar')) {
  managePage = managePage.replace(
    '{/* Actions */}\n            {!isCancelled && !isPast && (',
    `{/* Add to Calendar */}
            {!isCancelled && (
              <button
                onClick={handleDownloadICS}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Add to Calendar (.ics)
              </button>
            )}

            {/* Actions */}
            {!isCancelled && !isPast && (`
  );
}

fs.writeFileSync('src/app/booking/[id]/page.tsx', managePage);
console.log('Updated: src/app/booking/[id]/page.tsx (ICS download on manage page)');

// ============================================================
// 4. CREATE EMAIL CONFIRMATION API ROUTE (Resend)
// ============================================================
fs.mkdirSync('src/app/api/send-confirmation', { recursive: true });

const emailRoute = `import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    guest_name,
    guest_email,
    host_name,
    meeting_title,
    meeting_date,
    meeting_time,
    duration_minutes,
    meet_link,
    booking_id,
  } = body;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return NextResponse.json({ sent: false, reason: "No API key" });
  }

  const bookingUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL + "/booking/" + booking_id
    : "https://calendly-alt.vercel.app/booking/" + booking_id;

  const htmlBody = \`
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: #3b82f6; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Interview Confirmed</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px; color: #374151;">Hi <strong>\${guest_name}</strong>,</p>
        <p style="margin: 0 0 20px; color: #6b7280;">Your interview has been scheduled. Here are the details:</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #111827;">\${meeting_title}</p>
          <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">with \${host_name}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
          <p style="margin: 0 0 4px; color: #374151; font-size: 14px;">📅 \${meeting_date}</p>
          <p style="margin: 0 0 4px; color: #374151; font-size: 14px;">🕐 \${meeting_time} (\${duration_minutes} min)</p>
          \${meet_link ? '<p style="margin: 0; font-size: 14px;">📹 <a href="' + meet_link + '" style="color: #3b82f6;">Join Google Meet</a></p>' : ''}
        </div>

        <div style="text-align: center;">
          <a href="\${bookingUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Manage Booking
          </a>
        </div>

        <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
          Need to change plans? Use the link above to reschedule or cancel.
        </p>
      </div>
    </div>
  \`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "CalendlyAlt <onboarding@resend.dev>",
        to: [guest_email],
        subject: "Confirmed: " + meeting_title + " with " + host_name,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return NextResponse.json({ sent: false, error: data });
    }
    return NextResponse.json({ sent: true, id: data.id });
  } catch (err) {
    console.error("Email send failed:", err);
    return NextResponse.json({ sent: false, error: String(err) });
  }
}
`;

fs.writeFileSync('src/app/api/send-confirmation/route.ts', emailRoute);
console.log('Created: src/app/api/send-confirmation/route.ts');

// ============================================================
// 5. ADD EMAIL CALL TO BOOKING API
// ============================================================
let bookApi = fs.readFileSync('src/app/api/book/route.ts', 'utf8');

if (!bookApi.includes('send-confirmation')) {
  bookApi = bookApi.replace(
    'return NextResponse.json({\n    booking,\n    booking_id: booking.id,\n    meet_link: googleMeetLink,\n  });',
    `// Send confirmation email (fire and forget)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://calendly-alt.vercel.app";
  fetch(siteUrl + "/api/send-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guest_name: guest_name,
      guest_email: guest_email,
      host_name: host.name,
      meeting_title: meetingType.title,
      meeting_date: new Date(startsAt).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      }),
      meeting_time: new Date(startsAt).toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit"
      }),
      duration_minutes: meetingType.duration_minutes,
      meet_link: googleMeetLink,
      booking_id: booking.id,
    }),
  }).catch((e) => console.error("Email send failed:", e));

  return NextResponse.json({
    booking,
    booking_id: booking.id,
    meet_link: googleMeetLink,
  });`
  );
  fs.writeFileSync('src/app/api/book/route.ts', bookApi);
  console.log('Updated: src/app/api/book/route.ts (email confirmation trigger)');
} else {
  console.log('Skipped: src/app/api/book/route.ts (already has email trigger)');
}

// ============================================================
// 6. MULTI-RECRUITER SCHEMA SQL (saved as reference)
// ============================================================
const multiTenantSQL = `-- Multi-Recruiter Schema for CalendlyAlt
-- Run this in Supabase SQL Editor

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members (links hosts to orgs with roles)
CREATE TABLE IF NOT EXISTS org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'viewer')),
  invited_by UUID REFERENCES hosts(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, host_id)
);

-- Add org reference to meeting_types (optional, for shared meeting types)
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add org reference to hosts
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS default_organization_id UUID REFERENCES organizations(id);

-- RLS Policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Members can view their own org
CREATE POLICY "Members can view own org"
  ON organizations FOR SELECT
  TO authenticated
  USING (id IN (SELECT organization_id FROM org_members WHERE host_id = auth.uid()));

-- Members can view fellow org members
CREATE POLICY "Members can view org members"
  ON org_members FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM org_members WHERE host_id = auth.uid()));

-- Only admins can insert org members
CREATE POLICY "Admins can add org members"
  ON org_members FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM org_members
      WHERE host_id = auth.uid() AND role = 'admin'
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_host ON org_members(host_id);
CREATE INDEX IF NOT EXISTS idx_meeting_types_org ON meeting_types(organization_id);

SELECT 'Multi-recruiter schema created successfully' AS result;
`;

fs.writeFileSync('multi-recruiter-schema.sql', multiTenantSQL);
console.log('Created: multi-recruiter-schema.sql (run in Supabase SQL Editor)');

// ============================================================
// DONE
// ============================================================
console.log('\n========================================');
console.log('All upgrades applied!');
console.log('========================================');
console.log('\nNext steps:');
console.log('1. git add . && git commit -m "Add ICS download, email confirmations, multi-recruiter schema" && git push origin main');
console.log('2. Run multi-recruiter-schema.sql in Supabase SQL Editor');
console.log('3. (Optional) Sign up at resend.com, get API key, add RESEND_API_KEY to Vercel env vars');
console.log('');
