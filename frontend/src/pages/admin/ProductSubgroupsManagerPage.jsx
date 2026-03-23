import React, { useEffect, useState } from "react";
import { Settings, Plus, Loader2, Layers } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function ProductSubgroupsManagerPage() {
  const [groups, setGroups] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "", group_slug: "", group_name: "", status: "active" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const token = localStorage.getItem("token");
    try {
      const [groupsRes, rowsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/product-groups`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        axios.get(`${API_URL}/api/admin/product-subgroups`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ]);
      setGroups(groupsRes.data || []);
      setRows(rowsRes.data || []);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createSubgroup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/admin/product-subgroups`, form, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setForm({ name: "", slug: "", group_slug: "", group_name: "", status: "active" });
      await load();
    } catch (err) {
      console.error("Failed to create subgroup:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const onGroupChange = (groupSlug) => {
    const group = groups.find((g) => g.slug === groupSlug);
    setForm({ ...form, group_slug: groupSlug, group_name: group?.name || "" });
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="product-subgroups-page">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
            <Layers className="w-6 h-6 text-[#20364D]" />
          </div>
          <div>
            <div className="text-4xl font-bold text-[#20364D]">Product Sub-Groups</div>
            <div className="text-slate-600">Create structured sub-groups like Laptops, Printers, Chairs, and Desks to improve filtering.</div>
          </div>
        </div>
      </div>

      <form onSubmit={createSubgroup} className="rounded-[2rem] border bg-white p-8">
        <div className="text-lg font-bold text-[#20364D] mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Sub-Group
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <input 
            className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
            placeholder="Sub-Group Name" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} 
            required
          />
          <input 
            className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 bg-slate-50" 
            placeholder="Slug (auto-generated)" 
            value={form.slug} 
            onChange={(e) => setForm({ ...form, slug: e.target.value })} 
          />
          <select 
            className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
            value={form.group_slug} 
            onChange={(e) => onGroupChange(e.target.value)}
            required
          >
            <option value="">Select Product Group</option>
            {groups.map((group) => (
              <option key={group.id || group.slug} value={group.slug}>{group.name}</option>
            ))}
          </select>
          <select 
            className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
            value={form.status} 
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button 
          type="submit"
          disabled={submitting}
          className="mt-5 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition flex items-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {submitting ? "Adding..." : "Add Sub-Group"}
        </button>
      </form>

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-lg font-bold text-[#20364D] mb-4">
          Existing Sub-Groups ({rows.length})
        </div>
        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-2xl bg-slate-50 p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#20364D]">{row.name}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {row.group_name || "No group"} &bull; {row.slug}
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  row.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            No sub-groups created yet. Add one above to get started.
          </div>
        )}
      </div>
    </div>
  );
}
