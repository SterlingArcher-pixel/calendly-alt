export default function IntegrationPage() {
  // Mock data representing Apploi API data
  const mockCandidates = [
    { id: 1, name: "Maria Garcia", email: "maria.g@email.com", phone: "(555) 234-5678", status: "interviewing", job: "CNA - Day Shift", facility: "Sunrise Senior Living", appliedDaysAgo: 2, source: "Indeed" },
    { id: 2, name: "James Wilson", email: "j.wilson@email.com", phone: "(555) 345-6789", status: "screening", job: "RN - Night Shift", facility: "Denver Health Center", appliedDaysAgo: 1, source: "Apploi Direct" },
    { id: 3, name: "Sarah Chen", email: "schen@email.com", phone: "(555) 456-7890", status: "applied", job: "LPN - Evening", facility: "Mountain View Care", appliedDaysAgo: 0, source: "Indeed" },
    { id: 4, name: "Robert Taylor", email: "rtaylor@email.com", phone: "(555) 567-8901", status: "interviewing", job: "Medical Assistant", facility: "Peak Health Clinic", appliedDaysAgo: 3, source: "ZipRecruiter" },
    { id: 5, name: "Ashley Brown", email: "a.brown@email.com", phone: "(555) 678-9012", status: "offer_extended", job: "CNA - Weekend", facility: "Sunrise Senior Living", appliedDaysAgo: 7, source: "Indeed" },
  ];

  const statusColors: Record<string, string> = {
    applied: "bg-gray-100 text-gray-700",
    screening: "bg-yellow-50 text-yellow-700",
    interviewing: "bg-teal-50 text-teal-700",
    offer_extended: "bg-green-50 text-green-700",
    hired: "bg-emerald-50 text-emerald-700",
  };

  const statusLabels: Record<string, string> = {
    applied: "Applied",
    screening: "Screening",
    interviewing: "Interviewing",
    offer_extended: "Offer Extended",
    hired: "Hired",
  };

  const mergeFields = [
    { field: "{{guest_name}}", description: "Candidate full name", example: "Maria Garcia", calendly: true, native: true },
    { field: "{{guest_email}}", description: "Candidate email address", example: "maria.g@email.com", calendly: true, native: true },
    { field: "{{meeting_type}}", description: "Interview type name", example: "RN Initial Phone Screen", calendly: false, native: true },
    { field: "{{date}}", description: "Interview date", example: "March 15, 2026", calendly: false, native: true },
    { field: "{{time}}", description: "Interview time", example: "10:00 AM EST", calendly: false, native: true },
    { field: "{{duration}}", description: "Interview duration", example: "30 minutes", calendly: false, native: true },
    { field: "{{host_name}}", description: "Interviewer full name", example: "Sarah Chen", calendly: false, native: true },
    { field: "{{facility_name}}", description: "Facility / location name", example: "Sunrise Harbor View", calendly: false, native: true },
    { field: "{{facility_address}}", description: "Facility street address", example: "42 Ocean Ave, Portland ME", calendly: false, native: true },
    { field: "{{meet_link}}", description: "Google Meet video link", example: "meet.google.com/abc-defg-hij", calendly: false, native: true },
    { field: "{{scheduling_link}}", description: "Booking page URL for candidate", example: "calendly-alt.vercel.app/charlie/rn-screen", calendly: true, native: true },
    { field: "{{cancel_link}}", description: "One-click cancellation link", example: "calendly-alt.vercel.app/cancel/abc123", calendly: true, native: true },
    { field: "{{reschedule_link}}", description: "One-click reschedule link", example: "calendly-alt.vercel.app/reschedule/abc123", calendly: true, native: true },
  ];

  const calendlyLimitations = [
    { field: "|INTERVIEW_DATE_TIME_DURATION|", issue: "Does not resolve for Calendly-booked interviews. Only Apploi-native interviews populate this field.", native: "{{date}}, {{time}}, {{duration}}" },
    { field: "|INTERVIEWER_FULL_NAME|", issue: "Does not resolve for Calendly-booked interviews. Blank in workflow emails.", native: "{{host_name}}" },
    { field: "|INTERVIEW_LOCATION|", issue: "Does not resolve for Calendly-booked interviews. No facility data synced.", native: "{{facility_name}}, {{facility_address}}" },
    { field: "Reminder Workflows", issue: "Calendly-booked interviews do not trigger Apploi reminder workflows that contain interview merge fields.", native: "Full workflow engine with 24hr + 2hr reminders" },
    { field: "Round Robin URL", issue: "Requires V2 OAuth + paid Calendly account per recruiter. Admin must resync event types manually.", native: "Native round robin (roadmap)" },
    { field: "Scheduling Link", issue: "Only supports job owner's static Calendly link. Cannot route to assigned recruiter's calendar.", native: "Dynamic per-recruiter link via {{scheduling_link}}" },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.486a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Apploi Integration</h1>
            <p className="text-gray-500">How native scheduling connects to the Apploi ATS pipeline.</p>
          </div>
        </div>
      </div>

      {/* Integration flow diagram */}
      <div className="mb-8 rounded-xl border bg-gradient-to-r from-indigo-50 to-blue-50 p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Automated Scheduling Flow</h2>
        <div className="flex items-center justify-between gap-3">
          {[
            { label: "Candidate Applies", icon: "📝", sub: "via Indeed, Apploi Direct" },
            { label: "Auto-Screen", icon: "🔍", sub: "Pre-screen questions filter" },
            { label: "Status → Interviewing", icon: "📊", sub: "Apploi Partner API trigger" },
            { label: "Send Scheduling Link", icon: "📱", sub: "SMS + Email via automation" },
            { label: "Self-Book Interview", icon: "📅", sub: "Apploi Scheduling booking page" },
            { label: "Calendar + Meet Created", icon: "✅", sub: "Google Calendar event" },
          ].map((step, i) => (
            <div key={i} className="flex flex-1 flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                {step.icon}
              </div>
              <p className="mt-2 text-xs font-semibold text-gray-800">{step.label}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">{step.sub}</p>
              {i < 5 && (
                <div className="absolute ml-[calc(100%+8px)] text-gray-300">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== WHY REPLACE CALENDLY: MERGE FIELD GAP ===== */}
      <div className="mb-8 rounded-xl border-2 border-amber-200 bg-amber-50/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Why Replace Calendly: Merge Field Gap</h2>
            <p className="text-sm text-gray-600">Current Calendly integration cannot resolve interview-specific merge fields in Automated Workflows.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-amber-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="py-3 pl-5 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Calendly Merge Field</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Current Limitation</th>
                <th className="py-3 pl-3 pr-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Native Replacement</th>
              </tr>
            </thead>
            <tbody>
              {calendlyLimitations.map((item, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="py-3 pl-5 pr-3">
                    <code className="rounded bg-red-50 px-2 py-0.5 text-xs font-mono text-red-700">{item.field}</code>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-gray-600">{item.issue}</span>
                    </div>
                  </td>
                  <td className="py-3 pl-3 pr-5">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <code className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-mono text-emerald-700">{item.native}</code>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-100/60 px-4 py-2.5">
          <svg className="h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-medium text-amber-800">
            Impact: Customers using Calendly + Automated Workflows must either omit interview details from emails or tell candidates to check Calendly separately. Native scheduling eliminates this gap entirely.
          </p>
        </div>
      </div>

      {/* ===== DYNAMIC BOOKING LINKS ===== */}
      <div className="mb-8 rounded-xl border-2 border-emerald-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.486a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Dynamic Per-Recruiter Booking Links</h2>
              <p className="text-sm text-gray-500">Solves the Calendly single-link limitation — every recruiter gets their own scheduling URL, generated automatically.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>

        {/* How it works — 3-step flow */}
        <div className="mb-5 grid grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Candidate reaches \"Ready to Schedule\"",
              desc: "Apploi sends a webhook when a recruiter moves the candidate to the scheduling stage.",
              icon: (
                <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              ),
            },
            {
              step: "2",
              title: "System looks up assigned recruiter",
              desc: "Finds the recruiter's booking_url_slug and their first active meeting type automatically.",
              icon: (
                <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              ),
            },
            {
              step: "3",
              title: "Generates personalized booking link",
              desc: "Unique URL routes to the correct recruiter's calendar with candidate data pre-filled.",
              icon: (
                <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.486a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.step} className="rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{s.step}</span>
                {s.icon}
              </div>
              <p className="text-sm font-semibold text-gray-800">{s.title}</p>
              <p className="mt-1 text-xs text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Live example */}
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Live Example</span>
          </div>
          <div className="rounded-md bg-gray-900 px-4 py-3">
            <code className="block text-sm text-emerald-400">
              https://calendly-alt.vercel.app/<span className="text-sky-400">charlie-fischer</span>/<span className="text-amber-400">rn-initial-phone-screen</span>?<span className="text-purple-400">applicant_id=APL-1001</span>
            </code>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Pre-fills candidate <span className="font-semibold">Maria Santos</span>, routes to <span className="font-semibold">Charlie Fischer&apos;s</span> calendar — <span className="font-semibold">RN Initial Phone Screen</span> meeting type.
          </p>
        </div>

        {/* API Reference */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">API Reference</span>
            <code className="text-xs font-semibold text-gray-700">GET /api/apploi/booking-link</code>
          </div>
          <div className="mb-3 overflow-hidden rounded-md border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-white">
                  <th className="px-3 py-2 font-semibold text-gray-500">Param</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">Required</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white text-gray-600">
                <tr className="border-b">
                  <td className="px-3 py-2"><code className="text-emerald-700">recruiter_id</code></td>
                  <td className="px-3 py-2"><span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Required</span></td>
                  <td className="px-3 py-2">UUID of the recruiter (host)</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2"><code className="text-emerald-700">applicant_id</code></td>
                  <td className="px-3 py-2"><span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Required</span></td>
                  <td className="px-3 py-2">Apploi applicant ID</td>
                </tr>
                <tr>
                  <td className="px-3 py-2"><code className="text-emerald-700">meeting_type_id</code></td>
                  <td className="px-3 py-2"><span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">Optional</span></td>
                  <td className="px-3 py-2">UUID of specific meeting type (defaults to first active)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-md bg-gray-900 px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Response</p>
            <pre className="text-xs leading-relaxed text-gray-300">{`{
  "url": "https://calendly-alt.vercel.app/charlie-fischer/rn-initial-phone-screen?applicant_id=APL-1001",
  "recruiter_name": "Charlie Fischer",
  "meeting_type": "RN Initial Phone Screen"
}`}</pre>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Auth: <code className="text-gray-500">Authorization: Bearer $CRON_SECRET</code></p>
        </div>
      </div>

      {/* ===== MERGE FIELD REFERENCE ===== */}
      <div className="mb-8 rounded-xl border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Merge Field Reference</h2>
              <p className="text-sm text-gray-500">All available template variables for Automated Workflows and email templates.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            All fields resolve natively
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="py-3 pl-5 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Merge Field</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Example Output</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Calendly</th>
                <th className="py-3 pl-3 pr-5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Native</th>
              </tr>
            </thead>
            <tbody>
              {mergeFields.map((mf, i) => (
                <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-2.5 pl-5 pr-3">
                    <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">{mf.field}</code>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{mf.description}</td>
                  <td className="px-3 py-2.5 text-sm italic text-gray-400">{mf.example}</td>
                  <td className="px-3 py-2.5 text-center">
                    {mf.calendly ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-xs text-yellow-600">~</span>
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs text-red-500">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 pr-5 text-center">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-600">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-red-600">5</p>
            <p className="text-[11px] font-medium text-red-600/70">Broken with Calendly</p>
          </div>
          <div className="rounded-lg border border-yellow-100 bg-yellow-50/50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-yellow-600">3</p>
            <p className="text-[11px] font-medium text-yellow-600/70">Partial (link only)</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-emerald-600">13</p>
            <p className="text-[11px] font-medium text-emerald-600/70">All work natively</p>
          </div>
        </div>
      </div>

      {/* ===== COST COMPARISON ===== */}
      <div className="mb-8 rounded-xl border bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
          <span className="rounded-lg bg-violet-100 p-1.5">
            <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Integration Cost Comparison
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border-2 border-red-200 bg-red-50/30 p-4">
            <h3 className="mb-3 text-sm font-bold text-red-700">Current: Calendly Integration</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-400">•</span>
                Paid Calendly seat per recruiter ($10–16/mo each)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-400">•</span>
                OAuth V2 migration required (V1 keys incompatible)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-400">•</span>
                CSops must enable calendar_job_owner flag per customer
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-400">•</span>
                Interview merge fields blank in workflow emails
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-400">•</span>
                Round robin requires manual admin resync
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-400">•</span>
                Direct Calendly URLs bypass Apploi sync entirely
              </li>
            </ul>
          </div>
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/30 p-4">
            <h3 className="mb-3 text-sm font-bold text-emerald-700">Proposed: Apploi Scheduling (Native)</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">•</span>
                Zero per-seat licensing cost
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">•</span>
                Single OAuth flow (Google Calendar) — no third-party auth
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">•</span>
                No feature flags needed — works out of the box
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">•</span>
                All 13 merge fields resolve in every workflow email
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">•</span>
                Native reminder engine (24hr + 2hr) with full data
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">•</span>
                Every booking auto-syncs — no URL leakage possible
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="mb-8 grid grid-cols-4 gap-5">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Speed-to-View</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">15.7%</p>
          <p className="mt-1 text-xs text-green-600">hire rate at 0-2hrs response</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">After 168+ hrs</p>
          <p className="mt-1 text-2xl font-bold text-red-500">2.6%</p>
          <p className="mt-1 text-xs text-red-500">hire rate drops 83%</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Off-Hours Apps</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">73%</p>
          <p className="mt-1 text-xs text-gray-500">evenings/nights/weekends</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">No-Show Reduction</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">-40%</p>
          <p className="mt-1 text-xs text-gray-500">with SMS reminders (24hr + 2hr)</p>
        </div>
      </div>

      {/* Mock candidate pipeline */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Candidate Pipeline (Apploi API Preview)</h2>
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            Mock Data — connects to Apploi Partner API in production
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="py-3 pl-6 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Candidate</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Position</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Facility</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Source</th>
                <th className="py-3 pl-3 pr-6 text-xs font-semibold uppercase tracking-wide text-gray-500">Scheduling</th>
              </tr>
            </thead>
            <tbody>
              {mockCandidates.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-3.5 pl-6 pr-3">
                    <div>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-sm text-gray-700">{c.job}</td>
                  <td className="px-3 py-3.5 text-sm text-gray-600">{c.facility}</td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.status]}`}>
                      {statusLabels[c.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-gray-500">{c.source}</td>
                  <td className="py-3.5 pl-3 pr-6">
                    {c.status === "interviewing" ? (
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                          Link sent
                        </span>
                        <span className="text-[10px] text-gray-400">{c.appliedDaysAgo}d ago</span>
                      </div>
                    ) : c.status === "screening" ? (
                      <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                        Send Link
                      </button>
                    ) : c.status === "offer_extended" ? (
                      <span className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        Interview completed
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Pending review</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration capabilities */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <span className="rounded-lg bg-teal-100 p-1.5">
              <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </span>
            Automated Triggers
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Status change to &quot;Interviewing&quot; auto-sends scheduling link via SMS
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              24hr + 2hr interview reminders reduce no-shows by 40%
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              3-touch SMS cadence for &quot;unable to contact&quot; candidates
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Off-hours applications (73%) get instant engagement via workflows
            </li>
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <span className="rounded-lg bg-purple-100 p-1.5">
              <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </span>
            ATS Write-Back
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Booking confirms → updates Apploi candidate record with interview details
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Cancellation / reschedule → status + notes synced back to ATS
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              No-show detection → auto-trigger re-engagement workflow
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Google Meet link stored in application record for recruiter access
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
