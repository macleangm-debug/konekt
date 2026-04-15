import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Users, FileText, Loader2, Search, Plus,
  Image as ImageIcon, CheckCircle, Clock, AlertTriangle,
  Eye, EyeOff, Edit3, MoreHorizontal, MessageSquare
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
  new: "bg-amber-100 text-amber-700",
  pending_vendor_response: "bg-amber-100 text-amber-700",
  sent_to_vendors: "bg-blue-100 text-blue-700",
  awaiting_quotes: "bg-blue-100 text-blue-700",
  partially_quoted: "bg-violet-100 text-violet-700",
  response_received: "bg-cyan-100 text-cyan-700",
  ready_for_sales: "bg-emerald-100 text-emerald-700",
  quoted_to_customer: "bg-teal-100 text-teal-700",
  expired: "bg-red-100 text-red-600",
  closed: "bg-slate-200 text-slate-600",
};

function money(v) { return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`; }

export default function VendorOpsPage() {
  const navigate = useNavigate();
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
        <StatCard label="Awaiting Quotes" value={stats.awaiting_quotes || 0} color="text-blue-600" />
        <StatCard label="New Requests" value={stats.pending_price_requests || 0} color="text-amber-600" />
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
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState(null);

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

  const togglePublish = async (product) => {
    setToggling(product.id);
    try {
      const newStatus = product.status === "active" ? "draft" : "active";
      await api.put(`/api/vendor-ops/products/${product.id}`, { status: newStatus });
      toast.success(newStatus === "active" ? "Product published" : "Product unpublished");
      load();
    } catch { toast.error("Failed to update status"); }
    setToggling(null);
  };

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
        <Button size="sm" className="bg-[#20364D] hover:bg-[#1a2d40] ml-auto" onClick={() => navigate("/admin/vendor-ops/new-product")} data-testid="new-product-btn">
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
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">No products</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`product-row-${p.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                        </div>
                        <div>
                          <div className="font-medium text-[#20364D] truncate max-w-[200px]">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.category || ""} {p.unit_of_measurement ? `\u2022 ${p.unit_of_measurement}` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.vendor_name || "\u2014"}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium">{money(p.selling_price)}</td>
                    <td className="px-4 py-3 text-right text-xs">{p.stock || 0}{p.has_variants ? " (variants)" : ""} <span className="text-slate-400">{p.unit_of_measurement || ""}</span></td>
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
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => togglePublish(p)}
                          disabled={toggling === p.id}
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500 hover:text-[#20364D]"
                          title={p.status === "active" ? "Unpublish" : "Publish"}
                          data-testid={`toggle-publish-${p.id}`}
                        >
                          {p.status === "active" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
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
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("new");
  const [stats, setStats] = useState({});
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, vRes, sRes] = await Promise.all([
        api.get(`/api/vendor-ops/price-requests?tab=${subTab}`),
        api.get("/api/vendor-ops/vendors").catch(() => ({ data: { vendors: [] } })),
        api.get("/api/vendor-ops/price-requests/stats").catch(() => ({ data: {} })),
      ]);
      setRequests(rRes.data?.price_requests || []);
      setVendors(vRes.data?.vendors || []);
      setStats(sRes.data || {});
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }, [subTab]);

  useEffect(() => { load(); }, [load]);

  if (detail) return <RequestDetail pr={detail} vendors={vendors} onBack={() => { setDetail(null); load(); }} />;

  const SUB_TABS = [
    { key: "new", label: "New", count: stats.new || 0, color: "text-amber-600" },
    { key: "awaiting", label: "Awaiting Quotes", count: stats.awaiting || 0, color: "text-blue-600" },
    { key: "ready", label: "Ready for Sales", count: stats.ready || 0, color: "text-emerald-600" },
    { key: "closed", label: "Closed", count: 0, color: "text-slate-500" },
  ];

  return (
    <div className="space-y-4" data-testid="price-requests-section">
      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="New" value={stats.new || 0} color="text-amber-600" />
        <StatCard label="Awaiting Quotes" value={stats.awaiting || 0} color="text-blue-600" />
        <StatCard label="Ready for Sales" value={stats.ready || 0} color="text-emerald-600" />
        <StatCard label="Overdue" value={stats.overdue || 0} color="text-red-600" />
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border bg-white overflow-hidden">
          {SUB_TABS.map((t) => (
            <button key={t.key} onClick={() => setSubTab(t.key)} className={`px-3 py-2 text-xs font-semibold transition ${subTab === t.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`pr-tab-${t.key}`}>
              {t.label} {t.count > 0 && <span className="ml-1 text-[10px] opacity-70">({t.count})</span>}
            </button>
          ))}
        </div>
        <Button size="sm" className="bg-[#20364D] hover:bg-[#1a2d40] ml-auto" onClick={() => setDetail({ _new: true })} data-testid="new-request-btn">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Request
        </Button>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl border overflow-hidden" data-testid="price-requests-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Request</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Mode</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Quotes</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Best Price</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" /><p>No requests in this tab</p></td></tr>
                ) : requests.map((r) => {
                  const quotes = r.vendor_quotes || [];
                  const quotedCount = quotes.filter((q) => q.status === "quoted").length;
                  const bestPrice = quotes.filter((q) => q.base_price != null).sort((a, b) => a.base_price - b.base_price)[0]?.base_price;
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`request-row-${r.id}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#20364D]">{r.product_or_service || "Unnamed"}</div>
                        <div className="text-[10px] text-slate-400">{r.id?.slice(0, 8)} {r.quantity > 1 ? `\u2022 ${r.quantity} ${r.unit_of_measurement || ""}` : ""}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{r.category || "\u2014"}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] ${r.sourcing_mode === "competitive" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                          {r.sourcing_mode === "competitive" ? "Competitive" : "Preferred"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">{quotedCount}/{quotes.length || 0}</td>
                      <td className="px-4 py-3 text-right text-xs font-medium">
                        {r.final_sell_price ? money(r.final_sell_price) : bestPrice != null ? <span className="text-slate-400">{money(bestPrice)}</span> : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`${STATUS_STYLES[r.status] || "bg-slate-100 text-slate-500"} capitalize text-[10px]`}>{(r.status || "").replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setDetail(r)} className="px-2.5 py-1 rounded-lg bg-[#20364D] text-white text-[10px] font-semibold hover:bg-[#1a2d40] transition" data-testid={`open-request-${r.id}`}>
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-slate-400 border-t">{requests.length} request{requests.length !== 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}

/* ═══ REQUEST DETAIL VIEW ═══ */
function RequestDetail({ pr, vendors, onBack }) {
  const [request, setRequest] = useState(pr);
  const [saving, setSaving] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ vendor_id: "", base_price: "", lead_time: "", notes: "" });
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const isNew = request._new;

  // New request form
  const [newForm, setNewForm] = useState({ product_or_service: "", category: "", description: "", quantity: 1, unit_of_measurement: "Piece", notes: "" });

  const createRequest = async () => {
    setSaving(true);
    try {
      const res = await api.post("/api/vendor-ops/price-requests", newForm);
      setRequest(res.data.price_request);
      toast.success("Request created");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const sendToVendors = async () => {
    if (!selectedVendors.length) { toast.error("Select at least one vendor"); return; }
    setSaving(true);
    try {
      await api.post(`/api/vendor-ops/price-requests/${request.id}/send-to-vendors`, { vendor_ids: selectedVendors });
      toast.success("Sent to vendors");
      const res = await api.get(`/api/vendor-ops/price-requests/${request.id}`);
      setRequest(res.data.price_request);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const submitQuote = async () => {
    if (!quoteForm.vendor_id || !quoteForm.base_price) { toast.error("Vendor and price required"); return; }
    setSaving(true);
    try {
      await api.post(`/api/vendor-ops/price-requests/${request.id}/submit-quote`, quoteForm);
      toast.success("Quote submitted");
      const res = await api.get(`/api/vendor-ops/price-requests/${request.id}`);
      setRequest(res.data.price_request);
      setShowQuoteForm(false);
      setQuoteForm({ vendor_id: "", base_price: "", lead_time: "", notes: "" });
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const selectVendor = async (vendorId, idx) => {
    setSaving(true);
    try {
      const res = await api.post(`/api/vendor-ops/price-requests/${request.id}/select-vendor`, { vendor_id: vendorId, quote_index: idx });
      toast.success(`Selected! Sell price: ${money(res.data.sell_price)}`);
      const detail = await api.get(`/api/vendor-ops/price-requests/${request.id}`);
      setRequest(detail.data.price_request);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const quotes = request.vendor_quotes || [];
  const quotedQuotes = quotes.filter((q) => q.base_price != null).sort((a, b) => a.base_price - b.base_price);
  const bestQuote = quotedQuotes[0];

  if (isNew && !request.id) {
    return (
      <div className="space-y-4" data-testid="new-request-form">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
          <h2 className="text-lg font-bold text-[#20364D]">New Price Request</h2>
        </div>
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Product/Service *</label><Input value={newForm.product_or_service} onChange={(e) => setNewForm({ ...newForm, product_or_service: e.target.value })} placeholder="e.g. HP LaserJet Toner" data-testid="nr-product" /></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Category</label><Input value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })} placeholder="e.g. Office Equipment" data-testid="nr-category" /></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Quantity</label><Input type="number" value={newForm.quantity} onChange={(e) => setNewForm({ ...newForm, quantity: parseInt(e.target.value) || 1 })} data-testid="nr-quantity" /></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Unit</label><Input value={newForm.unit_of_measurement} onChange={(e) => setNewForm({ ...newForm, unit_of_measurement: e.target.value })} data-testid="nr-unit" /></div>
          </div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">Description / Notes</label><Input value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} placeholder="Any details for vendors" data-testid="nr-notes" /></div>
          <Button className="bg-[#20364D] hover:bg-[#1a2d40]" onClick={createRequest} disabled={saving || !newForm.product_or_service} data-testid="create-request-btn">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Create Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="request-detail">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="back-btn"><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h2 className="text-lg font-bold text-[#20364D]">{request.product_or_service}</h2>
          <p className="text-xs text-slate-400">{request.id?.slice(0, 8)} \u2022 {request.category || "No category"} \u2022 {request.quantity || 1} {request.unit_of_measurement || "Piece"}s</p>
        </div>
        <Badge className={`ml-auto ${STATUS_STYLES[request.status] || "bg-slate-100 text-slate-500"} capitalize`}>{(request.status || "").replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Block 1: Request Summary */}
        <div className="bg-white rounded-xl border p-4 space-y-3" data-testid="request-summary">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Request Summary</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Requested by</span><span className="font-medium">{request.requested_by_name || request.requested_by_role || "Sales"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mode</span><Badge className={`text-[10px] ${request.sourcing_mode === "competitive" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{request.sourcing_mode === "competitive" ? "Competitive" : "Preferred"}</Badge></div>
            <div className="flex justify-between"><span className="text-slate-500">Quote expiry</span><span>{request.default_quote_expiry_hours || 48}h</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Lead time default</span><span>{request.default_lead_time_days || 3}d</span></div>
          </div>
          {request.notes_from_sales && <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600"><span className="font-semibold">Sales notes:</span> {request.notes_from_sales}</div>}
        </div>

        {/* Block 2: Vendor Selection + Send */}
        <div className="bg-white rounded-xl border p-4 space-y-3" data-testid="vendor-selection">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Send to Vendors</h3>
          {["new", "pending_vendor_response"].includes(request.status) ? (
            <div className="space-y-2">
              <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                {vendors.map((v) => {
                  const vid = v.id || v._id;
                  const checked = selectedVendors.includes(vid);
                  return (
                    <label key={vid} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${checked ? "border-[#D4A843] bg-[#D4A843]/5" : "border-slate-100 hover:border-slate-200"}`}>
                      <input type="checkbox" checked={checked} onChange={() => setSelectedVendors(checked ? selectedVendors.filter((x) => x !== vid) : [...selectedVendors, vid])} className="rounded" />
                      <div className="text-xs"><div className="font-medium">{v.company_name || v.name || "Unnamed"}</div><div className="text-slate-400">{v.type || "vendor"}</div></div>
                    </label>
                  );
                })}
                {vendors.length === 0 && <p className="text-xs text-slate-400">No vendors available</p>}
              </div>
              <Button size="sm" className="w-full bg-[#20364D] hover:bg-[#1a2d40]" onClick={sendToVendors} disabled={saving || !selectedVendors.length} data-testid="send-to-vendors-btn">
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5 mr-1" />} Send to {selectedVendors.length} Vendor{selectedVendors.length !== 1 ? "s" : ""}
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500">{quotes.length} vendor{quotes.length !== 1 ? "s" : ""} contacted</p>
              {quotes.map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${q.status === "quoted" ? "bg-emerald-500" : q.status === "declined" ? "bg-red-500" : "bg-amber-400"}`} />
                  <span className="font-medium">{q.vendor_name}</span>
                  <span className="text-slate-400 ml-auto">{q.status === "quoted" ? money(q.base_price) : q.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block 3: Quote Entry + Comparison */}
        <div className="bg-white rounded-xl border p-4 space-y-3" data-testid="quote-comparison">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Vendor Quotes</h3>
            {request.status !== "new" && (
              <button onClick={() => setShowQuoteForm(!showQuoteForm)} className="text-[10px] font-semibold text-[#D4A843] hover:underline" data-testid="enter-quote-toggle">
                {showQuoteForm ? "Cancel" : "+ Enter Quote"}
              </button>
            )}
          </div>

          {showQuoteForm && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-2" data-testid="quote-entry-form">
              <select value={quoteForm.vendor_id} onChange={(e) => setQuoteForm({ ...quoteForm, vendor_id: e.target.value })} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white" data-testid="qf-vendor">
                <option value="">Select vendor</option>
                {quotes.map((q) => <option key={q.vendor_id} value={q.vendor_id}>{q.vendor_name}</option>)}
                {vendors.filter((v) => !quotes.find((q) => q.vendor_id === (v.id || v._id))).map((v) => <option key={v.id || v._id} value={v.id || v._id}>{v.company_name || v.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Base Price" className="h-8 text-xs" value={quoteForm.base_price} onChange={(e) => setQuoteForm({ ...quoteForm, base_price: e.target.value })} data-testid="qf-price" />
                <Input placeholder="Lead time" className="h-8 text-xs" value={quoteForm.lead_time} onChange={(e) => setQuoteForm({ ...quoteForm, lead_time: e.target.value })} data-testid="qf-lead" />
              </div>
              <Input placeholder="Notes" className="h-8 text-xs" value={quoteForm.notes} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} data-testid="qf-notes" />
              <Button size="sm" className="w-full bg-[#D4A843] hover:bg-[#c49a38] text-[#17283C]" onClick={submitQuote} disabled={saving} data-testid="submit-quote-btn">Submit Quote</Button>
            </div>
          )}

          {/* Comparison */}
          {quotedQuotes.length > 0 ? (
            <div className="space-y-2">
              {quotedQuotes.map((q, i) => {
                const isBest = q === bestQuote;
                const isSelected = request.selected_vendor_id === q.vendor_id;
                return (
                  <div key={i} className={`rounded-lg border p-2.5 transition ${isSelected ? "border-emerald-500 bg-emerald-50" : isBest ? "border-[#D4A843] bg-[#D4A843]/5" : "border-slate-100"}`} data-testid={`quote-card-${i}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-[#20364D]">{q.vendor_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{q.lead_time || "No lead time"} {q.notes ? `\u2022 ${q.notes}` : ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#20364D]">{money(q.base_price)}</div>
                        {isBest && !isSelected && <span className="text-[9px] font-bold text-[#D4A843]">BEST PRICE</span>}
                        {isSelected && <span className="text-[9px] font-bold text-emerald-600">SELECTED</span>}
                      </div>
                    </div>
                    {!isSelected && request.status !== "ready_for_sales" && (
                      <button onClick={() => selectVendor(q.vendor_id, i)} disabled={saving} className="mt-2 w-full text-center py-1.5 rounded-lg bg-[#20364D] text-white text-[10px] font-semibold hover:bg-[#1a2d40] transition" data-testid={`select-vendor-${i}`}>
                        Select This Vendor
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No quotes yet</p>
          )}

          {/* Final Output */}
          {request.status === "ready_for_sales" && request.final_sell_price && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1" data-testid="final-output">
              <div className="text-[10px] font-bold text-emerald-700 uppercase">Ready for Sales</div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">Base Price</span><span className="font-medium">{money(request.final_base_price)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-600 font-semibold">Sell Price</span><span className="font-bold text-emerald-700">{money(request.final_sell_price)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">Lead Time</span><span>{request.final_lead_time || "TBD"}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ SHARED COMPONENTS ═══ */
function ArrowLeft(props) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>; }

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
