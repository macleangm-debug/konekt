import React, { useEffect, useState, useCallback } from "react";
import { Package, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp, FileSpreadsheet, Loader2, MessageSquare, Download } from "lucide-react";
import api from "@/lib/api";

const STATUS_CONFIG = {
  pending_review: { bg: "bg-amber-100 text-amber-700", icon: Clock, label: "Pending Review" },
  approved: { bg: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Approved" },
  rejected: { bg: "bg-red-100 text-red-700", icon: XCircle, label: "Rejected" },
  changes_requested: { bg: "bg-purple-100 text-purple-700", icon: AlertCircle, label: "Changes Requested" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending_review;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`} data-testid={`status-badge-${status}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function SubmissionRow({ sub, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewAction, setReviewAction] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const product = sub.product || {};
  const supply = sub.supply || {};
  const variants = sub.variants || [];

  const handleReview = async (status) => {
    setSubmitting(true);
    await onReview(sub.id, status, notes);
    setSubmitting(false);
    setReviewAction(null);
    setNotes("");
  };

  return (
    <div className="rounded-xl border bg-white overflow-hidden" data-testid={`submission-row-${sub.id}`}>
      <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            {product.primary_image ? (
              <img src={product.primary_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <Package className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">{product.product_name || "—"}</div>
            <div className="text-xs text-slate-500">{sub.vendor_name || "—"} | {product.category_name || "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{sub.source === "bulk_import" ? "Import" : "Upload"}</span>
          <StatusBadge status={sub.review_status} />
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-4 bg-slate-50/50 space-y-4">
          {/* Product Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-slate-400 block">Brand</span><span className="text-slate-700">{product.brand || "—"}</span></div>
            <div><span className="text-slate-400 block">Group</span><span className="text-slate-700">{product.group_name || "—"}</span></div>
            <div><span className="text-slate-400 block">Category</span><span className="text-slate-700">{product.category_name || "—"}</span></div>
            <div><span className="text-slate-400 block">Subcategory</span><span className="text-slate-700">{product.subcategory_name || "—"}</span></div>
          </div>

          {product.short_description && (
            <div className="text-xs"><span className="text-slate-400">Description:</span> <span className="text-slate-600">{product.short_description}</span></div>
          )}

          {/* Images */}
          {product.images?.length > 0 && (
            <div>
              <span className="text-xs text-slate-400 block mb-1">Images ({product.images.length})</span>
              <div className="flex gap-2 flex-wrap">
                {product.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline truncate max-w-[200px]">
                    {i === 0 ? "[Primary] " : ""}{url.split("/").pop()}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Supply */}
          <div className="rounded-lg bg-white border p-3">
            <span className="text-xs font-semibold text-slate-600 block mb-2">Vendor Supply</span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div><span className="text-slate-400 block">Base Price</span><span className="font-medium text-slate-800">{Number(supply.base_price_vat_inclusive || 0).toLocaleString()}</span></div>
              <div><span className="text-slate-400 block">Lead Time</span><span className="text-slate-700">{supply.lead_time_days || 0} days</span></div>
              <div><span className="text-slate-400 block">Supply Mode</span><span className="text-slate-700">{supply.supply_mode || "—"}</span></div>
              <div><span className="text-slate-400 block">Default Qty</span><span className="text-slate-700">{supply.default_quantity || 0}</span></div>
              <div><span className="text-slate-400 block">Vendor Code</span><span className="text-slate-700 font-mono">{supply.vendor_product_code || "—"}</span></div>
            </div>
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="rounded-lg bg-white border p-3">
              <span className="text-xs font-semibold text-slate-600 block mb-2">Variants ({variants.length})</span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-2 py-1 text-left">SKU</th>
                      <th className="px-2 py-1 text-left">Size</th>
                      <th className="px-2 py-1 text-left">Color</th>
                      <th className="px-2 py-1 text-left">Model</th>
                      <th className="px-2 py-1 text-right">Qty</th>
                      <th className="px-2 py-1 text-right">Price Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((v, i) => (
                      <tr key={v.variant_id || i}>
                        <td className="px-2 py-1 font-mono text-slate-600">{v.sku || "—"}</td>
                        <td className="px-2 py-1 text-slate-600">{v.size || "—"}</td>
                        <td className="px-2 py-1 text-slate-600">{v.color || "—"}</td>
                        <td className="px-2 py-1 text-slate-600">{v.model || "—"}</td>
                        <td className="px-2 py-1 text-right text-slate-700">{v.quantity}</td>
                        <td className="px-2 py-1 text-right text-slate-700">{v.price_override ? Number(v.price_override).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Review Actions */}
          {sub.review_status === "pending_review" && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {!reviewAction ? (
                <>
                  <button onClick={() => setReviewAction("approved")}
                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 transition-colors"
                    data-testid={`approve-btn-${sub.id}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => setReviewAction("rejected")}
                    className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600 transition-colors"
                    data-testid={`reject-btn-${sub.id}`}>
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button onClick={() => setReviewAction("changes_requested")}
                    className="flex items-center gap-1 bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-purple-600 transition-colors"
                    data-testid={`changes-btn-${sub.id}`}>
                    <MessageSquare className="w-3.5 h-3.5" /> Request Changes
                  </button>
                </>
              ) : (
                <div className="flex-1 space-y-2">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" rows={2}
                    placeholder={`Notes for ${reviewAction === "approved" ? "approval" : reviewAction === "rejected" ? "rejection" : "changes requested"}...`}
                    data-testid="review-notes-input" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleReview(reviewAction)} disabled={submitting}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white transition-colors ${reviewAction === "approved" ? "bg-green-600 hover:bg-green-700" : reviewAction === "rejected" ? "bg-red-500 hover:bg-red-600" : "bg-purple-500 hover:bg-purple-600"}`}
                      data-testid="confirm-review-btn">
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Confirm {reviewAction === "approved" ? "Approval" : reviewAction === "rejected" ? "Rejection" : "Changes Request"}
                    </button>
                    <button onClick={() => { setReviewAction(null); setNotes(""); }}
                      className="text-xs text-slate-500 hover:text-slate-700" data-testid="cancel-review-btn">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review Info */}
          {sub.review_status !== "pending_review" && sub.reviewed_by && (
            <div className="text-xs text-slate-500 pt-2 border-t">
              Reviewed by {sub.reviewed_by} {sub.reviewed_at ? `on ${new Date(sub.reviewed_at).toLocaleDateString()}` : ""}
              {sub.review_notes && <span className="block mt-1 text-slate-600">Notes: {sub.review_notes}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminVendorSupplyReviewPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_review");
  const [importJobs, setImportJobs] = useState([]);
  const [tab, setTab] = useState("submissions");

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      const res = await api.get(`/api/admin/vendor-supply/submissions${params}`);
      setSubmissions(res.data || []);
    } catch {}
    setLoading(false);
  }, [filter]);

  const loadImportJobs = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/vendor-supply/import-jobs");
      setImportJobs(res.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadSubmissions();
    loadImportJobs();
  }, [loadSubmissions, loadImportJobs]);

  const handleReview = async (submissionId, status, notes) => {
    try {
      await api.post(`/api/admin/vendor-supply/submissions/${submissionId}/review`, { status, notes });
      loadSubmissions();
    } catch {}
  };

  const newFormatSubs = submissions.filter(s => s.product);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6" data-testid="admin-vendor-supply-review-page">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vendor Supply Review</h1>
          <p className="text-sm text-slate-500">Review vendor product submissions, variants, and import jobs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab("submissions")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "submissions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          data-testid="submissions-tab">
          Submissions
        </button>
        <button onClick={() => setTab("imports")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "imports" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          data-testid="imports-tab">
          Import Jobs
        </button>
      </div>

      {tab === "submissions" && (
        <>
          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { val: "pending_review", label: "Pending", color: "amber" },
              { val: "approved", label: "Approved", color: "green" },
              { val: "rejected", label: "Rejected", color: "red" },
              { val: "", label: "All", color: "slate" },
            ].map(f => (
              <button key={f.val} onClick={() => setFilter(f.val)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f.val ? `bg-${f.color}-100 text-${f.color}-700 ring-1 ring-${f.color}-200` : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                data-testid={`filter-${f.val || "all"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : newFormatSubs.length === 0 ? (
            <div className="text-center py-12 text-slate-400" data-testid="no-submissions">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No submissions found</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="submissions-list">
              {newFormatSubs.map(sub => (
                <SubmissionRow key={sub.id} sub={sub} onReview={handleReview} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "imports" && (
        <div data-testid="import-jobs-tab">
          {/* Template for admin to share with vendors */}
          <div className="flex items-center justify-between rounded-lg bg-slate-100 border px-4 py-3 mb-4">
            <p className="text-xs text-slate-600">Share this template with vendors to standardize product imports</p>
            <button onClick={() => {
              const cols = ["vendor_product_code","product_name","brand","category","subcategory","short_description","full_description","base_price_vat_inclusive","lead_time_days","supply_mode","variant_size","variant_color","variant_model","quantity","sku","image_1_url","image_2_url","image_3_url"];
              const sample = ["VP-001","HP LaserJet Pro","HP","Printers","Laser Printers","Compact printer","High-speed mono laser","1200000","5","in_stock","Standard","","","10","HP-LJ-001","https://example.com/img.jpg","",""];
              const notes = [["# NOTES: Category/subcategory must match catalog taxonomy. Each row = one product or variant. Delete note rows before uploading."]];
              const csv = [...notes,[cols],[sample]].map(r => r.map(c => { const s = String(c??""); return s.includes(",") ? `"${s}"` : s; }).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "konekt_product_import_template.csv"; a.click();
            }}
              className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
              data-testid="admin-download-template-btn">
              <Download className="w-3 h-3" /> Download Template
            </button>
          </div>

          {importJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No import jobs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {importJobs.map(job => (
                <div key={job.id} className="rounded-xl border bg-white p-4" data-testid={`import-job-${job.id}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{job.filename}</div>
                      <div className="text-xs text-slate-500">by {job.vendor_name} | {new Date(job.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${job.status === "confirmed" ? "bg-green-100 text-green-700" : job.status === "validated" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>Total: {job.total_rows}</span>
                    <span className="text-green-600">Valid: {job.valid_rows}</span>
                    <span className="text-red-500">Errors: {job.error_rows}</span>
                    {job.created_submissions?.length > 0 && <span>Created: {job.created_submissions.length} submissions</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
