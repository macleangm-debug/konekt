import React, { useState, useMemo, useRef } from "react";
import api from "../../lib/api";
import partnerApi from "../../lib/partnerApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

/**
 * Smart Bulk Import wizard — 4 steps:
 *   1. Upload file
 *   2. Map columns (which file column = product name? vendor SKU? price? etc.)
 *   3. Map vendor categories → Konekt categories (triggers Konekt SKU generation)
 *   4. Review + commit
 *
 * Works for both:
 *   - mode="partner"  → vendor uploading their own catalog (uses partnerApi)
 *   - mode="admin"    → Ops staff importing on behalf of a vendor (uses api)
 */
export default function SmartBulkImportPage({ mode = "admin", partnerIdOverride = "", onDone }) {
  const http = mode === "partner" ? partnerApi : api;
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [columnMap, setColumnMap] = useState({});
  const [categoryMap, setCategoryMap] = useState({});
  const [konektCategories, setKonektCategories] = useState([]);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const canonicalFields = [
    { key: "name", label: "Product name", required: true },
    { key: "vendor_sku", label: "Vendor's SKU (their own code)" },
    { key: "category", label: "Category / product type" },
    { key: "vendor_cost", label: "Vendor cost / buy price" },
    { key: "stock", label: "Stock / quantity available" },
    { key: "unit", label: "Unit of measure" },
    { key: "description", label: "Description / specs" },
    { key: "brand", label: "Brand" },
  ];

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    if (partnerIdOverride) fd.append("partner_id_override", partnerIdOverride);
    fd.append("target", mode === "admin" ? "partner_catalog" : "partner_catalog");
    try {
      const r = await http.post("/api/smart-import/preview", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPreview(r.data);
      setColumnMap(r.data.auto_map || {});
      // Load Konekt categories for the mapping step
      const cats = await http.get("/api/smart-import/categories").catch(() => ({ data: { categories: [] } }));
      setKonektCategories(cats.data.categories || []);
      // Default category mapping — blank; user will pick
      const defaults = {};
      (r.data.vendor_category_groups || []).forEach(g => { defaults[g.label] = ""; });
      setCategoryMap(defaults);
      setStep(2);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to read file");
    } finally {
      setUploading(false);
    }
  };

  const commit = async () => {
    if (!columnMap.name) { toast.error("Please map the Product name column first"); return; }
    setCommitting(true);
    try {
      const r = await http.post("/api/smart-import/commit", {
        session_id: preview.session_id,
        column_mapping: columnMap,
        category_mapping: categoryMap,
      });
      setResult(r.data);
      setStep(4);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setCommitting(false);
    }
  };

  const mappedColumns = useMemo(() => Object.values(columnMap).filter(Boolean), [columnMap]);
  const unmappedRequired = canonicalFields.filter(f => f.required && !columnMap[f.key]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5" data-testid="smart-import-page">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#20364D] flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" /> Smart Product Import
          </h1>
          <p className="text-sm text-slate-500 mt-1">Upload an Excel or CSV file of up to 5,000 products. We'll auto-detect your columns, map them to Konekt categories, generate Konekt SKUs, and import in minutes.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-xl border p-4" data-testid="import-stepper">
        <div className="flex items-center justify-between overflow-x-auto">
          {[
            { n: 1, label: "Upload file" },
            { n: 2, label: "Map columns" },
            { n: 3, label: "Map categories" },
            { n: 4, label: "Done" },
          ].map((s, i, arr) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-[#20364D] text-white ring-4 ring-[#20364D]/15" : "bg-slate-100 text-slate-400"
                  }`}>{done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}</div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${active ? "text-[#20364D]" : done ? "text-emerald-700" : "text-slate-400"}`}>{s.label}</span>
                </div>
                {i < arr.length - 1 && <div className={`h-0.5 flex-1 mx-2 min-w-[12px] ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border-2 border-dashed p-10 text-center space-y-4" data-testid="step-upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-[#20364D]" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#20364D]">Drop your file here</h3>
            <p className="text-sm text-slate-500 mt-1">or click below to browse. Accepts .xlsx, .xls, .csv (max 25 MB / ~5,000 rows).</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} data-testid="file-input" />
          <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="choose-file-btn">
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            {uploading ? "Reading file..." : "Choose file"}
          </Button>
          <div className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
            Tip: any column order is fine. We'll auto-detect columns like "Item", "Code", "Price", etc.
          </div>
        </div>
      )}

      {/* STEP 2: Map columns */}
      {step === 2 && preview && (
        <div className="space-y-4" data-testid="step-map-columns">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-[#20364D]">Map your columns</h3>
                <p className="text-xs text-slate-500">Tell us which column is what. We've auto-picked — just confirm or adjust.</p>
              </div>
              <div className="text-[11px] text-slate-400">{preview.total_rows.toLocaleString()} rows • {preview.headers.length} columns in your file</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {canonicalFields.map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label} {f.required && <span className="text-red-500">*</span>}</Label>
                  <select
                    value={columnMap[f.key] || ""}
                    onChange={(e) => setColumnMap(m => ({ ...m, [f.key]: e.target.value || null }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    data-testid={`map-${f.key}`}>
                    <option value="">— Not in my file —</option>
                    {preview.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Sample preview */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">Sample rows (first 8)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="sample-table">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {preview.headers.map(h => {
                      const mappedTo = Object.entries(columnMap).find(([, v]) => v === h)?.[0];
                      return (
                        <th key={h} className="text-left px-3 py-2 font-semibold">
                          <div className="truncate">{h}</div>
                          {mappedTo && <Badge className="bg-[#D4A843] text-[#20364D] text-[9px] mt-0.5">{mappedTo}</Badge>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(preview.sample || []).map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {preview.headers.map(h => (
                        <td key={h} className="px-3 py-1.5 text-slate-700 truncate max-w-[200px]">{String(row[h] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)} data-testid="back-to-upload"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button className="bg-[#20364D]" disabled={unmappedRequired.length > 0} onClick={() => setStep(3)} data-testid="next-categories">
              Next: Map categories <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Map categories */}
      {step === 3 && preview && (
        <div className="space-y-4" data-testid="step-map-categories">
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4">
            <div className="text-sm font-bold text-amber-900">Map your groups to Konekt categories</div>
            <div className="text-xs text-amber-800 mt-0.5">Each Konekt category has a short code (e.g. OEQ for Office Equipment). We'll use it to generate each product's Konekt SKU like <code className="bg-white px-1 rounded">KNT-TZ-OEQ-A7K92M</code>.</div>
          </div>
          {(preview.vendor_category_groups || []).length === 0 ? (
            <div className="bg-white rounded-xl border p-6 text-center text-sm text-slate-500" data-testid="no-categories">
              No "Category" column was mapped. All products will go under the default category you pick below.
              <select className="mt-3 w-full border rounded-xl px-3 py-2 text-sm bg-white" value={categoryMap.__default__ || ""} onChange={(e) => setCategoryMap(m => ({ ...m, __default__: e.target.value }))} data-testid="default-category">
                <option value="">— Select Konekt category —</option>
                {konektCategories.map(k => <option key={k.name} value={k.name}>{k.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="text-left px-4 py-2.5 font-semibold">Your label</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Products</th>
                    <th className="text-left px-3 py-2.5 font-semibold w-[50%]">Konekt category</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.vendor_category_groups.map((g, i) => (
                    <tr key={g.label} className="border-b last:border-0" data-testid={`cat-row-${i}`}>
                      <td className="px-4 py-2 font-semibold text-[#20364D] truncate">{g.label}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{g.count.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <select className="w-full border rounded-xl px-3 py-1.5 text-sm bg-white"
                          value={categoryMap[g.label] || ""}
                          onChange={(e) => setCategoryMap(m => ({ ...m, [g.label]: e.target.value }))}
                          data-testid={`cat-select-${i}`}>
                          <option value="">— Skip (leave uncategorised) —</option>
                          {konektCategories.map(k => <option key={k.name} value={k.name}>{k.name}{k.code ? ` (${k.code})` : ""}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)} data-testid="back-to-columns"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={committing} onClick={commit} data-testid="commit-btn">
              {committing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Import {preview.total_rows.toLocaleString()} products
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Result */}
      {step === 4 && result && (
        <div className="space-y-4" data-testid="step-result">
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-extrabold text-emerald-800">Import complete</h3>
            <div className="grid grid-cols-3 gap-3 mt-4 max-w-md mx-auto">
              <div><div className="text-2xl font-extrabold text-emerald-700">{result.imported}</div><div className="text-xs text-slate-600">Imported</div></div>
              <div><div className="text-2xl font-extrabold text-blue-700">{result.updated}</div><div className="text-xs text-slate-600">Updated</div></div>
              <div><div className="text-2xl font-extrabold text-amber-600">{result.skipped}</div><div className="text-xs text-slate-600">Skipped</div></div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4" data-testid="error-list">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2"><AlertCircle className="w-4 h-4" /> {result.errors.length} rows had issues (showing first 50)</div>
              <div className="max-h-60 overflow-y-auto text-xs space-y-1 font-mono">
                {result.errors.slice(0, 50).map((e, i) => (
                  <div key={i} className="text-amber-900">Row {e.row}: {e.reason}</div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => { setStep(1); setFile(null); setPreview(null); setResult(null); }} data-testid="import-another">Import another file</Button>
            {onDone && <Button onClick={onDone}>Done</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
