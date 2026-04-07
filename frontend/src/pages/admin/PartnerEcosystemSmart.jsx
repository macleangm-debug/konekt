import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, Building2, Wrench, Package, RefreshCcw, ChevronRight, Users, MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react";
import PartnerViewToggle from "../../components/partners/PartnerViewToggle";
import PartnerSpecificServicesField from "../../components/partners/PartnerSpecificServicesField";
import PhoneNumberField from "../../components/forms/PhoneNumberField";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PARTNER_TYPES = [
  { value: "service", label: "Service Partner", icon: Wrench, description: "Capability-based, quote pricing" },
  { value: "product", label: "Product Partner", icon: Package, description: "Inventory-based, SKU pricing" },
  { value: "hybrid", label: "Hybrid Partner", icon: RefreshCcw, description: "Both service and product" },
];

const STATUS_COLORS = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
};

export default function PartnerEcosystemSmart() {
  const [view, setView] = useState("table");
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ total_partners: 0, active_partners: 0, by_type: {} });
  
  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    partner_type: "service",
    country_code: "TZ",
    regions: [],
    specific_services_csv: "",
    contact_phone: "",
    lead_time_days: 3,
    settlement_terms: "net_30",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetchPartners();
    fetchStats();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/partners-smart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      }
    } catch (err) {
      console.error("Failed to fetch partners:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/partners-smart/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        specific_services: form.specific_services_csv
          .split(",")
          .map(s => s.trim())
          .filter(Boolean),
      };
      delete payload.specific_services_csv;

      const res = await fetch(`${API_URL}/api/admin/partners-smart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({
          name: "",
          email: "",
          partner_type: "service",
          country_code: "TZ",
          regions: [],
          specific_services_csv: "",
          contact_phone: "",
          lead_time_days: 3,
          settlement_terms: "net_30",
          notes: "",
        });
        fetchPartners();
        fetchStats();
        alert("Partner created successfully!");
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to create partner");
      }
    } catch (err) {
      alert("Error creating partner");
    } finally {
      setSaving(false);
    }
  };

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      if (filterType !== "all" && p.partner_type !== filterType) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !p.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [partners, filterType, filterStatus, searchQuery]);

  const currentTypeConfig = PARTNER_TYPES.find(t => t.value === form.partner_type);

  return (
    <div className="space-y-8" data-testid="partner-ecosystem-smart">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-4xl font-bold text-[#20364D]">Partner Ecosystem</div>
          <div className="text-slate-600 mt-2">
            Unified partner management — Service, Product, and Hybrid partners in one place.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PartnerViewToggle view={view} onChange={setView} />
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#20364D] text-white font-medium hover:bg-[#2a4a66] transition"
            data-testid="add-partner-btn"
          >
            <Plus className="w-5 h-5" />
            Add Partner
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Total Partners</div>
          <div className="text-3xl font-bold text-[#20364D] mt-2">{stats.total_partners}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Active</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{stats.active_partners}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Service Partners</div>
          <div className="text-3xl font-bold text-[#D4A843] mt-2">{stats.by_type?.service || 0}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Product Partners</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{stats.by_type?.product || 0}</div>
        </div>
      </div>

      {/* Add Partner Form */}
      {showForm && (
        <div className="rounded-[2rem] border bg-white p-8 space-y-6" data-testid="partner-form">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-[#20364D]">Add New Partner</div>
              <div className="text-slate-600 mt-1">
                The form adapts based on partner type — service partners don't need inventory fields.
              </div>
            </div>
          </div>

          {/* Partner Type Selection */}
          <div className="grid md:grid-cols-3 gap-4">
            {PARTNER_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = form.partner_type === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setForm({ ...form, partner_type: type.value })}
                  className={`p-5 rounded-2xl border-2 text-left transition ${
                    isSelected
                      ? "border-[#20364D] bg-[#20364D]/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  data-testid={`type-${type.value}`}
                >
                  <Icon className={`w-8 h-8 mb-3 ${isSelected ? "text-[#20364D]" : "text-slate-400"}`} />
                  <div className={`font-semibold ${isSelected ? "text-[#20364D]" : "text-slate-700"}`}>
                    {type.label}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{type.description}</div>
                </button>
              );
            })}
          </div>

          {/* Basic Info */}
          <div className="grid lg:grid-cols-2 gap-6">
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Partner Name *</div>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="e.g., On Demand International"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="partner-name"
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Email *</div>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="email"
                placeholder="e.g., ops@partner.co.tz"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="partner-email"
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Contact Phone</div>
              <PhoneNumberField
                label=""
                prefix={form.contact_phone_prefix || "+255"}
                number={form.contact_phone}
                onPrefixChange={(v) => setForm({ ...form, contact_phone_prefix: v })}
                onNumberChange={(v) => setForm({ ...form, contact_phone: v })}
                testIdPrefix="ecosystem-phone"
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Country</div>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
              >
                <option value="TZ">Tanzania</option>
                <option value="KE">Kenya</option>
                <option value="UG">Uganda</option>
                <option value="RW">Rwanda</option>
              </select>
            </label>
          </div>

          {/* Service Partner Fields */}
          {(form.partner_type === "service" || form.partner_type === "hybrid") && (
            <div className="space-y-4">
              <PartnerSpecificServicesField
                value={form.specific_services_csv}
                onChange={(v) => setForm({ ...form, specific_services_csv: v })}
              />
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Service Partner Note:</strong> Service partners are capability-based. No SKU, no inventory fields needed. 
                    Pricing is handled via quotes and job assignments.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Partner Fields */}
          {(form.partner_type === "product" || form.partner_type === "hybrid") && (
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-800">Product Partner Settings</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Product catalog, SKUs, and inventory are managed separately in the Partner Catalog module.
                    Quantity is tracked per product line, not as a global partner quantity.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operations */}
          <div className="grid lg:grid-cols-2 gap-6">
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Lead Time (Days)</div>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                min="1"
                value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 1 })}
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Settlement Terms</div>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.settlement_terms}
                onChange={(e) => setForm({ ...form, settlement_terms: e.target.value })}
              >
                <option value="net_7">Net 7</option>
                <option value="net_14">Net 14</option>
                <option value="net_30">Net 30</option>
                <option value="net_60">Net 60</option>
                <option value="cod">COD</option>
              </select>
            </label>
          </div>

          {/* Notes */}
          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Notes</div>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px]"
              placeholder="Internal notes about this partner..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 rounded-xl border font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.email}
              className="px-6 py-3 rounded-xl bg-[#20364D] text-white font-medium hover:bg-[#2a4a66] transition disabled:opacity-50"
              data-testid="save-partner-btn"
            >
              {saving ? "Saving..." : "Save Partner"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            className="w-full border rounded-xl pl-12 pr-4 py-3"
            placeholder="Search partners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-partners"
          />
        </div>
        <select
          className="border rounded-xl px-4 py-3"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          data-testid="filter-type"
        >
          <option value="all">All Types</option>
          <option value="service">Service Partners</option>
          <option value="product">Product Partners</option>
          <option value="hybrid">Hybrid Partners</option>
        </select>
        <select
          className="border rounded-xl px-4 py-3"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          data-testid="filter-status"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Partners List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading partners...</div>
      ) : filteredPartners.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No partners found. {!showForm && "Click 'Add Partner' to create one."}
        </div>
      ) : view === "table" ? (
        <div className="rounded-[2rem] border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-5 py-4">Partner</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Country</th>
                  <th className="px-5 py-4">Services / Capabilities</th>
                  <th className="px-5 py-4">Lead Time</th>
                  <th className="px-5 py-4">Jobs</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="border-t hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#20364D]">{partner.name}</div>
                      <div className="text-sm text-slate-500">{partner.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        partner.partner_type === "service" ? "bg-amber-50 text-amber-700" :
                        partner.partner_type === "product" ? "bg-blue-50 text-blue-700" :
                        "bg-purple-50 text-purple-700"
                      }`}>
                        {partner.partner_type === "service" ? <Wrench className="w-3 h-3" /> :
                         partner.partner_type === "product" ? <Package className="w-3 h-3" /> :
                         <RefreshCcw className="w-3 h-3" />}
                        {partner.partner_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {partner.country_code}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <div className="text-sm text-slate-600 truncate">
                        {(partner.specific_services || []).join(", ") || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {partner.lead_time_days || 3} days
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm">
                        <span className="font-medium text-[#20364D]">{partner.completed_jobs || 0}</span>
                        <span className="text-slate-400"> / {partner.total_jobs || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[partner.status] || STATUS_COLORS.active}`}>
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/admin/partners/${partner.id}`}
                        className="text-sm font-medium text-[#D4A843] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPartners.map((partner) => (
            <div key={partner.id} className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-xl font-bold text-[#20364D]">{partner.name}</div>
                  <div className="text-sm text-slate-500 mt-1">{partner.email}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[partner.status] || STATUS_COLORS.active}`}>
                  {partner.status}
                </span>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  partner.partner_type === "service" ? "bg-amber-50 text-amber-700" :
                  partner.partner_type === "product" ? "bg-blue-50 text-blue-700" :
                  "bg-purple-50 text-purple-700"
                }`}>
                  {partner.partner_type === "service" ? <Wrench className="w-3 h-3" /> :
                   partner.partner_type === "product" ? <Package className="w-3 h-3" /> :
                   <RefreshCcw className="w-3 h-3" />}
                  {partner.partner_type}
                </span>
                <span className="text-sm text-slate-500">{partner.country_code}</span>
              </div>

              {partner.specific_services?.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-3 mb-4">
                  <div className="text-xs text-slate-500 mb-1">Services</div>
                  <div className="text-sm text-slate-700">{partner.specific_services.join(", ")}</div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {partner.lead_time_days || 3}d
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {partner.completed_jobs || 0}/{partner.total_jobs || 0} jobs
                  </span>
                </div>
                <Link
                  to={`/admin/partners/${partner.id}`}
                  className="flex items-center gap-1 text-sm font-medium text-[#D4A843] hover:underline"
                >
                  View <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
