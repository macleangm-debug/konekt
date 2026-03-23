import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import PartnerViewToggle from "../../components/partners/PartnerViewToggle";
import PartnerSmartForm from "../../components/partners/PartnerSmartForm";
import PartnerUnifiedTable from "../../components/partners/PartnerUnifiedTable";
import PartnerUnifiedCards from "../../components/partners/PartnerUnifiedCards";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const INITIAL_FORM = {
  name: "",
  partner_type: "service",
  country_code: "TZ",
  status: "active",
  contact_person: "",
  email: "",
  phone: "",
  region_coverage: "",
  service_groups_csv: "",
  specific_services_csv: "",
  product_categories_csv: "",
  routing_priority: "high",
  quality_score: 8,
  success_rate: 90,
  turnaround_days: 3,
  preferred_partner: false,
  temporarily_unavailable: false,
  active_jobs: 0,
  completed_jobs: 0,
  overdue_jobs: 0,
  last_update: "—",
};

export default function PartnerEcosystemUnifiedPage() {
  const [view, setView] = useState("table");
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [stats, setStats] = useState({ total_partners: 0, active_partners: 0, by_type: {} });

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
        // Transform data for display
        const transformed = data.map(p => ({
          ...p,
          specific_services: p.specific_services || [],
          routing_priority: p.routing_priority || "medium",
          quality_score: p.quality_score || 8,
          turnaround_days: p.lead_time_days || 3,
        }));
        setPartners(transformed);
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
    if (!form.name || !form.email) {
      alert("Please fill in Partner Name and Email");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        partner_type: form.partner_type,
        country_code: form.country_code,
        regions: form.region_coverage ? form.region_coverage.split(",").map(s => s.trim()) : [],
        specific_services: form.specific_services_csv ? form.specific_services_csv.split(",").map(s => s.trim()) : [],
        contact_phone: form.phone,
        lead_time_days: parseInt(form.turnaround_days) || 3,
        settlement_terms: "net_30",
        notes: form.contact_person ? `Contact: ${form.contact_person}` : "",
        routing_priority: form.routing_priority,
        quality_score: parseFloat(form.quality_score) || 8,
      };

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
        setForm(INITIAL_FORM);
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
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [partners, filterType, searchQuery]);

  return (
    <div className="space-y-8" data-testid="partner-ecosystem-unified">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-4xl font-bold text-[#20364D]">Partner Ecosystem</div>
          <div className="text-slate-600 mt-2">
            One unified page for partner setup, capabilities, routing, and performance.
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
        <div className="space-y-6">
          <PartnerSmartForm form={form} setForm={setForm} />
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={() => { setShowForm(false); setForm(INITIAL_FORM); }}
              className="px-6 py-3 rounded-xl border font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
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
      </div>

      {/* Partners List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading partners...</div>
      ) : (
        view === "table" ? (
          <PartnerUnifiedTable rows={filteredPartners} />
        ) : (
          <PartnerUnifiedCards rows={filteredPartners} />
        )
      )}

      {/* Deprecation Note */}
      <div className="rounded-[2rem] border bg-amber-50 text-amber-900 p-6">
        <div className="font-bold">Deprecation Note</div>
        <div className="mt-2 text-sm leading-6">
          To avoid admin confusion, remove old fragmented partner pages from navigation and use this Partner Ecosystem page as the single source of truth.
          <ul className="mt-3 list-disc list-inside space-y-1">
            <li>Old partner catalog settings page → use this page</li>
            <li>Separate partner capability mapping page → use Capabilities section above</li>
            <li>Separate partner routing page → use Routing & Selection Rules section above</li>
            <li>Separate partner priority page → use Routing Priority dropdown above</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
