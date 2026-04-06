import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { formatDateDMY } from "../../lib/formatters";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import EmptyState from "../../components/admin/shared/EmptyState";
import CustomerLinkCell from "@/components/customers/CustomerLinkCell";
import StandardDrawerShell from "@/components/ui/StandardDrawerShell";
import { Inbox, ArrowRightCircle, Search, Filter, ExternalLink } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const TYPE_BADGES = {
  contact_general: { label: "Contact", cls: "bg-blue-100 text-blue-700" },
  service_quote: { label: "Service Quote", cls: "bg-teal-100 text-teal-700" },
  business_pricing: { label: "Business Pricing", cls: "bg-purple-100 text-purple-700" },
  product_bulk: { label: "Product Bulk", cls: "bg-amber-100 text-amber-700" },
  promo_custom: { label: "Promo Custom", cls: "bg-pink-100 text-pink-700" },
  promo_sample: { label: "Promo Sample", cls: "bg-rose-100 text-rose-700" },
  marketplace_order: { label: "Marketplace Order", cls: "bg-emerald-100 text-emerald-700" },
};

const STATUS_OPTIONS = ["All", "submitted", "in_review", "converted_to_lead", "quoted", "closed"];

export default function AdminRequestsInboxPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [converting, setConverting] = useState(false);

  const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/requests`, { headers });
      let data = Array.isArray(res.data) ? res.data : [];
      if (typeFilter) data = data.filter((r) => r.request_type === typeFilter);
      if (search) {
        const q = search.toLowerCase();
        data = data.filter((r) =>
          (r.guest_name || "").toLowerCase().includes(q) ||
          (r.guest_email || "").toLowerCase().includes(q) ||
          (r.request_number || "").toLowerCase().includes(q) ||
          (r.company_name || "").toLowerCase().includes(q) ||
          (r.title || "").toLowerCase().includes(q)
        );
      }
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const convertToLead = async (requestId) => {
    setConverting(true);
    try {
      await axios.post(`${API}/api/admin/requests/${requestId}/convert-to-lead`, {}, { headers });
      load();
      setSelected(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to convert");
    } finally {
      setConverting(false);
    }
  };

  const typeBadge = (type) => {
    const cfg = TYPE_BADGES[type] || { label: (type || "unknown").replace(/_/g, " "), cls: "bg-slate-100 text-slate-600" };
    return <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
  };

  return (
    <div data-testid="admin-requests-inbox">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Requests Inbox</h1>
        <p className="text-slate-500 text-sm mt-1">All public intake submissions — contact, quotes, business pricing, promo requests.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, reference..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            data-testid="requests-search"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="pl-10 pr-6 py-2.5 border border-slate-200 rounded-xl text-sm bg-white appearance-none"
            data-testid="requests-type-filter"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_BADGES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading requests...</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title="No requests yet" description="Public submissions will appear here." />
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <table className="w-full text-sm" data-testid="requests-table">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-slate-50 cursor-pointer transition"
                  onClick={() => setSelected(r)}
                  data-testid={`request-row-${r.id}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateDMY(r.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.request_number || "-"}</td>
                  <td className="px-4 py-3">
                    {r.customer_id ? (
                      <CustomerLinkCell customerId={r.customer_id} customerName={r.guest_name || r.company_name} />
                    ) : (
                      <div>
                        <div className="font-medium">{r.guest_name || "-"}</div>
                        <div className="text-xs text-slate-400">{r.guest_email || "-"}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.company_name || "-"}</td>
                  <td className="px-4 py-3">{typeBadge(r.request_type)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status || r.crm_stage || "submitted"} />
                  </td>
                  <td className="px-4 py-3 text-xs">{r.phone || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    {!r.linked_lead_id ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); convertToLead(r.id); }}
                        disabled={converting}
                        className="text-xs text-[#20364D] hover:underline font-medium inline-flex items-center gap-1"
                        data-testid={`convert-lead-${r.id}`}
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                        To Lead
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Lead created</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <StandardDrawerShell open={!!selected} onClose={() => setSelected(null)} title="Request Detail" subtitle={selected.request_number || "Request"}>
            <div className="space-y-4 text-sm">
              <Row label="Reference" value={selected.request_number} />
              <Row label="Type" value={typeBadge(selected.request_type)} />
              <Row label="Status" value={<StatusBadge status={selected.status || "submitted"} />} />
              <Row label="CRM Stage" value={selected.crm_stage || "-"} />
              <Row label="Date" value={formatDateDMY(selected.created_at)} />
              <hr />
              <Row label="Name" value={selected.guest_name || "-"} />
              <Row label="Email" value={selected.guest_email || "-"} />
              <Row label="Company" value={selected.company_name || "-"} />
              <Row label="Phone" value={selected.phone || "-"} />
              <hr />
              <Row label="Title" value={selected.title || "-"} />
              <Row label="Service" value={selected.service_name || "-"} />
              <Row label="Budget" value={selected.budget_amount ? `TZS ${Number(selected.budget_amount).toLocaleString()}` : "-"} />
              <Row label="Source" value={selected.source_page || selected.source_channel || "-"} />
              {selected.notes && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Notes / Message</div>
                  <div className="bg-slate-50 p-3 rounded-xl text-slate-700 whitespace-pre-wrap">{selected.notes}</div>
                </div>
              )}
              {selected.details && Object.keys(selected.details).length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Details</div>
                  <div className="bg-slate-50 p-3 rounded-xl text-xs font-mono">{JSON.stringify(selected.details, null, 2)}</div>
                </div>
              )}
              {!selected.linked_lead_id && (
                <button
                  onClick={() => convertToLead(selected.id)}
                  disabled={converting}
                  className="w-full rounded-xl bg-[#20364D] text-white py-3 font-semibold mt-4 hover:bg-[#17283c] transition"
                  data-testid="convert-lead-btn"
                >
                  {converting ? "Converting..." : "Convert to Lead"}
                </button>
              )}
              {selected.linked_lead_id && (
                <div className="space-y-3 mt-4">
                  <div className="text-center text-green-600 font-medium py-1">Already converted to lead</div>
                  <button
                    onClick={() => navigate(`/admin/crm?openLead=${selected.linked_lead_id}`)}
                    className="w-full rounded-xl bg-[#D4A843] text-[#2D3E50] py-3 font-semibold hover:bg-[#c49933] transition inline-flex items-center justify-center gap-2"
                    data-testid="open-in-crm-btn"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in CRM
                  </button>
                </div>
              )}
            </div>
        </StandardDrawerShell>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-slate-500 text-xs whitespace-nowrap">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
