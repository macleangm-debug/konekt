import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Plus, Search, Phone, Mail, Building2, DollarSign, ArrowRight, X, Eye, Calendar, UserCheck, Tag, Clock, ExternalLink, TrendingUp, BarChart3 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import api from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const CRM_TABS = [
  { key: "all", label: "All Leads" },
  { key: "service", label: "Service Leads" },
  { key: "product", label: "Product Leads" },
  { key: "request_converted", label: "Request Conversions" },
  { key: "pipeline", label: "Pipeline" },
  { key: "intelligence", label: "Intelligence" },
];

const leadStatuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
const stageOptions = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "meeting_demo", label: "Meeting / Demo" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "dormant", label: "Dormant" },
];

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  proposal: "bg-orange-100 text-orange-700",
  negotiation: "bg-cyan-100 text-cyan-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  new_lead: "bg-blue-100 text-blue-700",
  meeting_demo: "bg-indigo-100 text-indigo-700",
  quote_sent: "bg-amber-100 text-amber-700",
  dormant: "bg-slate-100 text-slate-600",
};

const statusKanbanColors = {
  new: "bg-blue-400",
  contacted: "bg-yellow-400",
  qualified: "bg-purple-400",
  proposal: "bg-orange-400",
  negotiation: "bg-cyan-400",
  won: "bg-green-400",
  lost: "bg-red-400",
};

const SERVICE_STATUSES = ["new", "contacted", "qualified", "quoted", "awaiting_approval", "won", "lost"];
const SERVICE_STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-cyan-100 text-cyan-800",
  qualified: "bg-indigo-100 text-indigo-800",
  quoted: "bg-amber-100 text-amber-800",
  awaiting_approval: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-700",
};

function formatDate(val) {
  if (!val) return "\u2014";
  try {
    const d = new Date(val);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "\u2014";
  }
}

function formatDateTime(val) {
  if (!val) return "\u2014";
  try {
    const d = new Date(val);
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "\u2014";
  }
}

export default function CRMPageV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [activeTab, setActiveTab] = useState("all");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLead, setDrawerLead] = useState(null);
  const [drawerRelated, setDrawerRelated] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Drawer form states
  const [noteText, setNoteText] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [stageForm, setStageForm] = useState({ stage: "", note: "", lost_reason: "", win_reason: "" });
  const [savingNote, setSavingNote] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [savingStage, setSavingStage] = useState(false);

  // CRM Settings
  const [crmSettings, setCrmSettings] = useState(null);
  const [staffList, setStaffList] = useState([]);

  // Service Leads tab
  const [serviceLeads, setServiceLeads] = useState([]);
  const [serviceLeadsLoading, setServiceLeadsLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  // Intelligence tab
  const [intelData, setIntelData] = useState(null);
  const [intelSales, setIntelSales] = useState(null);
  const [intelMarketing, setIntelMarketing] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);

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
    city: "",
    country: "Tanzania",
  });

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getLeads(params);
      setLeads(res.data || []);
    } catch (error) {
      console.error("Failed to load leads", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const loadCrmSettings = async () => {
    try {
      const [settingsRes, staffRes] = await Promise.all([
        api.get("/api/admin/crm-settings"),
        api.get("/api/admin/crm-settings/staff"),
      ]);
      setCrmSettings(settingsRes.data);
      setStaffList(staffRes.data || []);
    } catch (error) {
      console.error("Failed to load CRM settings", error);
    }
  };

  const loadServiceLeads = useCallback(async () => {
    setServiceLeadsLoading(true);
    try {
      const res = await api.get(`/api/admin-flow-fixes/sales/service-leads?q=${encodeURIComponent(serviceSearch)}`);
      setServiceLeads(res.data || []);
    } catch (err) {
      console.error("Failed to load service leads", err);
    } finally {
      setServiceLeadsLoading(false);
    }
  }, [serviceSearch]);

  const loadIntelligence = useCallback(async () => {
    setIntelLoading(true);
    try {
      const [crmRes, salesRes, marketingRes] = await Promise.all([
        api.get("/api/admin/crm-intelligence/dashboard"),
        api.get("/api/admin/sales-kpis/summary"),
        api.get("/api/admin/marketing-performance/sources"),
      ]);
      setIntelData(crmRes.data);
      setIntelSales(salesRes.data);
      setIntelMarketing(marketingRes.data);
    } catch (err) {
      console.error("Failed to load intelligence", err);
    } finally {
      setIntelLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
    loadCrmSettings();
  }, [loadLeads]);

  // Load service leads when tab is active
  useEffect(() => {
    if (activeTab === "service") loadServiceLeads();
  }, [activeTab, loadServiceLeads]);

  // Load intelligence when tab is first activated
  useEffect(() => {
    if (activeTab === "intelligence" && !intelData) loadIntelligence();
  }, [activeTab, intelData, loadIntelligence]);

  // Auto-open drawer if openLead query param is set
  useEffect(() => {
    const openLeadId = searchParams.get("openLead");
    if (openLeadId && leads.length > 0) {
      const match = leads.find((l) => l.id === openLeadId);
      if (match) {
        openDrawer(match);
        setSearchParams({}, { replace: true });
      }
    }
  }, [leads, searchParams]);

  const openDrawer = async (lead) => {
    setDrawerOpen(true);
    setDrawerLead(lead);
    setDrawerRelated(null);
    setNoteText("");
    setFollowUpAt("");
    setStageForm({ stage: lead.stage || lead.status || "", note: "", lost_reason: "", win_reason: "" });
    setDrawerLoading(true);
    try {
      const res = await api.get(`/api/admin/crm-deals/leads/${lead.id}`);
      setDrawerLead(res.data.lead);
      setDrawerRelated(res.data.related);
      setStageForm((prev) => ({ ...prev, stage: res.data.lead.stage || res.data.lead.status || "" }));
    } catch {
      // Fallback: just use the list data
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerLead(null);
    setDrawerRelated(null);
  };

  const createLead = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createLead({
        ...form,
        estimated_value: Number(form.estimated_value || 0),
      });
      setForm({
        company_name: "", contact_name: "", email: "", phone: "", source: "",
        industry: "", notes: "", status: "new", assigned_to: "",
        estimated_value: "", city: "", country: "Tanzania",
      });
      setShowForm(false);
      loadLeads();
    } catch (error) {
      console.error("Failed to create lead", error);
      alert(error.response?.data?.detail || "Failed to create lead");
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

  const updateServiceLeadStatus = async (lead, newStatus) => {
    try {
      if (lead.source === "leads") {
        await api.post("/api/admin-flow-fixes/leads/update-status", { lead_id: lead.id, status: newStatus });
      }
      setServiceLeads((prev) => prev.map((r) => r.id === lead.id ? { ...r, status: newStatus } : r));
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
  };

  // Drawer actions
  const addNote = async () => {
    if (!noteText.trim() || !drawerLead) return;
    setSavingNote(true);
    try {
      await api.post(`/api/admin/crm-intelligence/leads/${drawerLead.id}/note`, { note: noteText });
      setNoteText("");
      const res = await api.get(`/api/admin/crm-deals/leads/${drawerLead.id}`);
      setDrawerLead(res.data.lead);
      setDrawerRelated(res.data.related);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const saveFollowUp = async () => {
    if (!followUpAt || !drawerLead) return;
    setSavingFollowUp(true);
    try {
      await api.post(`/api/admin/crm-intelligence/leads/${drawerLead.id}/follow-up`, {
        next_follow_up_at: followUpAt,
        note: "Follow-up scheduled",
      });
      setFollowUpAt("");
      const res = await api.get(`/api/admin/crm-deals/leads/${drawerLead.id}`);
      setDrawerLead(res.data.lead);
      loadLeads();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to schedule follow-up");
    } finally {
      setSavingFollowUp(false);
    }
  };

  const updateStage = async () => {
    if (!stageForm.stage || !drawerLead) return;
    setSavingStage(true);
    try {
      await api.post(`/api/admin/crm-intelligence/leads/${drawerLead.id}/status`, stageForm);
      const res = await api.get(`/api/admin/crm-deals/leads/${drawerLead.id}`);
      setDrawerLead(res.data.lead);
      loadLeads();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update stage");
    } finally {
      setSavingStage(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        lead.company_name?.toLowerCase().includes(term) ||
        lead.contact_name?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.industry?.toLowerCase().includes(term) ||
        (lead.name || "").toLowerCase().includes(term)
      );
    });
  }, [leads, searchTerm]);

  // Tab-filtered leads
  const tabFilteredLeads = useMemo(() => {
    if (activeTab === "product") {
      return filteredLeads.filter(l =>
        (l.lead_type || "").toLowerCase().includes("product") ||
        (l.source_request_type || "").toLowerCase().includes("product")
      );
    }
    if (activeTab === "request_converted") {
      return filteredLeads.filter(l => l.converted_from_request);
    }
    return filteredLeads;
  }, [filteredLeads, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const byStatus = {};
    leadStatuses.forEach((s) => { byStatus[s] = 0; });
    leads.forEach((l) => {
      if (byStatus[l.status] !== undefined) byStatus[l.status]++;
    });
    const totalValue = leads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    return { byStatus, totalValue, total: leads.length };
  }, [leads]);

  // Determine effective view mode (pipeline tab forces kanban)
  const effectiveViewMode = activeTab === "pipeline" ? "kanban" : viewMode;
  const showLeadsView = ["all", "product", "request_converted", "pipeline"].includes(activeTab);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="crm-page">
      <div className="max-w-none w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-[#D4A843]" />
              CRM
            </h1>
            <p className="text-slate-600 mt-1">Unified lead management, pipeline, and intelligence</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
            data-testid="add-lead-btn"
          >
            <Plus className="w-5 h-5" />
            {showForm ? "Cancel" : "Add Lead"}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="rounded-xl bg-white border p-3">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          {leadStatuses.slice(0, 6).map((status) => (
            <div key={status} className="rounded-xl bg-white border p-3">
              <p className="text-xs text-slate-500 capitalize">{status}</p>
              <p className="text-xl font-bold">{stats.byStatus[status]}</p>
            </div>
          ))}
          <div className="rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/30 p-3">
            <p className="text-xs text-[#9a6d00]">Pipeline Value</p>
            <p className="text-lg font-bold text-[#9a6d00]">TZS {stats.totalValue.toLocaleString()}</p>
          </div>
        </div>

        {/* CRM Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1" data-testid="crm-tabs">
          {CRM_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-white border border-b-white text-[#2D3E50] shadow-sm -mb-[1px]"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
              data-testid={`crm-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "intelligence" ? (
          <IntelligenceTabContent
            data={intelData}
            sales={intelSales}
            marketing={intelMarketing}
            loading={intelLoading}
            onRefresh={loadIntelligence}
          />
        ) : activeTab === "service" ? (
          <ServiceLeadsTabContent
            leads={serviceLeads}
            loading={serviceLeadsLoading}
            search={serviceSearch}
            onSearchChange={setServiceSearch}
            onStatusChange={updateServiceLeadStatus}
          />
        ) : (
          <>
            {/* Filters and View Toggle */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  data-testid="search-leads-input"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-300 bg-white"
              >
                <option value="">All Statuses</option>
                {leadStatuses.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>

              {activeTab !== "pipeline" && (
                <div className="ml-auto flex rounded-xl border overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-2.5 text-sm font-medium ${viewMode === "list" ? "bg-[#2D3E50] text-white" : "hover:bg-slate-50"}`}
                    data-testid="view-list-btn"
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`px-4 py-2.5 text-sm font-medium ${viewMode === "cards" ? "bg-[#2D3E50] text-white" : "hover:bg-slate-50"}`}
                    data-testid="view-cards-btn"
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("kanban")}
                    className={`px-4 py-2.5 text-sm font-medium ${viewMode === "kanban" ? "bg-[#2D3E50] text-white" : "hover:bg-slate-50"}`}
                    data-testid="view-kanban-btn"
                  >
                    Kanban
                  </button>
                </div>
              )}
            </div>

            {/* Create Lead Form */}
            {showForm && (
              <div className="rounded-2xl border bg-white p-6 shadow-lg" data-testid="lead-form">
                <h2 className="text-xl font-bold mb-4">Create New Lead</h2>
                <form onSubmit={createLead} className="grid md:grid-cols-3 gap-4">
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="Company name *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="Contact name *" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required />
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <select className="border border-slate-300 rounded-xl px-4 py-3 bg-white" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                    <option value="">Select Industry</option>
                    {(crmSettings?.industries || []).map((item) => (<option key={item} value={item}>{item}</option>))}
                  </select>
                  <select className="border border-slate-300 rounded-xl px-4 py-3 bg-white" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                    <option value="">Select Source</option>
                    {(crmSettings?.sources || []).map((item) => (<option key={item} value={item}>{item}</option>))}
                  </select>
                  <select className="border border-slate-300 rounded-xl px-4 py-3 bg-white" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                    <option value="">Assign To</option>
                    {staffList.map((member) => (<option key={member.id} value={member.email}>{member.full_name || member.email}</option>))}
                  </select>
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="Estimated Value (TZS)" type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <textarea className="border border-slate-300 rounded-xl px-4 py-3 md:col-span-3" placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  <div className="md:col-span-3">
                    <button type="submit" className="bg-[#D4A843] text-[#2D3E50] px-6 py-3 rounded-xl font-semibold hover:bg-[#c49933]">Create Lead</button>
                  </div>
                </form>
              </div>
            )}

            {/* List View */}
            {effectiveViewMode === "list" && (
              <div className="rounded-2xl border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left" data-testid="crm-leads-table">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date Created</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lead Name</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Source</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Owner</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stage</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Last Activity</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Next Follow-up</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-500">Loading...</td></tr>
                      ) : tabFilteredLeads.length === 0 ? (
                        <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-500">No leads found</td></tr>
                      ) : (
                        tabFilteredLeads.map((lead) => (
                          <tr
                            key={lead.id}
                            className="border-b last:border-b-0 hover:bg-slate-50 cursor-pointer transition"
                            onClick={() => openDrawer(lead)}
                            data-testid={`lead-row-${lead.id}`}
                          >
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(lead.created_at)}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-sm">{lead.contact_name || lead.name || "\u2014"}</div>
                              <div className="text-xs text-slate-400">{lead.email || "\u2014"}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">{lead.company_name || "\u2014"}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs">{lead.source || "\u2014"}</span>
                              {lead.converted_from_request && (
                                <span className="ml-1 inline-flex text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-medium">req</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{lead.assigned_to || "\u2014"}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${statusColors[lead.stage] || statusColors[lead.status] || "bg-slate-100"}`}>
                                {lead.stage || lead.status || "\u2014"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={lead.status}
                                onChange={(e) => { e.stopPropagation(); changeStatus(lead.id, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                className={`px-2 py-0.5 rounded-lg text-xs font-medium border-0 cursor-pointer ${statusColors[lead.status] || "bg-slate-100"}`}
                                data-testid={`lead-status-select-${lead.id}`}
                              >
                                {leadStatuses.map((s) => (<option key={s} value={s}>{s}</option>))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(lead.updated_at)}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(lead.next_follow_up_at)}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); openDrawer(lead); }}
                                className="inline-flex items-center gap-1 text-sm text-slate-600 font-medium hover:text-[#2D3E50]"
                                data-testid={`view-lead-${lead.id}`}
                              >
                                <Eye className="w-4 h-4" /> View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cards View */}
            {effectiveViewMode === "cards" && (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full text-center py-10 text-slate-500">Loading...</div>
                ) : tabFilteredLeads.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-slate-500">No leads found</div>
                ) : (
                  tabFilteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => openDrawer(lead)}
                      className="rounded-2xl border bg-white p-5 hover:shadow-md transition-shadow cursor-pointer"
                      data-testid={`lead-card-${lead.id}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold">{lead.company_name || lead.contact_name}</h3>
                          <p className="text-sm text-slate-600">{lead.contact_name}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[lead.status] || "bg-slate-100"}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4" />{lead.email}</div>
                        {lead.phone && <div className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4" />{lead.phone}</div>}
                        {lead.industry && <div className="flex items-center gap-2 text-slate-600"><Building2 className="w-4 h-4" />{lead.industry}</div>}
                        {lead.estimated_value ? (
                          <div className="flex items-center gap-2 text-[#D4A843] font-medium"><DollarSign className="w-4 h-4" />TZS {Number(lead.estimated_value).toLocaleString()}</div>
                        ) : null}
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <select
                          value={lead.status}
                          onChange={(e) => { e.stopPropagation(); changeStatus(lead.id, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm border rounded-lg px-2 py-1"
                        >
                          {leadStatuses.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                        {lead.status === "won" && (
                          <span className="text-sm text-green-600 font-medium">Won</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Kanban View — Draggable */}
            {effectiveViewMode === "kanban" && (
              <div className="grid xl:grid-cols-7 gap-4 overflow-x-auto pb-4" data-testid="crm-kanban">
                {leadStatuses.map((stage) => {
                  const stageLeads = tabFilteredLeads.filter((l) => l.status === stage);
                  const stageValue = stageLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
                  return (
                    <div
                      key={stage}
                      className="rounded-2xl border bg-white p-4 min-h-[450px] min-w-[240px] transition-colors"
                      data-testid={`kanban-col-${stage}`}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-[#D4A843]/5", "border-[#D4A843]"); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove("bg-[#D4A843]/5", "border-[#D4A843]"); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("bg-[#D4A843]/5", "border-[#D4A843]");
                        const leadId = e.dataTransfer.getData("text/plain");
                        if (leadId) changeStatus(leadId, stage);
                      }}
                    >
                      <div className="font-semibold capitalize mb-1 flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${statusKanbanColors[stage]}`} />
                        {stage.replace("_", " ")}
                      </div>
                      <div className="text-xs text-slate-500 mb-4">
                        {stageLeads.length} leads &bull; TZS {stageValue.toLocaleString()}
                      </div>
                      <div className="space-y-3">
                        {stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData("text/plain", lead.id); e.dataTransfer.effectAllowed = "move"; }}
                            className="rounded-xl border bg-slate-50 p-3 hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing active:shadow-md active:border-[#D4A843]"
                            onClick={() => openDrawer(lead)}
                            data-testid={`kanban-card-${lead.id}`}
                          >
                            <div className="font-medium text-sm">{lead.company_name || lead.contact_name}</div>
                            <div className="text-xs text-slate-600 mt-1">{lead.contact_name}</div>
                            {lead.estimated_value ? (
                              <div className="text-xs text-[#D4A843] font-medium mt-2">TZS {Number(lead.estimated_value).toLocaleString()}</div>
                            ) : null}
                          </div>
                        ))}
                        {stageLeads.length === 0 && (
                          <div className="text-sm text-slate-400 text-center py-8">No leads</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lead Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0" data-testid="lead-detail-drawer">
          <SheetHeader className="px-6 pt-6 pb-4 border-b bg-white sticky top-0 z-10">
            <SheetTitle className="text-lg font-bold">
              {drawerLead?.contact_name || drawerLead?.name || "Lead Detail"}
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-500">
              {drawerLead?.company_name || "\u2014"} &bull; {drawerLead?.email || "\u2014"}
            </SheetDescription>
          </SheetHeader>

          {drawerLoading ? (
            <div className="p-6 text-center text-slate-400">Loading lead details...</div>
          ) : drawerLead ? (
            <div className="p-6 space-y-6">
              {/* Lead Info Summary */}
              <div className="grid grid-cols-2 gap-3" data-testid="lead-info-grid">
                <InfoCard label="Stage" value={drawerLead.stage || drawerLead.status || "\u2014"} />
                <InfoCard label="Lead Score" value={drawerLead.lead_score || 0} />
                <InfoCard label="Expected Value" value={`TZS ${Number(drawerLead.expected_value || drawerLead.estimated_value || 0).toLocaleString()}`} />
                <InfoCard label="Next Follow-up" value={formatDateTime(drawerLead.next_follow_up_at)} />
                <InfoCard label="Phone" value={drawerLead.phone || "\u2014"} />
                <InfoCard label="Source" value={drawerLead.source || "\u2014"} />
                {drawerLead.industry && <InfoCard label="Industry" value={drawerLead.industry} />}
                {drawerLead.assigned_to && <InfoCard label="Owner" value={drawerLead.assigned_to} />}
              </div>

              {/* Request traceability */}
              {drawerLead.converted_from_request && (
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 text-sm" data-testid="lead-request-source">
                  <div className="font-semibold text-teal-800 mb-1">Converted from Request</div>
                  <div className="text-teal-700">
                    Type: <span className="font-medium">{drawerLead.source_request_type || "\u2014"}</span>
                    {drawerLead.source_request_reference && (
                      <> &bull; Ref: <span className="font-mono">{drawerLead.source_request_reference}</span></>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div data-testid="lead-timeline-section">
                <h3 className="font-semibold text-sm text-slate-700 mb-3 uppercase tracking-wide">Timeline</h3>
                {(drawerLead.timeline || []).length ? (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {[...(drawerLead.timeline || [])].reverse().map((item, idx) => (
                      <div key={idx} className="rounded-xl border bg-slate-50 p-3 text-sm">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(item.created_at)}</div>
                        {item.note && <div className="text-slate-600 mt-1">{item.note}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No timeline activity yet.</div>
                )}
              </div>

              {/* Related Documents */}
              {drawerRelated && (
                <div data-testid="lead-related-section">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3 uppercase tracking-wide">Related Documents</h3>
                  <div className="space-y-2">
                    {(drawerRelated.quotes || []).map((q) => (
                      <RelatedRow key={q.id} title={q.quote_number || "Quote"} subtitle={`TZS ${Number(q.total || 0).toLocaleString()} - ${q.status || "\u2014"}`} />
                    ))}
                    {(drawerRelated.invoices || []).map((inv) => (
                      <RelatedRow key={inv.id} title={inv.invoice_number || "Invoice"} subtitle={`TZS ${Number(inv.total || 0).toLocaleString()} - ${inv.status || "\u2014"}`} />
                    ))}
                    {(drawerRelated.tasks || []).map((t) => (
                      <RelatedRow key={t.id} title={t.title || "Task"} subtitle={`${t.status || "\u2014"} - ${t.assigned_to || "\u2014"}`} />
                    ))}
                    {!(drawerRelated.quotes?.length || drawerRelated.invoices?.length || drawerRelated.tasks?.length) && (
                      <div className="text-sm text-slate-400">No related documents.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Add Note */}
              <div data-testid="lead-add-note-section">
                <h3 className="font-semibold text-sm text-slate-700 mb-2 uppercase tracking-wide">Add Note</h3>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 text-sm min-h-[70px] resize-none"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note..."
                  data-testid="drawer-note-input"
                />
                <button
                  onClick={addNote}
                  disabled={savingNote || !noteText.trim()}
                  className="mt-2 rounded-xl bg-[#2D3E50] text-white px-4 py-2 text-sm font-semibold hover:bg-[#3d5166] disabled:opacity-50"
                  data-testid="drawer-save-note-btn"
                >
                  {savingNote ? "Saving..." : "Save Note"}
                </button>
              </div>

              {/* Schedule Follow-up */}
              <div data-testid="lead-followup-section">
                <h3 className="font-semibold text-sm text-slate-700 mb-2 uppercase tracking-wide">Schedule Follow-up</h3>
                <input
                  type="datetime-local"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                  data-testid="drawer-followup-input"
                />
                <button
                  onClick={saveFollowUp}
                  disabled={savingFollowUp || !followUpAt}
                  className="mt-2 rounded-xl bg-[#2D3E50] text-white px-4 py-2 text-sm font-semibold hover:bg-[#3d5166] disabled:opacity-50"
                  data-testid="drawer-save-followup-btn"
                >
                  {savingFollowUp ? "Scheduling..." : "Schedule"}
                </button>
              </div>

              {/* Update Stage */}
              <div data-testid="lead-stage-section">
                <h3 className="font-semibold text-sm text-slate-700 mb-2 uppercase tracking-wide">Update Stage</h3>
                <select
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                  value={stageForm.stage}
                  onChange={(e) => setStageForm({ ...stageForm, stage: e.target.value })}
                  data-testid="drawer-stage-select"
                >
                  {stageOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
                {stageForm.stage === "lost" && (
                  <input className="w-full border rounded-xl px-3 py-2 text-sm mt-2" placeholder="Lost reason" value={stageForm.lost_reason} onChange={(e) => setStageForm({ ...stageForm, lost_reason: e.target.value })} />
                )}
                {stageForm.stage === "won" && (
                  <input className="w-full border rounded-xl px-3 py-2 text-sm mt-2" placeholder="Win reason" value={stageForm.win_reason} onChange={(e) => setStageForm({ ...stageForm, win_reason: e.target.value })} />
                )}
                <textarea className="w-full border rounded-xl px-3 py-2 text-sm mt-2 min-h-[50px] resize-none" placeholder="Stage note" value={stageForm.note} onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })} />
                <button
                  onClick={updateStage}
                  disabled={savingStage}
                  className="mt-2 rounded-xl bg-[#2D3E50] text-white px-4 py-2 text-sm font-semibold hover:bg-[#3d5166] disabled:opacity-50"
                  data-testid="drawer-update-stage-btn"
                >
                  {savingStage ? "Updating..." : "Update Stage"}
                </button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Service Leads Tab Content ── */
function ServiceLeadsTabContent({ leads, loading, search, onSearchChange, onStatusChange }) {
  if (loading) {
    return <div className="text-center py-10 text-slate-500">Loading service leads...</div>;
  }

  return (
    <div className="space-y-4" data-testid="service-leads-tab">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search service leads..."
            className="border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm w-full focus:ring-2 focus:ring-[#D4A843] outline-none"
            data-testid="service-leads-search"
          />
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <Users size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No service leads yet</h2>
          <p className="text-slate-500 mt-2">Service requests and promo customization quotes appear here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="service-leads-table">
              <thead>
                <tr className="text-left border-b bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lead</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((row, idx) => (
                  <tr key={row.id || `sl-${idx}`} className="hover:bg-slate-50 transition-colors" data-testid={`service-lead-row-${row.id || idx}`}>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-[#20364D]">{row.customer_name}</td>
                    <td className="px-4 py-3 text-[#20364D]">{row.title}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{row.lead_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        data-testid={`service-lead-status-${row.id}`}
                        value={row.status}
                        onChange={(e) => onStatusChange(row, e.target.value)}
                        className={`border-0 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${SERVICE_STATUS_COLORS[row.status] || "bg-slate-100"}`}
                      >
                        {SERVICE_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Intelligence Tab Content ── */
function IntelligenceTabContent({ data, sales, marketing, loading, onRefresh }) {
  if (loading) {
    return <div className="text-center py-10 text-slate-500">Loading intelligence data...</div>;
  }

  return (
    <div className="space-y-6" data-testid="intelligence-tab">
      <div className="flex items-center justify-between">
        <p className="text-slate-600 text-sm">Pipeline health, follow-ups, sales performance, and source quality.</p>
        <button onClick={onRefresh} className="text-sm text-[#2D3E50] font-medium hover:underline" data-testid="refresh-intel-btn">
          Refresh
        </button>
      </div>

      {data && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntelStatCard label="Total Leads" value={data.summary?.total_leads || 0} />
          <IntelStatCard label="Won" value={data.summary?.won || 0} />
          <IntelStatCard label="Lost" value={data.summary?.lost || 0} />
          <IntelStatCard label="Quote Sent" value={data.summary?.quote_sent || 0} />
          <IntelStatCard label="Overdue Follow-ups" value={data.summary?.overdue_followups || 0} highlight />
          <IntelStatCard label="Stale Leads" value={data.summary?.stale_leads || 0} highlight />
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        {sales && (
          <IntelPanel title="Sales Summary">
            <IntelMetricRow label="Leads" value={sales.lead_count || 0} />
            <IntelMetricRow label="Won" value={sales.won_count || 0} />
            <IntelMetricRow label="Lost" value={sales.lost_count || 0} />
            <IntelMetricRow label="Quotes" value={sales.quote_count || 0} />
            <IntelMetricRow label="Revenue" value={`TZS ${Number(sales.total_revenue || 0).toLocaleString()}`} />
            <IntelMetricRow label="Conversion Rate" value={`${sales.conversion_rate || 0}%`} />
          </IntelPanel>
        )}

        {data && (
          <IntelPanel title="Pipeline by Stage">
            {Object.entries(data.by_stage || {}).map(([stage, count]) => (
              <IntelMetricRow key={stage} label={stage.replace(/_/g, " ")} value={count} />
            ))}
            {Object.keys(data.by_stage || {}).length === 0 && (
              <div className="text-slate-500 text-sm">No leads in pipeline yet</div>
            )}
          </IntelPanel>
        )}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        {data && (
          <IntelPanel title="Lead Sources">
            {Object.entries(data.by_source || {}).map(([source, count]) => (
              <IntelMetricRow key={source} label={source} value={count} />
            ))}
            {Object.keys(data.by_source || {}).length === 0 && (
              <div className="text-slate-500 text-sm">No source data yet</div>
            )}
          </IntelPanel>
        )}

        {marketing && (
          <IntelPanel title="Marketing Source Performance">
            {Object.entries(marketing || {}).map(([source, mData]) => (
              <div key={source} className="rounded-xl border bg-slate-50 p-4 mb-2">
                <div className="font-semibold text-sm">{source}</div>
                <div className="text-xs text-slate-600 mt-1">Leads: {mData.leads} | Quotes: {mData.quotes} | Won: {mData.won}</div>
              </div>
            ))}
            {Object.keys(marketing || {}).length === 0 && (
              <div className="text-slate-500 text-sm">No marketing data yet</div>
            )}
          </IntelPanel>
        )}
      </div>
    </div>
  );
}

/* ── Shared Sub-components ── */
function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-sm mt-1">{value || "\u2014"}</div>
    </div>
  );
}

function RelatedRow({ title, subtitle }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
    </div>
  );
}

function IntelStatCard({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${highlight && value > 0 ? 'border-amber-300 bg-amber-50' : ''}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${highlight && value > 0 ? 'text-amber-700' : ''}`}>{value}</div>
    </div>
  );
}

function IntelPanel({ title, children }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function IntelMetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-2.5">
      <span className="text-slate-600 text-sm capitalize">{label}</span>
      <span className="font-semibold text-sm">{value}</span>
    </div>
  );
}
