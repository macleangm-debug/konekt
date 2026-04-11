import React, { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowRight, RotateCcw, Download } from "lucide-react";
import api from "@/lib/api";
import { safeDisplay } from "@/utils/safeDisplay";

function authHeaders() {
  const token = localStorage.getItem("partner_token") || localStorage.getItem("konekt_token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

const STEPS = { UPLOAD: "upload", PREVIEW: "preview", CONFIRMED: "confirmed" };

const TEMPLATE_COLUMNS = [
  "vendor_product_code", "product_name", "brand", "category", "subcategory",
  "short_description", "full_description", "base_price_vat_inclusive",
  "lead_time_days", "supply_mode", "variant_size", "variant_color",
  "variant_model", "quantity", "sku", "image_1_url", "image_2_url", "image_3_url",
];

const SAMPLE_ROW = [
  "VP-001", "HP LaserJet Pro M404dn", "HP", "Printers", "Laser Printers",
  "Compact mono laser printer", "High-speed mono laser with duplex and networking",
  "1200000", "5", "in_stock", "Standard", "", "",
  "10", "HP-LJ-M404-STD", "https://example.com/hp-m404.jpg", "", "",
];

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => {
    const s = String(c ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const noteRows = [
    ["# NOTES: Category and subcategory values must match your catalog taxonomy exactly."],
    ["# Each row can represent one product or one variant of a product."],
    ["# Required columns: product_name, category, base_price_vat_inclusive. Delete these note rows before uploading."],
  ];
  downloadCSV([...noteRows, TEMPLATE_COLUMNS, SAMPLE_ROW], "konekt_product_import_template.csv");
}

function downloadErrorRows(errorRows) {
  if (!errorRows?.length) return;
  const header = ["row_number", "errors", ...TEMPLATE_COLUMNS];
  const rows = errorRows.map(r => {
    const d = r.data || {};
    const p = d.product || {};
    const s = d.supply || {};
    const v = d.variant || {};
    return [
      r.row_number,
      (r.errors || []).join("; "),
      s.vendor_product_code || "", p.product_name || "", p.brand || "",
      p.category_name || "", p.subcategory_name || "",
      p.short_description || "", p.full_description || "",
      s.base_price_vat_inclusive || "", s.lead_time_days || "", s.supply_mode || "",
      v.size || "", v.color || "", v.model || "",
      v.quantity || s.default_quantity || "", v.sku || "",
      (p.images || [])[0] || "", (p.images || [])[1] || "", (p.images || [])[2] || "",
    ];
  });
  downloadCSV([header, ...rows], "konekt_import_errors.csv");
}

export default function VendorBulkImportPage() {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [importJob, setImportJob] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get("/api/vendor/products/import/jobs", { headers: authHeaders() });
      setImportHistory(res.data || []);
      setShowHistory(true);
    } catch {}
  }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      const ext = f.name.split(".").pop().toLowerCase();
      if (!["csv", "xls", "xlsx"].includes(ext)) {
        setError("Only CSV, XLS, and XLSX files are supported.");
        return;
      }
      setFile(f);
      setError("");
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    setValidating(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/vendor/products/import/validate", formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });
      setImportJob(res.data?.import_job);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setError(err.response?.data?.detail || "Validation failed");
    }
    setValidating(false);
  };

  const handleConfirm = async () => {
    if (!importJob) return;
    setConfirming(true);
    setError("");
    try {
      const res = await api.post(`/api/vendor/products/import/${importJob.id}/confirm`, {}, { headers: authHeaders() });
      setConfirmResult(res.data);
      setStep(STEPS.CONFIRMED);
    } catch (err) {
      setError(err.response?.data?.detail || "Confirmation failed");
    }
    setConfirming(false);
  };

  const reset = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setImportJob(null);
    setConfirmResult(null);
    setError("");
  };

  const validRows = importJob?.validation_result?.filter(r => r.valid) || [];
  const errorRows = importJob?.validation_result?.filter(r => !r.valid) || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6" data-testid="vendor-bulk-import-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bulk Import Products</h1>
            <p className="text-sm text-slate-500">Upload CSV, XLS, or XLSX files</p>
          </div>
        </div>
        <button onClick={loadHistory} className="text-xs text-slate-500 hover:text-slate-800 underline" data-testid="show-history-btn">
          Import History
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        {["Upload File", "Preview & Validate", "Confirm"].map((label, i) => {
          const stepKeys = [STEPS.UPLOAD, STEPS.PREVIEW, STEPS.CONFIRMED];
          const isActive = step === stepKeys[i];
          const isDone = stepKeys.indexOf(step) > i;
          return (
            <React.Fragment key={label}>
              {i > 0 && <div className={`flex-1 h-px ${isDone ? "bg-green-400" : "bg-slate-200"}`} />}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${isActive ? "bg-slate-900 text-white" : isDone ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : null}
                <span>{label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700" data-testid="import-error">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === STEPS.UPLOAD && (
        <div className="rounded-xl border bg-white p-6" data-testid="upload-step">
          {/* Template Download */}
          <div className="flex items-center justify-between rounded-lg bg-slate-900 text-white px-4 py-3 mb-5">
            <div>
              <p className="text-sm font-medium">Start with the import template</p>
              <p className="text-xs text-slate-400 mt-0.5">Pre-formatted CSV with all columns, a sample row, and notes</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
              data-testid="download-template-btn">
              <Download className="w-3.5 h-3.5" /> Download CSV Template
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-slate-400 transition-colors">
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-2">
              {file ? file.name : "Drop a file here or click to browse"}
            </p>
            <p className="text-xs text-slate-400 mb-4">Supported: CSV, XLS, XLSX</p>
            <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileSelect}
              className="hidden" id="bulk-file-input" data-testid="bulk-file-input" />
            <label htmlFor="bulk-file-input"
              className="inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm cursor-pointer transition-colors">
              Choose File
            </label>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileSpreadsheet className="w-4 h-4" />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
              <button onClick={handleValidate} disabled={validating}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                data-testid="validate-btn">
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Validate & Preview
              </button>
            </div>
          )}

          {/* Template Guide */}
          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-100 p-4">
            <h3 className="text-xs font-semibold text-slate-600 mb-2">Required Columns</h3>
            <div className="flex flex-wrap gap-1.5">
              {["product_name", "category", "base_price_vat_inclusive"].map(c => (
                <span key={c} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-mono">{c}</span>
              ))}
            </div>
            <h3 className="text-xs font-semibold text-slate-600 mt-3 mb-2">Optional Columns</h3>
            <div className="flex flex-wrap gap-1.5">
              {["brand", "subcategory", "short_description", "full_description", "lead_time_days", "supply_mode", "variant_size", "variant_color", "variant_model", "quantity", "sku", "vendor_product_code", "image_1_url", "image_2_url", "image_3_url"].map(c => (
                <span key={c} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === STEPS.PREVIEW && importJob && (
        <div data-testid="preview-step">
          {/* Summary */}
          <div className="rounded-xl border bg-white p-5 mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-900">{importJob.total_rows}</div>
                <div className="text-xs text-slate-500">Total Rows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{importJob.valid_rows}</div>
                <div className="text-xs text-green-600">Valid</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{importJob.error_rows}</div>
                <div className="text-xs text-red-500">Errors</div>
              </div>
            </div>
          </div>

          {/* Error Rows */}
          {errorRows.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 mb-4" data-testid="error-rows">
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Rows with Errors ({errorRows.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {errorRows.map(r => (
                  <div key={r.row_number} className="text-xs bg-white rounded-lg p-2 border border-red-100">
                    <span className="font-mono text-red-600">Row {r.row_number}:</span>
                    <span className="text-red-700 ml-1">{r.errors.join("; ")}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-500 mt-2">These rows will be skipped during import.</p>
              <button onClick={() => downloadErrorRows(errorRows)}
                className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                data-testid="download-errors-btn">
                <Download className="w-3 h-3" /> Download error rows as CSV
              </button>
            </div>
          )}

          {/* Valid Rows Preview */}
          {validRows.length > 0 && (
            <div className="rounded-xl border bg-white mb-4" data-testid="valid-rows-preview">
              <div className="px-4 py-3 border-b bg-green-50">
                <h3 className="text-sm font-semibold text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Valid Rows ({validRows.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Product Name</th>
                      <th className="px-3 py-2 text-left">Brand</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-left">Variant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validRows.slice(0, 50).map(r => (
                      <tr key={r.row_number} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-400">{r.row_number}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{r.data.product.product_name}</td>
                        <td className="px-3 py-2 text-slate-600">{safeDisplay(r.data.product.brand, "text")}</td>
                        <td className="px-3 py-2 text-slate-600">{r.data.product.category_name}</td>
                        <td className="px-3 py-2 text-right text-slate-800">{Number(r.data.supply.base_price_vat_inclusive).toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {safeDisplay([r.data.variant?.size, r.data.variant?.color, r.data.variant?.model].filter(Boolean).join(" / "), "text")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validRows.length > 50 && <p className="px-4 py-2 text-xs text-slate-400">Showing first 50 of {validRows.length} valid rows</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button onClick={reset} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700" data-testid="back-to-upload-btn">
              <RotateCcw className="w-4 h-4" /> Start Over
            </button>
            {validRows.length > 0 && (
              <button onClick={handleConfirm} disabled={confirming}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                data-testid="confirm-import-btn">
                {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Import ({validRows.length} products)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirmed */}
      {step === STEPS.CONFIRMED && (
        <div className="rounded-xl border bg-white p-8 text-center" data-testid="confirmed-step">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-green-800">Import Confirmed</h2>
          <p className="text-sm text-green-700 mt-1">
            {confirmResult?.created_count || 0} product submissions created as pending review.
          </p>
          <button onClick={reset}
            className="mt-6 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 transition-colors"
            data-testid="import-another-btn">
            Import Another File
          </button>
        </div>
      )}

      {/* Import History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[70vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}
            data-testid="import-history-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">Import History</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            {importHistory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No imports yet.</p>
            ) : (
              <div className="space-y-2">
                {importHistory.map(job => (
                  <div key={job.id} className="rounded-lg border p-3 text-sm" data-testid={`history-item-${job.id}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">{job.filename}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${job.status === "confirmed" ? "bg-green-100 text-green-700" : job.status === "validated" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>Total: {job.total_rows}</span>
                      <span>Valid: {job.valid_rows}</span>
                      <span>Errors: {job.error_rows}</span>
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
