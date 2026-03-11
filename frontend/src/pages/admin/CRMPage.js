import React, { useEffect, useState } from "react";
import { Users, Plus, Search, Phone, Mail, Building2, DollarSign } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const leadStatuses = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"];
const statusColors = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  proposal_sent: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

export default function CRMPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    source: "",
    industry: "",
    notes: "",
    status: "new",
    assigned_to: "",
    estimated_value: "",
  });

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getLeads(params);
      setLeads(res.data);
    } catch (error) {
      console.error("Failed to load leads", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [filterStatus]);

  const createLead = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createLead({
        ...form,
        estimated_value: Number(form.estimated_value || 0),
      });
      setForm({
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        source: "",
        industry: "",
        notes: "",
        status: "new",
        assigned_to: "",
        estimated_value: "",
      });
      setShowForm(false);
      loadLeads();
    } catch (error) {
      console.error("Failed to create lead", error);
    }
  };

  const changeStatus = async (leadId, status) => {
    try {
      await adminApi.updateLeadStatus(leadId, status);
      loadLeads();
    } catch (error) {
      console.error("Failed to update lead status", error);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.company_name?.toLowerCase().includes(term) ||
      lead.contact_name?.toLowerCase().includes(term) ||
      lead.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-[#D4A843]" />
              CRM Pipeline
            </h1>
            <p className="text-slate-600 mt-1">Manage leads and track conversions</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Lead
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
          >
            <option value="">All Statuses</option>
            {leadStatuses.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {/* Create Lead Form */}
        {showForm && (
          <div className="rounded-2xl border bg-white p-6 mb-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Create New Lead</h2>
            <form onSubmit={createLead} className="grid md:grid-cols-2 gap-4">
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Company name *"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Contact name *"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                required
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Email *"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Source (e.g. Website, Referral)"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Industry"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Estimated value (TZS)"
                type="number"
                value={form.estimated_value}
                onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Assigned to"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              />
              <textarea
                className="border border-slate-300 rounded-xl px-4 py-3 md:col-span-2"
                placeholder="Notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="bg-[#2D3E50] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
                >
                  Save Lead
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Leads Table */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Company</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Value</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Source</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading leads...</td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No leads found</td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{lead.company_name}</p>
                            <p className="text-sm text-slate-500">{lead.industry || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{lead.contact_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 font-semibold text-green-600">
                          <DollarSign className="w-4 h-4" />
                          {(lead.estimated_value || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{lead.source || "—"}</td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => changeStatus(lead.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${statusColors[lead.status] || "bg-slate-100"}`}
                        >
                          {leadStatuses.map((status) => (
                            <option key={status} value={status}>{status.replace("_", " ")}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
          {leadStatuses.map((status) => {
            const count = leads.filter((l) => l.status === status).length;
            return (
              <div
                key={status}
                className={`rounded-xl p-4 ${statusColors[status]}`}
              >
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm capitalize">{status.replace("_", " ")}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
