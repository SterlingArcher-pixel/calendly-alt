"use client";

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

      const res = await fetch(`/api/team/members?host_id=${user.id}`);
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
