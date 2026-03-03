"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Bookings", href: "/dashboard/bookings" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Meeting Types", href: "/dashboard/meeting-types" },
  { label: "Availability", href: "/dashboard/availability" },
  { label: "Team", href: "/dashboard/team" },
  { label: "Team Schedule", href: "/dashboard/team-bookings" },
  { label: "Settings", href: "/dashboard/settings" },
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
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-600"
                }`}
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
