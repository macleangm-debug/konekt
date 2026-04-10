import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Package, CheckCircle, XCircle, Clock, AlertTriangle, Search, Filter } from "lucide-react";
import api from "../../lib/api";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";
import StatusBadge from "../../components/admin/shared/StatusBadge";

const STATUS_CONFIG = {
  pending: { color: "bg-amber-100 text-amber-700", label: "Pending Review" },
  approved: { color: "bg-green-100 text-green-700", label: "Approved" },
  rejected: { color: "bg-red-100 text-red-700", label: "Rejected" },
  changes_requested: { color: "bg-purple-100 text-purple-700", label: "Changes Requested" },
};

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
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
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoading(false);
    }
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

  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === filtered.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map(s => s.id)));
    }
  };

  const handleApprove = async (id) => {
    confirmAction({
      title: "Approve Product",
      message: "This will approve the product and add it to the catalog.",
      confirmLabel: "Approve",
      onConfirm: async () => {
        try {
          await api.post(`/api/admin/vendor-submissions/${id}/approve`, { publish: true }, { headers });
          load();
          setSelected(null);
        } catch (err) {
          console.error("Approve failed:", err);
        }
      }
    });
  };

  const handleReject = async (id) => {
    setShowRejectModal(id);
    setRejectNotes("");
  };

  const confirmReject = async () => {
    if (!showRejectModal) return;
    try {
      await api.post(`/api/admin/vendor-submissions/${showRejectModal}/reject`, { notes: rejectNotes }, { headers });
      setShowRejectModal(null);
      load();
      setSelected(null);
    } catch (err) {
      console.error("Reject failed:", err);
    }
  };

  const handleBulkApprove = () => {
    if (checkedIds.size === 0) return;
    confirmAction({
      title: `Bulk Approve ${checkedIds.size} Products`,
      message: `This will approve ${checkedIds.size} product(s) and add them to the catalog.`,
      confirmLabel: "Approve All",
      onConfirm: async () => {
        setBulkProcessing(true);
        try {
          await api.post("/api/admin/vendor-submissions/bulk-approve", {
            ids: Array.from(checkedIds), publish: true
          }, { headers });
          setCheckedIds(new Set());
          load();
        } catch (err) {
          console.error("Bulk approve failed:", err);
        } finally {
          setBulkProcessing(false);
        }
      }
    });
  };

  const handleBulkReject = () => {
    if (checkedIds.size === 0) return;
    setShowRejectModal("bulk");
    setRejectNotes("");
  };

  const confirmBulkReject = async () => {
    setBulkProcessing(true);
    try {
      await api.post("/api/admin/vendor-submissions/bulk-reject", {
        ids: Array.from(checkedIds), notes: rejectNotes
      }, { headers });
      setCheckedIds(new Set());
      setShowRejectModal(null);
      load();
    } catch (err) {
      console.error("Bulk reject failed:", err);
    } finally {
      setBulkProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="product-approval-loading">
        <div className="animate-spin w-8 h-8 border-4 border-[#20364D] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-product-approval-page">
      {/* Header */}
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

      {/* Tabs + Search + Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setCheckedIds(new Set()); }}
              data-testid={`tab-${tab.key}`}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                statusFilter === tab.key
                  ? tab.key === "pending" ? "bg-amber-600 text-white" : "bg-[#20364D] text-white"
                  : tab.key === "pending" && tab.count > 0
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {checkedIds.size > 0 && statusFilter === "pending" && (
            <div className="flex gap-2" data-testid="bulk-actions">
              <button
                onClick={handleBulkApprove}
                disabled={bulkProcessing}
                data-testid="bulk-approve-btn"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
              >
                {bulkProcessing ? "Processing..." : `Approve ${checkedIds.size}`}
              </button>
              <button
                onClick={handleBulkReject}
                disabled={bulkProcessing}
                data-testid="bulk-reject-btn"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                Reject {checkedIds.size}
              </button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="search-input"
              className="pl-9 pr-4 py-2 border rounded-xl text-sm w-56 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" data-testid="empty-state">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">
            {statusFilter === "pending" ? "No products pending approval" :
             statusFilter === "approved" ? "No approved products yet" :
             statusFilter === "rejected" ? "No rejected products" :
             "No product submissions yet"}
          </p>
          <p className="text-sm text-slate-400 mt-1">Vendor submissions will appear here for review</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" data-testid="submissions-table">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                {statusFilter === "pending" && (
                  <th className="w-12 py-3 px-4">
                    <input
                      type="checkbox"
                      checked={checkedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      data-testid="select-all-checkbox"
                      className="rounded border-slate-300"
                    />
                  </th>
                )}
                <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Product</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Vendor</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Category</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Base Cost</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase text-left">Submitted</th>
                {statusFilter === "pending" && (
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase text-center">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(sub => {
                const cfg = STATUS_CONFIG[sub.review_status] || STATUS_CONFIG.pending;
                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/50 transition cursor-pointer"
                    onClick={(e) => {
                      if (e.target.type === "checkbox" || e.target.closest("button")) return;
                      setSelected(sub);
                    }}
                    data-testid={`submission-row-${sub.id}`}
                  >
                    {statusFilter === "pending" && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={checkedIds.has(sub.id)}
                          onChange={() => toggleCheck(sub.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-slate-800">{sub.product_name}</span>
                      {sub.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[240px]">{sub.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">{sub.vendor_name || "—"}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{sub.group_name || sub.category_name || "—"}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800 text-right">{money(sub.base_cost)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.color}`} data-testid={`status-${sub.review_status}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {sub.created_at ? new Date(sub.created_at).toLocaleDateString("en-GB") : "—"}
                    </td>
                    {statusFilter === "pending" && (
                      <td className="px-5 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(sub.id); }}
                            data-testid={`approve-btn-${sub.id}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReject(sub.id); }}
                            data-testid={`reject-btn-${sub.id}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      <StandardDrawerShell
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.product_name || "Product Details"}
        subtitle="SUBMISSION REVIEW"
      >
        {selected && (
          <div className="space-y-4 p-1" data-testid="submission-detail-drawer">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Vendor</p>
                <p className="text-sm text-slate-800 font-medium">{selected.vendor_name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Status</p>
                <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${(STATUS_CONFIG[selected.review_status] || STATUS_CONFIG.pending).color}`}>
                  {(STATUS_CONFIG[selected.review_status] || STATUS_CONFIG.pending).label}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Base Cost</p>
                <p className="text-sm text-slate-800 font-bold">{money(selected.base_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Min Quantity</p>
                <p className="text-sm text-slate-800 font-medium">{selected.min_quantity || 1}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Currency</p>
                <p className="text-sm text-slate-800 font-medium">{selected.currency_code || "TZS"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Visibility</p>
                <p className="text-sm text-slate-800 font-medium capitalize">{(selected.visibility_mode || "").replace(/_/g, " ")}</p>
              </div>
            </div>

            {selected.description && (
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Description</p>
                <p className="text-sm text-slate-700">{selected.description}</p>
              </div>
            )}

            {selected.group_name && (
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Product Group</p>
                <p className="text-sm text-slate-800 font-medium">{selected.group_name}</p>
              </div>
            )}

            {selected.review_notes && (
              <div className="bg-slate-50 border rounded-xl p-3">
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Review Notes</p>
                <p className="text-sm text-slate-700">{selected.review_notes}</p>
              </div>
            )}

            <div className="text-xs text-slate-400">
              Submitted: {selected.created_at ? new Date(selected.created_at).toLocaleString("en-GB") : "—"}
              {selected.reviewed_at && ` | Reviewed: ${new Date(selected.reviewed_at).toLocaleString("en-GB")}`}
            </div>

            {selected.review_status === "pending" && (
              <div className="flex gap-3 pt-2 border-t">
                <button
                  onClick={() => handleApprove(selected.id)}
                  data-testid="drawer-approve-btn"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  Approve & Publish
                </button>
                <button
                  onClick={() => handleReject(selected.id)}
                  data-testid="drawer-reject-btn"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </StandardDrawerShell>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" data-testid="reject-modal">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {showRejectModal === "bulk" ? `Reject ${checkedIds.size} Products` : "Reject Product"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {showRejectModal === "bulk"
                ? "Provide a reason for rejecting these products. The vendors will be notified."
                : "Provide a reason for rejection. The vendor will be notified."}
            </p>
            <textarea
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              data-testid="reject-notes-input"
              className="w-full border rounded-xl p-3 text-sm mb-4 h-24 resize-none focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={showRejectModal === "bulk" ? confirmBulkReject : confirmReject}
                disabled={bulkProcessing}
                data-testid="confirm-reject-btn"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {bulkProcessing ? "Processing..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
