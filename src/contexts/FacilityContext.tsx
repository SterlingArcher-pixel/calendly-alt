"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface Facility {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  is_active: boolean;
}

interface FacilityContextType {
  facilities: Facility[];
  activeFacilityId: string | null;  // null = "All Facilities"
  activeFacility: Facility | null;
  setActiveFacilityId: (id: string | null) => void;
  loading: boolean;
}

const FacilityContext = createContext<FacilityContextType>({
  facilities: [],
  activeFacilityId: null,
  activeFacility: null,
  setActiveFacilityId: () => {},
  loading: true,
});

export function FacilityProvider({ children }: { children: ReactNode }) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeFacilityId, setActiveFacilityIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("activeFacilityId");
    if (stored && stored !== "null") {
      setActiveFacilityIdState(stored);
    }
  }, []);

  // Fetch facilities
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get facilities where user is a member or org owner
      const { data: memberFacilities } = await supabase
        .from("facility_members")
        .select("facility_id, facilities(id, name, slug, city, state, is_active)")
        .eq("host_id", user.id);

      const { data: ownedFacilities } = await supabase
        .from("facilities")
        .select("id, name, slug, city, state, is_active")
        .eq("org_id", user.id);

      // Merge and deduplicate
      const facilityMap = new Map<string, Facility>();

      if (ownedFacilities) {
        for (const f of ownedFacilities) {
          facilityMap.set(f.id, f);
        }
      }

      if (memberFacilities) {
        for (const m of memberFacilities) {
          const f = m.facilities as any;
          if (f?.id) facilityMap.set(f.id, f);
        }
      }

      const allFacilities = Array.from(facilityMap.values()).filter(f => f.is_active);
      setFacilities(allFacilities);

      // Validate stored selection still exists
      const stored = localStorage.getItem("activeFacilityId");
      if (stored && stored !== "null" && !allFacilities.find(f => f.id === stored)) {
        setActiveFacilityIdState(null);
        localStorage.removeItem("activeFacilityId");
      }

      setLoading(false);
    }
    load();
  }, []);

  function setActiveFacilityId(id: string | null) {
    setActiveFacilityIdState(id);
    if (id) {
      localStorage.setItem("activeFacilityId", id);
    } else {
      localStorage.removeItem("activeFacilityId");
    }
  }

  const activeFacility = activeFacilityId
    ? facilities.find(f => f.id === activeFacilityId) || null
    : null;

  return (
    <FacilityContext.Provider value={{ facilities, activeFacilityId, activeFacility, setActiveFacilityId, loading }}>
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  return useContext(FacilityContext);
}
