import React, { useEffect, useState, useCallback } from "react";
import {
  Package, Users, FileText, Loader2, Search, Plus,
  Image as ImageIcon, CheckCircle, Clock, AlertTriangle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import api from "../../lib/api";

const TABS = [
  { key: "vendors", label: "Vendors", icon: Users },
  { key: "products", label: "Products", icon: Package },
  { key: "requests", label: "Price Requests", icon: FileText },
];

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  pending_review: "bg-amber-100 text-amber-700",
  pending_vendor_response: "bg-amber-100 text-amber-700",
  response_received: "bg-blue-100 text-blue-700",
  ready_for_sales: "bg-emerald-100 text-emerald-700",
  quoted_to_customer: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-600",
};

function money(v) { return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`; }

export default function VendorOpsPage() {
  const [tab, setTab] = useState("products");
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/vendor-ops/dashboard-stats")
      .then((res) => setStats(res.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="vendor-ops-page">
      <div>
        <h1 className="text-xl font-bold text-[#20364D]">Vendor Operations</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage vendors, products, and price requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="ops-stats">
        <StatCard label="Vendors" value={stats.total_vendors || 0} color="text-blue-600" />
        <StatCard label="Products" value={stats.total_products || 0} color="text-slate-700" />
        <StatCard label="Active" value={stats.active_products || 0} color="text-emerald-600" />
        <StatCard label="Drafts" value={stats.draft_products || 0} color="text-amber-600" />
        <StatCard label="Pending Requests" value={stats.pending_price_requests || 0} color="text-red-600" />
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition ${tab === t.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`tab-${t.key}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "vendors" && <VendorsTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "requests" && <PriceRequestsTab />}
    </div>
  );
}

function VendorsTab() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/vendor-ops/vendors")
      .then((res) => setVendors(res.data?.vendors || []))
      .catch(() => toast.error("Failed to load vendors"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="vendors-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Vendor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Contact</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400">No vendors found</td></tr>
            ) : vendors.map((v, i) => (
              <tr key={v.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#20364D]">{v.company_name || v.name || v.full_name || "Unknown"}</div>
                  <div className="text-[10px] text-slate-400">{v.email || ""}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{v.type || v.vendor_type || v.capability_type || "General"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{v.phone || v.contact_phone || ""}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={`${STATUS_STYLES[v.status] || "bg-slate-100 text-slate-500"} capitalize`}>{v.status || "active"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-xs text-slate-400 border-t">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""}</div>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/vendor-ops/products" : `/api/vendor-ops/products?status=${filter}`;
      const res = await api.get(url);
      setProducts(res.data?.products || []);
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) =>
    !search || [p.name, p.vendor_name, p.category].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border bg-white overflow-hidden">
          {["all", "active", "draft", "pending_review"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-semibold capitalize ${filter === f ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`filter-${f}`}>
              {f === "all" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Button size="sm" className="bg-[#20364D] hover:bg-[#1a2d40] ml-auto" onClick={() => window.location.href = "/admin/vendor-ops/new-product"} data-testid="new-product-btn">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Product
        </Button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl border overflow-hidden" data-testid="products-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Vendor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Images</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No products</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" data-testid={`product-row-${p.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                        </div>
                        <div>
                          <div className="font-medium text-[#20364D] truncate max-w-[200px]">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.category || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.vendor_name || "\u2014"}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium">{money(p.selling_price)}</td>
                    <td className="px-4 py-3 text-right text-xs">{p.stock || 0}{p.has_variants ? " (variants)" : ""}</td>
                    <td className="px-4 py-3 text-center">
                      {(p.images || []).length > 0 ? (
                        <span className="text-[10px] font-medium text-emerald-600">{(p.images || []).length} img</span>
                      ) : (
                        <span className="text-[10px] text-red-500">No images</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${STATUS_STYLES[p.status] || "bg-slate-100 text-slate-500"} capitalize`}>{p.status || "draft"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-slate-400 border-t">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}

function PriceRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/vendor-ops/price-requests")
      .then((res) => setRequests(res.data?.price_requests || []))
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="price-requests-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Request</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Requested By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Base Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Lead Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Updated By</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" /><p>No price requests yet</p></td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`request-row-${r.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#20364D]">{r.product_or_service || "Unnamed"}</div>
                  <div className="text-[10px] text-slate-400">{r.id?.slice(0, 8)}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{r.requested_by || "\u2014"}<br /><span className="text-[10px] text-slate-400">{r.requested_by_role || ""}</span></td>
                <td className="px-4 py-3 text-xs font-medium">{r.base_price != null ? money(r.base_price) : "\u2014"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{r.lead_time || "\u2014"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{r.updated_by_role || "\u2014"}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={`${STATUS_STYLES[r.status] || "bg-slate-100 text-slate-500"} capitalize text-[10px]`}>{(r.status || "").replace(/_/g, " ")}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-xs text-slate-400 border-t">{requests.length} request{requests.length !== 1 ? "s" : ""}</div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white border rounded-xl p-3 text-center">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function LoadingSpinner() {
  return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
}
