"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OrgBadge from "./OrgBadge";
export default function Sidebar({ host }: { host: any }) {
  const pathname = usePathname();
  const navItems = [
    { label: "Overview", href: "/dashboard" },
    { label: "Bookings", href: "/dashboard/bookings" },
    { label: "Analytics", href: "/dashboard/analytics" },
    { label: "Meeting Types", href: "/dashboard/meeting-types" },
    { label: "Availability", href: "/dashboard/availability" },
    { label: "Team", href: "/dashboard/team" },
    { label: "Team Schedule", href: "/dashboard/team-bookings" },
    { label: "Apploi Integration", href: "/dashboard/integration" },
    { label: "Settings", href: "/dashboard/settings" },
  ];
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white lg:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">CA</div>
          <span className="text-base font-semibold text-gray-900">Scheduling Tool</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <OrgBadge />
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{host?.name?.[0] || "?"}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{host?.name || "User"}</p>
              <p className="truncate text-xs text-gray-500">{host?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
