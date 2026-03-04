"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/dashboard/bookings", label: "Bookings", icon: "calendar" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
  { href: "/dashboard/meeting-types", label: "Meeting Types", icon: "user" },
  { href: "/dashboard/availability", label: "Availability", icon: "clock" },
  { href: "/dashboard/team", label: "Team", icon: "users" },
  { href: "/dashboard/team-bookings", label: "Team Schedule", icon: "clipboard" },
  { href: "/dashboard/integration", label: "Apploi Integration", icon: "integration" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export default function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: "linear-gradient(90deg, #0B2522 0%, #003D37 100%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: "#00D08A" }}>
            <span className="text-xs font-bold" style={{ color: "#0B2522" }}>A</span>
          </div>
          <span className="text-sm font-semibold text-white">Apploi Scheduling</span>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white/70 hover:text-white hover:bg-white/10">
          {open ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown nav */}
      {open && (
        <div className="border-b shadow-lg" style={{ backgroundColor: "#0B2522" }}>
          <nav className="px-3 py-2 space-y-0.5">
            {NAV.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "text-white"
                      : "text-white/55 hover:text-white/80 hover:bg-white/5"
                  }`}
                  style={isActive ? { backgroundColor: "rgba(0, 208, 138, 0.15)" } : {}}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
