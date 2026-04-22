import React, { useState, useMemo, useRef } from "react";
import api from "../../lib/api";
import partnerApi from "../../lib/partnerApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Sparkles, ClipboardPaste, FileText, Image as ImageIcon, Camera } from "lucide-react";

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
  // AI mode state
  const [uploadMode, setUploadMode] = useState("spreadsheet"); // spreadsheet | ai
  const [aiKind, setAiKind] = useState("pdf"); // pdf | image | photos | text
  const [aiText, setAiText] = useState("");
  const [aiFiles, setAiFiles] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);
  const aiFileRef = useRef(null);

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

  const handleAiSubmit = async () => {
    // Validate per kind
    if (aiKind === "text" && !aiText.trim()) { toast.error("Paste some text first"); return; }
    if ((aiKind === "pdf" || aiKind === "image") && aiFiles.length === 0) { toast.error("Choose a file first"); return; }
    if (aiKind === "photos" && aiFiles.length === 0) { toast.error("Select at least one photo"); return; }

    setAiBusy(true);
    const fd = new FormData();
    fd.append("source", aiKind);
    if (partnerIdOverride) fd.append("partner_id_override", partnerIdOverride);
    fd.append("target", "partner_catalog");
    if (aiKind === "text") {
      fd.append("text", aiText);
    } else if (aiKind === "photos") {
      aiFiles.forEach((f) => fd.append("files", f));
    } else {
      fd.append("file", aiFiles[0]);
    }
    try {
      const r = await http.post("/api/smart-import/ai-parse", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPreview(r.data);
      setColumnMap(r.data.auto_map || {});
      const cats = await http.get("/api/smart-import/categories").catch(() => ({ data: { categories: [] } }));
      setKonektCategories(cats.data.categories || []);
      const defaults = {};
      (r.data.vendor_category_groups || []).forEach(g => { defaults[g.label] = ""; });
      setCategoryMap(defaults);
      setStep(2);
      toast.success(`AI extracted ${r.data.total_rows} product${r.data.total_rows === 1 ? "" : "s"}. Review below.`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI extraction failed");
    } finally {
      setAiBusy(false);
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
          <p className="text-sm text-slate-500 mt-1">Upload an Excel/CSV of up to 5,000 products, or let Gemini AI pull products from a PDF, photos, or pasted text. We auto-detect columns, map to Konekt categories, generate SKUs, and import in minutes.</p>
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
        <div className="space-y-4" data-testid="step-upload">
          {/* Mode tabs */}
          <div className="bg-white rounded-2xl border p-1 inline-flex gap-1" data-testid="upload-mode-tabs">
            <button
              onClick={() => setUploadMode("spreadsheet")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${uploadMode === "spreadsheet" ? "bg-[#20364D] text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}
              data-testid="mode-spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel / CSV
            </button>
            <button
              onClick={() => setUploadMode("ai")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${uploadMode === "ai" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}
              data-testid="mode-ai"
            >
              <Sparkles className="w-4 h-4" /> AI Import
              <span className="text-[9px] uppercase tracking-wide bg-white/30 px-1.5 py-0.5 rounded">Beta</span>
            </button>
          </div>

          {uploadMode === "spreadsheet" && (
            <div className="bg-white rounded-2xl border-2 border-dashed p-10 text-center space-y-4"
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

          {uploadMode === "ai" && (
            <div className="bg-gradient-to-br from-indigo-50 via-white to-white rounded-2xl border border-indigo-100 p-6 space-y-5" data-testid="step-ai-import">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#20364D]">AI-assisted extraction</h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    Upload a PDF catalog, paste rows from your inbox, or snap photos of a printed price list —
                    Gemini will pull out the products and route them through the regular review step. You'll still
                    confirm everything before committing.
                  </p>
                </div>
              </div>

              {/* Kind picker */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="ai-kind-picker">
                {[
                  { k: "pdf", label: "PDF catalog", icon: FileText },
                  { k: "image", label: "Single image", icon: ImageIcon },
                  { k: "photos", label: "Photo batch", icon: Camera },
                  { k: "text", label: "Paste text", icon: ClipboardPaste },
                ].map(({ k, label, icon: Icon }) => (
                  <button
                    key={k}
                    onClick={() => { setAiKind(k); setAiFiles([]); setAiText(""); }}
                    className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border-2 transition text-xs font-semibold ${aiKind === k ? "border-indigo-500 bg-white text-indigo-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                    data-testid={`ai-kind-${k}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Kind-specific input */}
              {aiKind === "text" && (
                <textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  rows={10}
                  placeholder="Paste rows from your supplier's email, WhatsApp, or a PDF.&#10;Mixed formats are OK — Gemini will normalise them."
                  className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono resize-y"
                  data-testid="ai-text-input"
                />
              )}

              {(aiKind === "pdf" || aiKind === "image" || aiKind === "photos") && (
                <div>
                  <input
                    ref={aiFileRef}
                    type="file"
                    accept={aiKind === "pdf" ? ".pdf" : "image/*"}
                    multiple={aiKind === "photos"}
                    className="hidden"
                    onChange={(e) => setAiFiles(Array.from(e.target.files || []))}
                    data-testid="ai-file-input"
                  />
                  <button
                    type="button"
                    onClick={() => aiFileRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/40 transition"
                    data-testid="ai-file-btn"
                  >
                    <UploadCloud className="w-8 h-8 mx-auto text-indigo-500" />
                    <div className="text-sm font-semibold text-slate-700 mt-2">
                      {aiFiles.length
                        ? `${aiFiles.length} file${aiFiles.length === 1 ? "" : "s"} selected`
                        : aiKind === "pdf" ? "Choose a PDF catalog (max 40 MB)"
                        : aiKind === "image" ? "Choose one catalog photo (max 20 MB)"
                        : "Choose up to 25 photos (max 20 MB each)"}
                    </div>
                    {aiFiles.length > 0 && (
                      <div className="text-[11px] text-slate-500 mt-1 truncate max-w-sm mx-auto">
                        {aiFiles.slice(0, 3).map(f => f.name).join(", ")}{aiFiles.length > 3 ? ` +${aiFiles.length - 3} more` : ""}
                      </div>
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  onClick={handleAiSubmit}
                  disabled={aiBusy}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  data-testid="ai-extract-btn"
                >
                  {aiBusy
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting…</>
                    : <><Sparkles className="w-4 h-4 mr-2" /> Extract with AI</>}
                </Button>
                <div className="text-[11px] text-slate-500">
                  Powered by Gemini 3 · You review before committing · ~15–60 s per page
                </div>
              </div>
            </div>
          )}
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
