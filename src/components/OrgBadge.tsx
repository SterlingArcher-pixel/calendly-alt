"use client";

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
      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleColors[role || "viewer"]}`}>
        {role}
      </span>
    </div>
  );
}
