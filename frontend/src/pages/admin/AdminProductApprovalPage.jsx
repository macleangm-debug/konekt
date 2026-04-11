import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Package, CheckCircle, XCircle, Clock, Search, Image, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../lib/api";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";
import { formatDate, formatDateShort } from "../../utils/dateFormat";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

const STATUS_CFG = {
  pending: { color: "bg-amber-100 text-amber-700", label: "Pending Review" },
  pending_review: { color: "bg-amber-100 text-amber-700", label: "Pending Review" },
  approved: { color: "bg-green-100 text-green-700", label: "Approved" },
  rejected: { color: "bg-red-100 text-red-700", label: "Rejected" },
};

function money(v) { return `TZS ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`; }

function ImagePreview({ src, alt, className = "" }) {
  if (!src) return <div className={`bg-slate-100 rounded-xl flex items-center justify-center ${className}`}><Image className="w-8 h-8 text-slate-300" /></div>;
  const url = src.startsWith("http") ? src : `${API_BASE}/api/files/serve/${src}`;
  return <img src={url} alt={alt} className={`object-cover rounded-xl ${className}`} onError={e => { e.target.style.display = "none"; }} />;
}

export default function AdminProductApprovalPage() {
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const { confirmAction } = useConfirmModal();

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    try {
      const [subsRes, statsRes] = await Promise.all([
        api.get("/api/admin/vendor-submissions", { headers }),
        api.get("/api/admin/vendor-submissions/stats", { headers }),
      ]);
      setSubmissions(subsRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) { console.error("Load failed:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = submissions;
    if (statusFilter !== "all") {
      list = list.filter(s => {
        if (statusFilter === "pending") return s.review_status === "pending" || s.review_status === "pending_review";
        return s.review_status === statusFilter;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.product_name || "").toLowerCase().includes(q) ||
        (s.vendor_name || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [submissions, statusFilter, search]);

  const tabs = [
    { key: "pending", label: "Pending", count: stats.pending || 0 },
    { key: "approved", label: "Approved", count: stats.approved || 0 },
    { key: "rejected", label: "Rejected", count: stats.rejected || 0 },
    { key: "all", label: "All", count: stats.total || 0 },
  ];

  const toggleCheck = (id) => setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setCheckedIds(checkedIds.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)));

  const handleApprove = (id) => {
    confirmAction({
      title: "Approve Product",
      message: "This will approve the product and publish it to the catalog.",
      confirmLabel: "Approve",
      onConfirm: async () => {
        await api.post(`/api/admin/vendor-submissions/${id}/approve`, { publish: true }, { headers });
        load(); setSelected(null);
      }
    });
  };

  const handleReject = (id) => { setShowRejectModal(id); setRejectNotes(""); };

  const confirmReject = async () => {
    if (!showRejectModal) return;
    await api.post(`/api/admin/vendor-submissions/${showRejectModal}/reject`, { notes: rejectNotes }, { headers });
    setShowRejectModal(null); load(); setSelected(null);
  };

  const handleBulkApprove = () => {
    if (!checkedIds.size) return;
    confirmAction({
      title: `Bulk Approve ${checkedIds.size} Products`,
      message: `This will approve and publish ${checkedIds.size} product(s) to the catalog.`,
      confirmLabel: "Approve All",
      onConfirm: async () => {
        setBulkProcessing(true);
        await api.post("/api/admin/vendor-submissions/bulk-approve", { ids: [...checkedIds], publish: true }, { headers });
        setCheckedIds(new Set()); load();
        setBulkProcessing(false);
      }
    });
  };

  const handleBulkReject = () => { if (!checkedIds.size) return; setShowRejectModal("bulk"); setRejectNotes(""); };
  const confirmBulkReject = async () => {
    setBulkProcessing(true);
    await api.post("/api/admin/vendor-submissions/bulk-reject", { ids: [...checkedIds], notes: rejectNotes }, { headers });
    setCheckedIds(new Set()); setShowRejectModal(null); load();
    setBulkProcessing(false);
  };

  // Get all images for a submission
  const getImages = (sub) => {
    const imgs = [];
    const primary = sub?.image_url || sub?.product?.primary_image;
    if (primary) imgs.push(primary);
    if (sub?.gallery_images?.length) imgs.push(...sub.gallery_images);
    return imgs;
  };

  const openDrawer = (sub) => { setSelected(sub); setActiveImage(0); };

  if (loading) return <div className="flex items-center justify-center h-64" data-testid="product-approval-loading"><div className="animate-spin w-8 h-8 border-4 border-[#20364D] border-t-transparent rounded-full" /></div>;

  const isPending = statusFilter === "pending";

  return (
    <div className="space-y-6" data-testid="admin-product-approval-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Product Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve vendor product submissions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="approval-stats">
        {[
          { label: "PENDING", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "APPROVED", value: stats.approved, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "REJECTED", value: stats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "TOTAL", value: stats.total, icon: Package, color: "text-[#20364D]", bg: "bg-slate-50" },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl p-4 border border-slate-100`}>
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search + Bulk */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setCheckedIds(new Set()); }}
              data-testid={`tab-${tab.key}`}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                statusFilter === tab.key
                  ? tab.key === "pending" ? "bg-amber-600 text-white" : "bg-[#20364D] text-white"
                  : tab.key === "pending" && tab.count > 0 ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {tab.label} {tab.count}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {checkedIds.size > 0 && isPending && (
            <div className="flex gap-2" data-testid="bulk-actions">
              <button onClick={handleBulkApprove} disabled={bulkProcessing} data-testid="bulk-approve-btn"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50">
                {bulkProcessing ? "Processing..." : `Approve ${checkedIds.size}`}
              </button>
              <button onClick={handleBulkReject} disabled={bulkProcessing} data-testid="bulk-reject-btn"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50">
                Reject {checkedIds.size}
              </button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
              data-testid="search-input" className="pl-9 pr-4 py-2 border rounded-xl text-sm w-56 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" data-testid="empty-state">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">
            {isPending ? "No products pending approval" : statusFilter === "approved" ? "No approved products yet" : statusFilter === "rejected" ? "No rejected products" : "No product submissions yet"}
          </p>
          <p className="text-sm text-slate-400 mt-1">Vendor submissions will appear here for review</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" data-testid="submissions-table">
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 border-b">
              <tr>
                {isPending && <th className="w-12 py-3 px-4"><input type="checkbox" checked={checkedIds.size === filtered.length && filtered.length > 0} onChange={toggleAll} data-testid="select-all-checkbox" className="rounded border-slate-300" /></th>}
                <th className="w-12 px-2 py-3"></th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Product</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Vendor</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Cost</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-center">Qty</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(sub => {
                const cfg = STATUS_CFG[sub.review_status] || STATUS_CFG.pending;
                const imgs = getImages(sub);
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition cursor-pointer" onClick={e => { if (e.target.type === "checkbox") return; openDrawer(sub); }} data-testid={`submission-row-${sub.id}`}>
                    {isPending && <td className="py-3 px-4" onClick={e => e.stopPropagation()}><input type="checkbox" checked={checkedIds.has(sub.id)} onChange={() => toggleCheck(sub.id)} className="rounded border-slate-300" /></td>}
                    <td className="px-2 py-2"><ImagePreview src={imgs[0]} alt={sub.product_name} className="w-10 h-10" /></td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-800 block">{sub.product_name || "Untitled"}</span>
                      <span className="text-xs text-slate-500">{sub.group_name || sub.category_name || ""}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{sub.vendor_name || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right">{money(sub.base_cost)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">{sub.allocated_quantity || "—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateShort(sub.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Drawer */}
      <StandardDrawerShell open={!!selected} onClose={() => setSelected(null)} title={selected?.product_name || "Product Review"} subtitle="PRODUCT APPROVAL" width="lg">
        {selected && (() => {
          const imgs = getImages(selected);
          const cfg = STATUS_CFG[selected.review_status] || STATUS_CFG.pending;
          const isPendingReview = selected.review_status === "pending" || selected.review_status === "pending_review";
          return (
            <div className="space-y-5" data-testid="submission-detail-drawer">
              {/* Section 1: Product Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Product Name</p><p className="text-sm text-slate-800 font-semibold">{selected.product_name || "—"}</p></div>
                <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Vendor</p><p className="text-sm text-slate-800 font-medium">{selected.vendor_name || "—"}</p></div>
                <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Category</p><p className="text-sm text-slate-800 font-medium">{selected.group_name || selected.category_name || "—"}</p></div>
                <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Status</p><span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.color}`}>{cfg.label}</span></div>
                {selected.allocated_quantity > 0 && (
                  <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Allocated Qty</p><p className="text-sm text-slate-800 font-bold">{selected.allocated_quantity}</p></div>
                )}
                <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Base Cost</p><p className="text-sm text-slate-800 font-bold">{money(selected.base_cost)}</p></div>
              </div>

              {/* Section 2: Images */}
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Product Images</p>
                {imgs.length > 0 ? (
                  <div>
                    <div className="relative bg-slate-50 rounded-xl overflow-hidden" style={{ height: "220px" }}>
                      <ImagePreview src={imgs[activeImage]} alt={selected.product_name} className="w-full h-full object-contain" />
                      {imgs.length > 1 && (
                        <>
                          <button onClick={() => setActiveImage((activeImage - 1 + imgs.length) % imgs.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white"><ChevronLeft className="w-4 h-4" /></button>
                          <button onClick={() => setActiveImage((activeImage + 1) % imgs.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white"><ChevronRight className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                    {imgs.length > 1 && (
                      <div className="flex gap-2 mt-2">
                        {imgs.map((img, idx) => (
                          <button key={idx} onClick={() => setActiveImage(idx)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${idx === activeImage ? "border-[#20364D]" : "border-transparent"}`}>
                            <ImagePreview src={img} alt={`thumb-${idx}`} className="w-full h-full" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-6 text-center"><Image className="w-8 h-8 text-slate-300 mx-auto mb-1" /><p className="text-xs text-slate-400">No images uploaded</p></div>
                )}
              </div>

              {/* Section 3: Product Details */}
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Product Details</p>
                <div className="space-y-3">
                  {selected.description && <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Description</p><p className="text-sm text-slate-700">{selected.description}</p></div>}
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Base Cost</p><p className="text-sm text-slate-800 font-bold">{money(selected.base_cost)}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Currency</p><p className="text-sm text-slate-800">{selected.currency_code || "TZS"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Min Quantity</p><p className="text-sm text-slate-800">{selected.min_quantity || 1}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Allocated Qty</p><p className="text-sm text-slate-800 font-semibold">{selected.allocated_quantity || 0}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Visibility</p><p className="text-sm text-slate-800 capitalize">{(selected.visibility_mode || "").replace(/_/g, " ")}</p></div>
                    {selected.brand && <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Brand</p><p className="text-sm text-slate-800">{selected.brand}</p></div>}
                  </div>
                </div>
              </div>

              {selected.review_notes && (
                <div className="bg-slate-50 border rounded-xl p-3">
                  <p className="text-xs text-slate-500 font-semibold mb-0.5">Review Notes</p>
                  <p className="text-sm text-slate-700">{selected.review_notes}</p>
                </div>
              )}

              <div className="text-xs text-slate-400">
                Submitted: {formatDate(selected.created_at)}
                {selected.reviewed_at && ` | Reviewed: ${formatDate(selected.reviewed_at)}`}
              </div>

              {/* Section 4: Review Actions */}
              {isPendingReview && (
                <div className="border-t pt-4">
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(selected.id)} data-testid="drawer-approve-btn"
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition">
                      Approve & Publish
                    </button>
                    <button onClick={() => handleReject(selected.id)} data-testid="drawer-reject-btn"
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition">
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </StandardDrawerShell>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" data-testid="reject-modal">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {showRejectModal === "bulk" ? `Reject ${checkedIds.size} Products` : "Reject Product"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">Provide a reason for rejection. The vendor will be notified.</p>
            <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Reason for rejection (optional)..."
              data-testid="reject-notes-input" className="w-full border rounded-xl p-3 text-sm mb-4 h-24 resize-none focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition">Cancel</button>
              <button onClick={showRejectModal === "bulk" ? confirmBulkReject : confirmReject} disabled={bulkProcessing} data-testid="confirm-reject-btn"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50">
                {bulkProcessing ? "Processing..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
