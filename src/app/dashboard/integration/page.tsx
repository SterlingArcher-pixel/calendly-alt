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
