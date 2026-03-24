import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Layers, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

export default function ServiceTaxonomyAdminSetup() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newGroup, setNewGroup] = useState({ group_key: "", group_name: "", subgroups: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/api/multi-request/service-taxonomy");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleAddGroup = async () => {
    if (!newGroup.group_key.trim() || !newGroup.group_name.trim()) return alert("Key and name are required");
    setSaving(true);
    try {
      const subgroups = newGroup.subgroups.split(",").map(s => s.trim()).filter(Boolean);
      await api.post("/api/multi-request/service-group", { ...newGroup, subgroups });
      setNewGroup({ group_key: "", group_name: "", subgroups: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setSaving(false);
  };

  const handleDelete = async (key) => {
    if (!window.confirm(`Delete group "${key}"?`)) return;
    try {
      await api.delete(`/api/multi-request/service-group/${key}`);
      load();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-10 bg-slate-100 rounded-xl w-64" /><div className="h-64 bg-slate-100 rounded-[2rem]" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="service-taxonomy-admin">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Service Taxonomy</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage service groups and subgroups. These appear in customer service request forms and marketplace.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} data-testid="add-service-group-btn"
          className="flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-2.5 font-semibold hover:bg-[#2a4a66] transition-colors">
          <Plus size={16} /> Add Group
        </button>
      </div>

      {showAdd && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-4" data-testid="add-group-form">
          <h2 className="text-lg font-bold text-[#20364D]">New Service Group</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Group Key (e.g., photo_video)" value={newGroup.group_key} onChange={(e) => setNewGroup({ ...newGroup, group_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} data-testid="group-key-input" />
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Group Name (e.g., Photography & Videography)" value={newGroup.group_name} onChange={(e) => setNewGroup({ ...newGroup, group_name: e.target.value })} data-testid="group-name-input" />
          </div>
          <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[80px] focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Subgroups (comma-separated, e.g., Office Portraits, Team Headshots, Product Photography)" value={newGroup.subgroups} onChange={(e) => setNewGroup({ ...newGroup, subgroups: e.target.value })} data-testid="group-subgroups-input" />
          <div className="flex gap-3">
            <button onClick={handleAddGroup} disabled={saving} data-testid="save-group-btn" className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 font-semibold disabled:opacity-50">{saving ? "Saving..." : "Save Group"}</button>
            <button onClick={() => setShowAdd(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-[#20364D]">Cancel</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <Layers size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No service groups</h2>
          <p className="text-slate-500 mt-2">Add service groups and subgroups to populate service request forms.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.group_key} className="rounded-2xl border border-slate-200 bg-white overflow-hidden" data-testid={`group-${row.group_key}`}>
              <button onClick={() => toggleExpand(row.group_key)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <Layers size={18} className="text-[#20364D]" />
                  <span className="font-semibold text-[#20364D]">{row.group_name}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{(row.subgroups || []).length} subgroups</span>
                </div>
                {expanded[row.group_key] ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </button>
              {expanded[row.group_key] && (
                <div className="px-5 pb-4 border-t border-slate-100">
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(row.subgroups || []).map((s) => (
                      <span key={s} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-[#20364D] bg-slate-50">{s}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => handleDelete(row.group_key)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete Group</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
