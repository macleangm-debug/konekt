import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Users, FileText, Loader2, Search, Plus, ShoppingCart,
  Image as ImageIcon, CheckCircle, CheckCircle2, Clock, AlertTriangle,
  Eye, EyeOff, Edit3, MoreHorizontal, MessageSquare, Send, ArrowLeft, Check
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import api from "../../lib/api";

const TABS = [
  { key: "requests", label: "Quote Requests", icon: FileText },
  { key: "orders", label: "Orders / Fulfillment", icon: ShoppingCart },
  { key: "vendors", label: "Vendors", icon: Users },
  { key: "products", label: "Products", icon: Package },
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

// Plain-language status labels so Ops staff don't need a glossary
const STATUS_LABELS = {
  new: "New",
  pending_vendor_response: "New",
  sent_to_vendors: "Waiting for vendors",
  awaiting_quotes: "Waiting for vendors",
  partially_quoted: "Some vendors responded",
  response_received: "All quotes in",
  ready_for_sales: "Ready for customer",
  quoted_to_customer: "Sent to customer",
  expired: "Expired",
  closed: "Closed",
};
const prettyStatus = (s) => STATUS_LABELS[s] || (s || "").replace(/_/g, " ");

function money(v) { return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`; }

export default function VendorOpsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("requests");
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
        <h1 className="text-xl font-bold text-[#20364D]">Operations</h1>
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
      {tab === "orders" && <OrdersFulfillmentTab />}
    </div>
  );
}

function VendorsTab() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    api.get("/api/vendor-ops/vendors")
      .then((res) => setVendors(res.data?.vendors || []))
      .catch(() => toast.error("Failed to load vendors"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-blue-200 p-3 text-center"><p className="text-[10px] font-semibold text-slate-500 uppercase">Total Vendors</p><p className="text-xl font-bold text-blue-600 mt-0.5">{vendors.length}</p></div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3 text-center"><p className="text-[10px] font-semibold text-slate-500 uppercase">Active</p><p className="text-xl font-bold text-emerald-600 mt-0.5">{vendors.filter((v) => v.status === "active").length}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center"><p className="text-[10px] font-semibold text-slate-500 uppercase">Types</p><p className="text-xl font-bold text-slate-600 mt-0.5">{new Set(vendors.map((v) => v.type || "vendor")).size}</p></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Vendors Table */}
        <div className={`bg-white rounded-xl border overflow-hidden ${selectedVendor ? "lg:col-span-2" : "lg:col-span-3"}`} data-testid="vendors-table">
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
                  <tr key={v.id || i} className={`border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer ${selectedVendor?.id === v.id ? "bg-[#D4A843]/5" : ""}`} onClick={() => setSelectedVendor(v)} data-testid={`vendor-row-${i}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#20364D]">{v.company_name || v.name || v.full_name || "Unknown"}</div>
                      <div className="text-[10px] text-slate-400">{v.email || ""}</div>
                    </td>
                    <td className="px-4 py-3"><Badge className="text-[10px] bg-slate-100 text-slate-600 capitalize">{v.type || "vendor"}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{v.phone || v.contact_phone || "\u2014"}</td>
                    <td className="px-4 py-3 text-center"><Badge className={`${STATUS_STYLES[v.status] || "bg-emerald-100 text-emerald-700"} capitalize text-[10px]`}>{v.status || "active"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-slate-400 border-t">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Vendor Drawer */}
        {selectedVendor && (
          <div className="bg-white rounded-xl border p-4 space-y-4" data-testid="vendor-drawer">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#20364D]">{selectedVendor.company_name || selectedVendor.name || "Vendor"}</h3>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-600 text-xs">\u2715</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium capitalize">{selectedVendor.type || "vendor"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{selectedVendor.email || "\u2014"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{selectedVendor.phone || "\u2014"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><Badge className={`${STATUS_STYLES[selectedVendor.status] || "bg-emerald-100 text-emerald-700"} capitalize text-[9px]`}>{selectedVendor.status || "active"}</Badge></div>
              {selectedVendor.categories && <div className="flex justify-between"><span className="text-slate-500">Categories</span><span className="font-medium">{(selectedVendor.categories || []).join(", ") || "\u2014"}</span></div>}
              {selectedVendor.created_at && <div className="flex justify-between"><span className="text-slate-500">Joined</span><span className="font-medium">{new Date(selectedVendor.created_at).toLocaleDateString()}</span></div>}
            </div>
          </div>
        )}
      </div>
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
  const [stats, setStats] = useState({});
  const [detail, setDetail] = useState(null);
  const [searchQ, setSearchQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ALL RFQs — Kanban renders all stages simultaneously
      const [rRes, vRes, sRes] = await Promise.all([
        api.get(`/api/vendor-ops/price-requests`),
        api.get("/api/vendor-ops/vendors").catch(() => ({ data: { vendors: [] } })),
        api.get("/api/vendor-ops/price-requests/stats").catch(() => ({ data: {} })),
      ]);
      setRequests(rRes.data?.price_requests || []);
      setVendors(vRes.data?.vendors || []);
      setStats(sRes.data || {});
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (detail) return <RequestDetail pr={detail} vendors={vendors} onBack={() => { setDetail(null); load(); }} />;

  // Group RFQs into Kanban columns based on status semantics
  const filtered = searchQ.trim()
    ? requests.filter(r => (r.product_or_service || "").toLowerCase().includes(searchQ.trim().toLowerCase()) || (r.category || "").toLowerCase().includes(searchQ.trim().toLowerCase()))
    : requests;

  const columns = {
    new: { title: "NEW", subtitle: "Send these to vendors", accent: "amber", items: [] },
    waiting: { title: "WAITING FOR VENDORS", subtitle: "Quotes coming in", accent: "blue", items: [] },
    decision: { title: "PICK A WINNER", subtitle: "Quotes ready — your turn", accent: "red", items: [], urgent: true },
    done: { title: "DONE", subtitle: "Closed / awarded", accent: "slate", items: [] },
  };
  for (const r of filtered) {
    const s = r.status || "new";
    if (["new", "pending_vendor_response"].includes(s)) columns.new.items.push(r);
    else if (["sent_to_vendors", "awaiting_quotes"].includes(s)) columns.waiting.items.push(r);
    else if (["partially_quoted", "response_received"].includes(s)) columns.decision.items.push(r);
    else columns.done.items.push(r);
  }

  const needsDecisionCount = columns.decision.items.length;
  const newCount = columns.new.items.length;

  return (
    <div className="space-y-4" data-testid="price-requests-section">
      {/* ── Urgent "What needs me?" strip ── */}
      {(needsDecisionCount > 0 || newCount > 0) ? (
        <div className="bg-gradient-to-r from-red-50 via-amber-50 to-white border-l-4 border-red-400 rounded-xl p-4 flex items-start gap-3" data-testid="urgent-strip">
          <div className="text-xl">⚡</div>
          <div className="flex-1 text-sm">
            <div className="font-bold text-red-800">
              {needsDecisionCount > 0 && <>{needsDecisionCount} quote{needsDecisionCount > 1 ? "s" : ""} need a winner picked</>}
              {needsDecisionCount > 0 && newCount > 0 && " · "}
              {newCount > 0 && <>{newCount} new request{newCount > 1 ? "s" : ""} to send out</>}
            </div>
            <div className="text-xs text-red-700 mt-0.5">Take action on the cards below to keep things moving.</div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border-l-4 border-emerald-300 rounded-xl p-4 flex items-center gap-3" data-testid="urgent-strip-clear">
          <div className="text-xl">✓</div>
          <div className="flex-1 text-sm">
            <div className="font-bold text-emerald-800">All clear — nothing needs you right now.</div>
            <div className="text-xs text-emerald-700 mt-0.5">Create a new request when a customer asks for a quote.</div>
          </div>
        </div>
      )}

      {/* ── Header bar: search + new ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9 h-9 text-sm" placeholder="Search by product or category..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} data-testid="rfq-search" />
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-3">
          <span><span className="font-bold text-[#20364D]">{requests.length}</span> total</span>
          {stats.overdue > 0 && <span className="text-red-600 font-bold">{stats.overdue} overdue</span>}
        </div>
        <Button size="sm" className="bg-[#20364D] hover:bg-[#1a2d40]" onClick={() => setDetail({ _new: true })} data-testid="new-request-btn">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Request
        </Button>
      </div>

      {/* ── Kanban Board ── */}
      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3" data-testid="kanban-board">
          {Object.entries(columns).map(([key, col]) => (
            <KanbanColumn key={key} colKey={key} column={col} onOpen={(r) => setDetail(r)} />
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ colKey, column, onOpen }) {
  const ACCENT = {
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-400" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", dot: "bg-blue-400" },
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", dot: "bg-red-500 animate-pulse" },
    slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-400" },
  }[column.accent];

  return (
    <div className={`rounded-2xl border ${ACCENT.border} ${ACCENT.bg} p-3 flex flex-col gap-2 min-h-[280px]`} data-testid={`kanban-col-${colKey}`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${ACCENT.dot}`} />
          <h3 className={`text-[11px] font-bold tracking-wider ${ACCENT.text}`}>{column.title}</h3>
          <span className={`text-xs font-extrabold ${ACCENT.text}`}>{column.items.length}</span>
        </div>
      </div>
      <p className={`text-[11px] ${ACCENT.text}/80 opacity-70 px-1 -mt-1`}>{column.subtitle}</p>

      {/* Cards */}
      <div className="space-y-2 flex-1">
        {column.items.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-400">
            {colKey === "new" && "No new requests"}
            {colKey === "waiting" && "No pending quotes"}
            {colKey === "decision" && "Nothing to decide"}
            {colKey === "done" && "No closed deals yet"}
          </div>
        )}
        {column.items.map((r) => (
          <RfqCard key={r.id} rfq={r} colKey={colKey} onOpen={() => onOpen(r)} />
        ))}
      </div>
    </div>
  );
}

function RfqCard({ rfq, colKey, onOpen }) {
  const quotes = rfq.vendor_quotes || [];
  const quoted = quotes.filter(q => q.status === "quoted").length;
  const total = quotes.length;
  const bestPrice = quotes.filter(q => q.base_price != null).sort((a, b) => a.base_price - b.base_price)[0]?.base_price;

  const cardConfig = {
    new: { cta: "Send to vendors →", ctaClass: "bg-amber-500 hover:bg-amber-600" },
    waiting: { cta: "View quotes", ctaClass: "bg-blue-500 hover:bg-blue-600" },
    decision: { cta: "Pick a winner", ctaClass: "bg-red-500 hover:bg-red-600" },
    done: { cta: "View", ctaClass: "bg-slate-400 hover:bg-slate-500" },
  }[colKey];

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-[#20364D]/40 hover:shadow-md transition p-3 space-y-1.5"
      data-testid={`rfq-card-${rfq.id}`}
    >
      <div className="font-semibold text-sm text-[#20364D] line-clamp-2">{rfq.product_or_service || "Unnamed request"}</div>
      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
        {rfq.category && <span>{rfq.category}</span>}
        {rfq.quantity > 1 && <span>• {rfq.quantity} {rfq.unit_of_measurement || "pcs"}</span>}
      </div>

      {/* Status-specific body */}
      {colKey === "waiting" && total > 0 && (
        <div className="text-[11px] text-slate-600">
          <span className="font-semibold">{quoted}</span> of {total} vendor{total !== 1 ? "s" : ""} replied
          <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${total > 0 ? (quoted / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {colKey === "decision" && (
        <div className="text-[11px] text-slate-600">
          <span className="font-bold text-emerald-700">{quoted} quote{quoted !== 1 ? "s" : ""} in</span>
          {bestPrice != null && <> · Best: <span className="font-bold">{money(bestPrice)}</span></>}
        </div>
      )}

      {colKey === "done" && rfq.final_sell_price && (
        <div className="text-[11px] text-slate-600">Sold at <span className="font-bold text-emerald-700">{money(rfq.final_sell_price)}</span></div>
      )}

      {/* CTA */}
      <div className={`mt-2 w-full text-center py-1.5 rounded-lg text-white text-[11px] font-semibold ${cardConfig.ctaClass} transition`}>
        {cardConfig.cta}
      </div>
    </button>
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

  // ─── Wizard step logic ───
  // Step 1 = Details (always done if request exists)
  // Step 2 = Pick vendors & send     (active if status in new/pending_vendor_response)
  // Step 3 = Review quotes            (active if status in sent_to_vendors/partially_quoted/response_received)
  // Step 4 = Award winner             (active if any quote is 'quoted' — parallel to step 3)
  // Step 5 = Done                     (status ready_for_sales or later)
  const currentStep = (() => {
    const s = request.status || "new";
    if (s === "ready_for_sales" || s === "quoted_to_customer" || s === "closed") return 5;
    if (quotedQuotes.length > 0) return 4;
    if (["sent_to_vendors", "awaiting_quotes", "partially_quoted", "response_received"].includes(s)) return 3;
    return 2;
  })();

  const steps = [
    { n: 1, label: "Details" },
    { n: 2, label: "Pick vendors" },
    { n: 3, label: "Wait for quotes" },
    { n: 4, label: "Pick a winner" },
    { n: 5, label: "Done" },
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto" data-testid="request-detail">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="back-btn"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#20364D] truncate">{request.product_or_service}</h2>
          <p className="text-xs text-slate-400">{request.category || "No category"} • {request.quantity || 1} {request.unit_of_measurement || "Piece"}</p>
        </div>
        <Badge className={`${STATUS_STYLES[request.status] || "bg-slate-100 text-slate-500"}`}>{prettyStatus(request.status)}</Badge>
      </div>

      {/* ─── Progress Stepper ─── */}
      <div className="bg-white rounded-xl border p-4" data-testid="wizard-stepper">
        <div className="flex items-center justify-between overflow-x-auto">
          {steps.map((s, i) => {
            const done = currentStep > s.n;
            const active = currentStep === s.n;
            return (
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-[#20364D] text-white ring-4 ring-[#20364D]/15" : "bg-slate-100 text-slate-400"
                  }`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${active ? "text-[#20364D]" : done ? "text-emerald-700" : "text-slate-400"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={`h-0.5 flex-1 mx-2 min-w-[12px] ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ─── STEP 2: Pick vendors & send ─── */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border p-5 space-y-4" data-testid="step-pick-vendors">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Step 2 of 5</div>
            <h3 className="text-lg font-bold text-[#20364D]">Which vendors should quote on this?</h3>
            <p className="text-xs text-slate-500 mt-1">Tick the vendors you want to ask. {request.sourcing_mode === "competitive" ? "We'll send to multiple for price competition." : "We'll send to your preferred vendor."}</p>
          </div>
          <div className="border rounded-xl max-h-[360px] overflow-y-auto divide-y">
            {vendors.map((v) => {
              const vid = v.id || v._id;
              const checked = selectedVendors.includes(vid);
              return (
                <label key={vid} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition ${checked ? "bg-[#20364D]/5" : ""}`} data-testid={`vendor-pick-${vid}`}>
                  <input type="checkbox" checked={checked} onChange={(e) => setSelectedVendors(e.target.checked ? [...selectedVendors, vid] : selectedVendors.filter(x => x !== vid))} className="w-4 h-4 accent-[#20364D]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#20364D] truncate">{v.company_name || v.name}</div>
                    <div className="text-[11px] text-slate-400">{(v.categories || []).slice(0, 3).join(", ") || "All categories"}</div>
                  </div>
                  {v.is_preferred && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Preferred</Badge>}
                </label>
              );
            })}
            {vendors.length === 0 && <div className="p-6 text-center text-xs text-slate-400">No vendors registered yet.</div>}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-slate-500">{selectedVendors.length} vendor{selectedVendors.length !== 1 ? "s" : ""} selected</div>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-6" onClick={sendToVendors} disabled={saving || !selectedVendors.length} data-testid="wizard-send-btn">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Request →</>}
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Waiting for vendors (no quotes yet) ─── */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border p-6 text-center space-y-3" data-testid="step-waiting">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 3 of 5</div>
          <div className="flex justify-center"><Clock className="w-12 h-12 text-blue-400" /></div>
          <h3 className="text-lg font-bold text-[#20364D]">Waiting for vendors to respond</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">We've sent this to {quotes.length} vendor{quotes.length !== 1 ? "s" : ""}. You'll be notified here as soon as any of them submits a quote.</p>
          <div className="max-w-md mx-auto bg-slate-50 rounded-xl p-3 space-y-1.5">
            {quotes.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-xs" data-testid={`waiting-vendor-${i}`}>
                <span className="font-medium text-[#20364D]">{q.vendor_name}</span>
                <Badge className={q.status === "quoted" ? "bg-emerald-100 text-emerald-700" : q.status === "declined_by_vendor" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}>
                  {q.status === "quoted" ? "✓ Quoted" : q.status === "declined_by_vendor" ? "Declined" : "Waiting…"}
                </Badge>
              </div>
            ))}
          </div>
          <button onClick={() => setShowQuoteForm(!showQuoteForm)} className="text-xs font-semibold text-[#D4A843] hover:underline" data-testid="manual-quote-toggle">
            {showQuoteForm ? "Cancel" : "Or enter a vendor's quote manually ↓"}
          </button>
          {showQuoteForm && <ManualQuoteForm vendors={vendors} quotes={quotes} quoteForm={quoteForm} setQuoteForm={setQuoteForm} onSubmit={submitQuote} saving={saving} />}
        </div>
      )}

      {/* ─── STEP 4: Pick a winner ─── */}
      {currentStep === 4 && (
        <div className="space-y-4" data-testid="step-pick-winner">
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 4 of 5</div>
            <h3 className="text-lg font-bold text-[#20364D] mt-1">Compare quotes and pick a winner</h3>
            <p className="text-xs text-slate-500 mt-1">Each vendor's price is checked against the Konekt pricing engine (source of truth) so you can be confident your margin is safe.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {quotedQuotes.map((q, i) => {
              const isBest = q === bestQuote;
              const isSelected = request.selected_vendor_id === q.vendor_id;
              const pricingRef = (request.pricing_references || []).find(p => p && p.vendor_id === q.vendor_id);
              return (
                <div key={i} className={`rounded-2xl border-2 p-4 space-y-3 transition ${isSelected ? "border-emerald-500 bg-emerald-50" : isBest ? "border-[#D4A843] bg-[#D4A843]/5" : "border-slate-200 bg-white"}`} data-testid={`winner-card-${i}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[#20364D]">{q.vendor_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{q.lead_time || "No lead time given"}</div>
                    </div>
                    {isBest && !isSelected && <Badge className="bg-[#D4A843] text-white text-[10px]">BEST PRICE</Badge>}
                    {isSelected && <Badge className="bg-emerald-600 text-white text-[10px]">SELECTED ✓</Badge>}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Vendor's price</div>
                    <div className="text-2xl font-extrabold text-[#20364D]">{money(q.base_price)}</div>
                  </div>
                  {pricingRef && (
                    <div className="bg-white/60 backdrop-blur rounded-lg border border-slate-200 p-2 text-[11px] grid grid-cols-3 gap-1" data-testid={`pricing-ref-${i}`}>
                      <div><div className="uppercase tracking-wider text-slate-400 text-[9px]">Konekt sells at</div><div className="font-bold text-[#20364D]">{money(pricingRef.konekt_sell_price)}</div></div>
                      <div><div className="uppercase tracking-wider text-slate-400 text-[9px]">Min sell</div><div className="font-bold text-slate-600">{money(pricingRef.min_sell_price)}</div></div>
                      <div><div className="uppercase tracking-wider text-slate-400 text-[9px]">Margin</div><div className="font-bold text-emerald-700">{pricingRef.margin_pct ? `${Number(pricingRef.margin_pct).toFixed(1)}%` : "—"}</div></div>
                    </div>
                  )}
                  {q.notes && <div className="text-xs text-slate-600 bg-slate-50 rounded p-2">{q.notes}</div>}
                  {!isSelected && (
                    <Button onClick={() => selectVendor(q.vendor_id, quotes.indexOf(q))} disabled={saving} className="w-full bg-[#20364D] hover:bg-[#1a2d40]" data-testid={`wizard-pick-${i}`}>
                      Pick this winner →
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button onClick={() => setShowQuoteForm(!showQuoteForm)} className="text-xs font-semibold text-[#D4A843] hover:underline" data-testid="manual-quote-toggle">
              {showQuoteForm ? "Cancel" : "+ Enter another vendor's quote manually"}
            </button>
            {showQuoteForm && <ManualQuoteForm vendors={vendors} quotes={quotes} quoteForm={quoteForm} setQuoteForm={setQuoteForm} onSubmit={submitQuote} saving={saving} />}
          </div>
        </div>
      )}

      {/* ─── STEP 5: Done ─── */}
      {currentStep === 5 && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 space-y-4" data-testid="step-done">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-extrabold text-emerald-800">Done — ready for the customer</h3>
            <p className="text-sm text-emerald-700 mt-1">Sales can now send this quote to the customer.</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4 grid grid-cols-3 gap-2 text-center" data-testid="final-numbers">
            <div><div className="text-[10px] uppercase tracking-wider text-slate-400">Vendor base</div><div className="font-bold text-[#20364D]">{money(request.final_base_price)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-slate-400">Konekt sell price</div><div className="font-extrabold text-emerald-700 text-lg">{money(request.final_sell_price)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-slate-400">Lead time</div><div className="font-bold">{request.final_lead_time || "TBD"}</div></div>
          </div>
        </div>
      )}

      {/* ─── Context strip (notes + request details) ─── */}
      <details className="bg-slate-50 rounded-xl border p-3">
        <summary className="text-xs font-semibold text-slate-500 cursor-pointer select-none">About this request</summary>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div><span className="text-slate-400">From:</span> {request.requested_by_name || "Konekt Sales"}</div>
          <div><span className="text-slate-400">Strategy:</span> {request.sourcing_mode === "competitive" ? "Multiple quotes" : "Single vendor"}</div>
          <div><span className="text-slate-400">Vendors have:</span> {request.default_quote_expiry_hours || 48}h to quote</div>
          <div><span className="text-slate-400">Lead time target:</span> {request.default_lead_time_days || 3} days</div>
          {request.notes_from_sales && <div className="col-span-2 mt-2 bg-white rounded-lg p-2 text-slate-700"><span className="font-semibold">Sales notes:</span> {request.notes_from_sales}</div>}
        </div>
      </details>
    </div>
  );
}

/* Manual Quote Entry Form — shared between wizard steps 3 and 4 */
function ManualQuoteForm({ vendors, quotes, quoteForm, setQuoteForm, onSubmit, saving }) {
  return (
    <div className="mt-3 max-w-lg mx-auto bg-slate-50 rounded-xl p-3 space-y-2 border" data-testid="quote-entry-form">
      <select value={quoteForm.vendor_id} onChange={(e) => setQuoteForm({ ...quoteForm, vendor_id: e.target.value })} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white" data-testid="qf-vendor">
        <option value="">Select vendor</option>
        {quotes.map((q) => <option key={q.vendor_id} value={q.vendor_id}>{q.vendor_name}</option>)}
        {vendors.filter((v) => !quotes.find((q) => q.vendor_id === (v.id || v._id))).map((v) => <option key={v.id || v._id} value={v.id || v._id}>{v.company_name || v.name}</option>)}
      </select>
      <Input type="number" placeholder="Base price" value={quoteForm.base_price} onChange={(e) => setQuoteForm({ ...quoteForm, base_price: parseFloat(e.target.value) || "" })} className="text-xs" data-testid="qf-price" />
      <Input placeholder="Lead time" value={quoteForm.lead_time} onChange={(e) => setQuoteForm({ ...quoteForm, lead_time: e.target.value })} className="text-xs" data-testid="qf-lead" />
      <Button size="sm" className="w-full bg-[#D4A843] hover:bg-[#b38f38] text-white" onClick={onSubmit} disabled={saving} data-testid="submit-quote-btn">
        {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Save Quote
      </Button>
    </div>
  );
}

/* ═══ ORDERS / FULFILLMENT TAB ═══ */
const ORDER_STATUSES = ["pending_payment", "confirmed", "processing", "dispatched", "delivered", "completed", "cancelled"];
const ORDER_STATUS_COLORS = {
  pending_payment: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-violet-100 text-violet-700",
  dispatched: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

function OrdersFulfillmentTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : "";
    api.get(`/api/admin/orders-ops${params}`)
      .then((res) => {
        const data = res.data;
        setOrders(Array.isArray(data) ? data : data?.orders || []);
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/api/admin/orders-ops/${orderId}/status`, null, { params: { status: newStatus } });
      toast.success(`Order updated to ${newStatus.replace(/_/g, " ")}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update");
    }
    setUpdatingId(null);
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (o.order_number || "").toLowerCase().includes(s) ||
      (o.customer_name || "").toLowerCase().includes(s) ||
      (o.customer_company || "").toLowerCase().includes(s)
    );
  });

  const stats = {
    pending: orders.filter((o) => o.current_status === "pending_payment").length,
    confirmed: orders.filter((o) => o.current_status === "confirmed").length,
    processing: orders.filter((o) => o.current_status === "processing").length,
    dispatched: orders.filter((o) => o.current_status === "dispatched").length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4" data-testid="orders-fulfillment-tab">
      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Pending Payment" value={stats.pending} color="text-amber-600" />
        <StatCard label="Confirmed" value={stats.confirmed} color="text-blue-600" />
        <StatCard label="Processing" value={stats.processing} color="text-violet-600" />
        <StatCard label="Dispatched" value={stats.dispatched} color="text-cyan-600" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" data-testid="orders-search" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-xs bg-white" data-testid="orders-filter">
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border overflow-hidden" data-testid="orders-table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Source</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Payment</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400"><ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-200" /><p>No orders found</p></td></tr>
              ) : filtered.map((o) => {
                const cs = o.current_status || o.status || "pending_payment";
                const locked = o.fulfillment_locked === true;
                return (
                  <tr key={o.id || o.order_number} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`order-row-${o.order_number}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#20364D]">{o.order_number}</div>
                      <div className="text-[10px] text-slate-400">{o.created_at ? new Date(o.created_at).toLocaleDateString() : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{o.customer_name || o.customer_company || "\u2014"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="text-[9px] bg-slate-100 text-slate-600">{(o.source_type || o.order_type || "direct").replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{money(o.total || o.total_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {o.payment_confirmed ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Paid</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 text-[9px]">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${ORDER_STATUS_COLORS[cs] || "bg-slate-100 text-slate-500"} capitalize text-[9px]`}>{cs.replace(/_/g, " ")}</Badge>
                      {locked && <div className="text-[8px] text-red-500 mt-0.5">Fulfillment locked</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {locked ? (
                        <span className="text-[10px] text-slate-400">Awaiting payment</span>
                      ) : (
                        <select
                          value={cs}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          disabled={updatingId === o.id}
                          className="border rounded px-2 py-1 text-[10px] bg-white"
                          data-testid={`update-status-${o.order_number}`}
                        >
                          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-slate-400 border-t">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</div>
      </div>
    </div>
  );
}


/* ═══ SHARED COMPONENTS ═══ */

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
