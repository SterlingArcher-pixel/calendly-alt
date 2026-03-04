"use client";
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: host } = await supabase
        .from("hosts")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!host) {
        setLoading(false);
        return;
      }
      setHostId(host.id);

      const res = await fetch("/api/team/members?host_id=" + host.id);
      const data = await res.json();

      setMembers(data.members || []);
      setInvitations(data.invitations || []);
      setOrgName(data.org?.name || "");

      // Find current user's role
      const me = (data.members || []).find(
        (m: Member) => m.host_id === host.id
      );
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

  if (!orgName && !loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No Organization Set Up
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Contact your admin to get added to an organization.
          </p>
        </div>
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

      {/* Viewer notice */}
      {userRole === "viewer" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">View-only access.</span> You can see
            team members but cannot invite or manage roles.
          </p>
        </div>
      )}

      {/* Invite Form (admin only) */}
      {userRole === "admin" && (
        <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Invite a Recruiter
          </h2>
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
            <p
              className={
                "mt-3 text-sm " +
                (message.includes("sent") ? "text-green-600" : "text-red-600")
              }
            >
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
            <div
              key={member.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-3">
                {member.hosts?.avatar_url ? (
                  <img
                    src={member.hosts.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {member.hosts?.name?.[0] || "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.hosts?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {member.hosts?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-medium " +
                    (roleColors[member.role] || "bg-gray-100 text-gray-600")
                  }
                >
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
              <div
                key={inv.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-sm">
                    <svg
                      className="h-5 w-5 text-yellow-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {inv.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Invited {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "rounded-full px-3 py-1 text-xs font-medium " +
                      (roleColors[inv.role] || "")
                    }
                  >
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
