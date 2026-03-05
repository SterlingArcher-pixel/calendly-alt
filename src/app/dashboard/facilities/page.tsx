"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFacility } from "@/contexts/FacilityContext";

interface Facility { id: string; name: string; address: string | null; city: string | null; state: string | null; slug: string; timezone: string; is_active: boolean; }
interface FacilityMember { id: string; host_id: string; role: string; hosts?: { name: string; email: string } | null; }
interface Host { id: string; name: string; email: string; }

const TIMEZONES = ["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Phoenix","America/Anchorage","Pacific/Honolulu"];
const EMPTY_FORM = { name: "", address: "", city: "", state: "", slug: "", timezone: "America/Denver" };

export default function FacilitiesPage() {
  const { facilities: ctxFacilities } = useFacility();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [members, setMembers] = useState<FacilityMember[]>([]);
  const [allHosts, setAllHosts] = useState<Host[]>([]);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("recruiter");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const { data: facs } = await supabase.from("facilities").select("*").order("name");
    setFacilities(facs || []);
    setLoading(false);
  }

  async function loadMembers(facilityId: string) {
    const supabase = createClient();
    const { data: mems } = await supabase.from("facility_members").select("id, host_id, role, hosts(name, email)").eq("facility_id", facilityId);
    setMembers((mems || []) as any);
    const { data: hosts } = await supabase.from("hosts").select("id, name, email").order("name");
    setAllHosts(hosts || []);
  }

  function autoSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  async function saveForm() {
    if (!userId || !form.name) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { name: form.name, address: form.address || null, city: form.city || null, state: form.state || null, slug: form.slug || autoSlug(form.name), timezone: form.timezone };
    if (editingId) {
      await supabase.from("facilities").update(payload).eq("id", editingId);
    } else {
      const { data: newFac } = await supabase.from("facilities").insert({ ...payload, org_id: userId, is_active: true }).select().single();
      if (newFac) await supabase.from("facility_members").insert({ facility_id: newFac.id, host_id: userId, role: "admin" });
    }
    setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setSaving(false);
    loadData();
  }

  async function toggleFacility(fac: Facility) {
    const supabase = createClient();
    await supabase.from("facilities").update({ is_active: !fac.is_active }).eq("id", fac.id);
    loadData();
  }

  async function deleteFacility(id: string) {
    const supabase = createClient();
    await supabase.from("facilities").delete().eq("id", id);
    setDeleteConfirm(null);
    if (expandedFacility === id) setExpandedFacility(null);
    loadData();
  }

  function toggleMembers(facilityId: string) {
    if (expandedFacility === facilityId) { setExpandedFacility(null); return; }
    setExpandedFacility(facilityId);
    loadMembers(facilityId);
  }

  async function addMember(facilityId: string) {
    if (!addMemberEmail) return;
    const host = allHosts.find(h => h.email.toLowerCase() === addMemberEmail.toLowerCase());
    if (!host) { alert("No user found with that email"); return; }
    const supabase = createClient();
    await supabase.from("facility_members").upsert({ facility_id: facilityId, host_id: host.id, role: addMemberRole }, { onConflict: "facility_id,host_id" });
    setAddMemberEmail(""); setAddMemberRole("recruiter");
    loadMembers(facilityId);
  }

  async function removeMember(memberId: string) {
    const supabase = createClient();
    await supabase.from("facility_members").delete().eq("id", memberId);
    if (expandedFacility) loadMembers(expandedFacility);
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    const supabase = createClient();
    await supabase.from("facility_members").update({ role: newRole }).eq("id", memberId);
    if (expandedFacility) loadMembers(expandedFacility);
  }

  if (loading) return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Facilities</h1>
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="animate-pulse h-24 rounded-xl bg-gray-100" />)}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facilities</h1>
          <p className="mt-1 text-sm text-gray-500">{facilities.length} location{facilities.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }} className="rounded-lg px-4 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: "#00A1AB" }}>+ Add Facility</button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{editingId ? "Edit Facility" : "New Facility"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
              <input value={form.name} onChange={(e) => { const n = e.target.value; setForm({ ...form, name: n, slug: editingId ? form.slug : autoSlug(n) }); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="e.g. Sunrise Harbor View" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">URL Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="sunrise-harbor-view" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="200 Harbor Drive" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Portland" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">State</label>
                <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="ME" maxLength={2} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Timezone</label>
                <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("America/","").replace("Pacific/","").replace(/_/g," ")}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={saveForm} disabled={saving || !form.name} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "#00A1AB" }}>{saving ? "Saving..." : editingId ? "Save Changes" : "Create Facility"}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {facilities.map(fac => (
          <div key={fac.id} className={`rounded-xl border bg-white transition-shadow ${fac.is_active ? "hover:shadow-sm" : "opacity-60"}`}>
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: fac.is_active ? "#00D08A" : "#D1D5DB" }} />
                <div>
                  <p className="font-semibold text-gray-900">{fac.name}</p>
                  <p className="text-sm text-gray-500">{[fac.address, fac.city, fac.state].filter(Boolean).join(", ") || "No address"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">/{fac.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleMembers(fac.id)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">{expandedFacility === fac.id ? "Hide" : "Team"}</button>
                <button onClick={() => { setEditingId(fac.id); setForm({ name: fac.name, address: fac.address||"", city: fac.city||"", state: fac.state||"", slug: fac.slug, timezone: fac.timezone||"America/Denver" }); setShowForm(true); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Edit</button>
                <button onClick={() => toggleFacility(fac)} className="relative h-6 w-11 rounded-full transition-colors flex-shrink-0" style={{ backgroundColor: fac.is_active ? "#00A1AB" : "#D1D5DB" }}>
                  <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${fac.is_active ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
            {expandedFacility === fac.id && (
              <div className="border-t bg-gray-50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Team Members</h3>
                {members.length === 0 ? <p className="mb-3 text-sm text-gray-400">No team members yet</p> : (
                  <div className="mb-4 space-y-2">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(0, 208, 138, 0.15)", color: "#00835A" }}>{(m.hosts as any)?.name?.[0] || "?"}</div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{(m.hosts as any)?.name}</p>
                            <p className="text-xs text-gray-400">{(m.hosts as any)?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={m.role} onChange={(e) => updateMemberRole(m.id, e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
                            <option value="admin">admin</option><option value="recruiter">recruiter</option><option value="viewer">viewer</option>
                          </select>
                          {m.host_id !== userId && <button onClick={() => removeMember(m.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-500">Add team member by email</label>
                    <input value={addMemberEmail} onChange={(e) => setAddMemberEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="email@example.com" list="host-emails" />
                    <datalist id="host-emails">{allHosts.filter(h => !members.find(m => m.host_id === h.id)).map(h => <option key={h.id} value={h.email}>{h.name}</option>)}</datalist>
                  </div>
                  <select value={addMemberRole} onChange={(e) => setAddMemberRole(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="recruiter">Recruiter</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select>
                  <button onClick={() => addMember(fac.id)} disabled={!addMemberEmail} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "#00A1AB" }}>Add</button>
                </div>
                <div className="mt-4 border-t border-gray-200 pt-4">
                  {deleteConfirm === fac.id ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-red-600">Delete this facility and all its associations?</span>
                      <button onClick={() => deleteFacility(fac.id)} className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600">Yes, Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} className="rounded-md border px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                    </div>
                  ) : <button onClick={() => setDeleteConfirm(fac.id)} className="text-xs text-red-500 hover:text-red-700">Delete Facility</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {facilities.length === 0 && !showForm && (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">No facilities yet</p>
          <p className="text-sm text-gray-500 mb-4">Add your first location to organize bookings, meeting types, and team members by facility.</p>
          <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} className="rounded-lg px-4 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: "#00A1AB" }}>+ Add First Facility</button>
        </div>
      )}
    </div>
  );
}
