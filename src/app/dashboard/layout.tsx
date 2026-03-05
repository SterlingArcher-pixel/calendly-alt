import { OrgProvider } from "@/contexts/OrgContext";
import { FacilityProvider } from "@/contexts/FacilityContext";
import MobileHeader from "@/components/MobileHeader";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F6F3" }}>
      <FacilityProvider>
        <Sidebar host={host} />

        {/* Main content */}
        <div className="lg:ml-64">
          {/* Top bar */}
          <header
            className="sticky top-0 z-10 flex h-14 items-center justify-end border-b border-gray-200/60 px-6 backdrop-blur"
            style={{ backgroundColor: "rgba(248, 246, 243, 0.85)" }}
          >
            <SignOutButton />
          </header>

          <MobileHeader />

          <main className="p-6">
            <OrgProvider>{children}</OrgProvider>
          </main>
        </div>
      </FacilityProvider>
    </div>
  );
}
