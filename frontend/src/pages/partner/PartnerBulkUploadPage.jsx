import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Download, Check, AlertCircle, FileText, X, Eye } from "lucide-react";
import partnerApi from "../../lib/partnerApi";

export default function PartnerBulkUploadPage() {
  const [file, setFile] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null); // 'preview' | 'commit'
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewResult(null);
      setUploadResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const ext = droppedFile.name.toLowerCase();
      if (ext.endsWith('.csv') || ext.endsWith('.xlsx')) {
        setFile(droppedFile);
        setPreviewResult(null);
        setUploadResult(null);
      } else {
        alert("Please upload a CSV or XLSX file");
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const downloadTemplate = async () => {
    try {
      const res = await partnerApi.get("/api/partner-import/template/csv", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "konekt_listing_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download template");
    }
  };

  const previewImport = async () => {
    if (!file) return;
    setLoading(true);
    setLoadingType('preview');
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await partnerApi.post("/api/partner-import/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreviewResult(res.data);
      setUploadResult(null);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : "Preview failed. Please check your file format.");
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const commitImport = async () => {
    if (!file) return;
    setLoading(true);
    setLoadingType('commit');
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await partnerApi.post("/api/partner-import/commit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(res.data);
      setPreviewResult(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'object' && detail.errors) {
        alert(`Import failed: ${detail.message}\n\nFirst error: ${detail.errors[0]?.errors?.join(', ') || 'Unknown'}`);
      } else {
        alert(typeof detail === 'string' ? detail : "Import failed. Please preview first to check for errors.");
      }
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewResult(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partner-bulk-upload-page">
      <div>
        <h1 className="text-4xl font-bold text-[#20364D]">Bulk Upload</h1>
        <p className="text-slate-600 mt-1">Import multiple catalog items using CSV or Excel files</p>
      </div>

      {/* Instructions */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold mb-3">How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-600">
          <li>Download our CSV template with all required columns</li>
          <li>Fill in your product/service data (one item per row)</li>
          <li>Upload the file and click "Preview" to check for errors</li>
          <li>Fix any validation errors shown in the preview</li>
          <li>Click "Commit Import" to submit items for review</li>
        </ol>
        <div className="mt-4 flex gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
            data-testid="download-template-btn"
          >
            <Download className="w-4 h-4" />
            Download CSV Template
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="rounded-3xl border bg-white p-6 space-y-4">
        <h2 className="text-xl font-bold">Upload File</h2>
        
        {!file ? (
          <div
            className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-[#20364D] transition"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            data-testid="file-drop-zone"
          >
            <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 font-medium">Drop your CSV or XLSX file here</p>
            <p className="text-sm text-slate-400 mt-1">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-input"
            />
          </div>
        ) : (
          <div className="border rounded-2xl p-4 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-2 hover:bg-slate-200 rounded-lg transition"
              data-testid="clear-file-btn"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        )}

        {file && (
          <div className="flex gap-3">
            <button
              onClick={previewImport}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-50"
              data-testid="preview-btn"
            >
              <Eye className="w-5 h-5" />
              {loading && loadingType === 'preview' ? "Previewing..." : "Preview Import"}
            </button>
            <button
              onClick={commitImport}
              disabled={loading || !previewResult || previewResult.error_count > 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68] disabled:opacity-50"
              data-testid="commit-btn"
            >
              <Upload className="w-5 h-5" />
              {loading && loadingType === 'commit' ? "Importing..." : "Commit Import"}
            </button>
          </div>
        )}
        
        {!previewResult && file && (
          <p className="text-sm text-slate-500 text-center">
            Click "Preview Import" first to validate your data before committing
          </p>
        )}
      </div>

      {/* Preview Result */}
      {previewResult && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="preview-result">
          <h2 className="text-xl font-bold">Preview Result</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Total Rows</div>
              <div className="text-2xl font-bold">{previewResult.total_rows}</div>
            </div>
            <div className="rounded-xl bg-green-50 p-4">
              <div className="text-sm text-green-600">Valid Rows</div>
              <div className="text-2xl font-bold text-green-700">{previewResult.valid_count}</div>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <div className="text-sm text-red-600">Errors</div>
              <div className="text-2xl font-bold text-red-700">{previewResult.error_count}</div>
            </div>
          </div>

          {previewResult.errors?.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Validation Errors (fix these before importing)
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {previewResult.errors.map((err, idx) => (
                  <div key={idx} className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">
                    <span className="font-medium">Row {err.row_number}</span>
                    {err.sku && <span className="text-red-500"> ({err.sku})</span>}
                    : {err.errors?.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewResult.preview_rows?.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Preview (first {previewResult.preview_count} rows)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2">SKU</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Category</th>
                      <th className="text-right px-3 py-2">Price</th>
                      <th className="text-right px-3 py-2">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewResult.preview_rows.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${item.listing_type === 'service' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.listing_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2">{item.category || "-"}</td>
                        <td className="px-3 py-2 text-right">{Number(item.base_partner_price || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{item.partner_available_qty || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {previewResult.valid_count > 0 && previewResult.error_count === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">
                All {previewResult.valid_count} rows are valid and ready to import!
              </span>
            </div>
          )}
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="upload-result">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Import Complete</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-green-50 p-4">
              <div className="text-sm text-green-600">Items Imported</div>
              <div className="text-2xl font-bold text-green-700">{uploadResult.inserted_count}</div>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <div className="text-sm text-amber-600">Status</div>
              <div className="text-lg font-bold text-amber-700">Submitted for Review</div>
            </div>
          </div>

          <p className="text-slate-600">
            Your listings have been submitted and are pending admin approval. 
            You'll be able to see them in your catalog once approved.
          </p>
        </div>
      )}

      {/* Field Reference */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold mb-4">Field Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2">Field</th>
                <th className="text-left px-3 py-2">Required</th>
                <th className="text-left px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="px-3 py-2 font-mono">listing_type</td><td className="px-3 py-2">Yes</td><td className="px-3 py-2">"product" or "service"</td></tr>
              <tr><td className="px-3 py-2 font-mono">product_family</td><td className="px-3 py-2">For products</td><td className="px-3 py-2">promotional, office_equipment, stationery, consumables, spare_parts</td></tr>
              <tr><td className="px-3 py-2 font-mono">service_family</td><td className="px-3 py-2">For services</td><td className="px-3 py-2">printing, creative, maintenance, branding, installation</td></tr>
              <tr><td className="px-3 py-2 font-mono">sku</td><td className="px-3 py-2">Yes</td><td className="px-3 py-2">Your unique product/service code</td></tr>
              <tr><td className="px-3 py-2 font-mono">slug</td><td className="px-3 py-2">Yes</td><td className="px-3 py-2">URL-friendly identifier (e.g., branded-mug-white)</td></tr>
              <tr><td className="px-3 py-2 font-mono">name</td><td className="px-3 py-2">Yes</td><td className="px-3 py-2">Display name</td></tr>
              <tr><td className="px-3 py-2 font-mono">category</td><td className="px-3 py-2">Yes</td><td className="px-3 py-2">Main category</td></tr>
              <tr><td className="px-3 py-2 font-mono">base_partner_price</td><td className="px-3 py-2">Yes</td><td className="px-3 py-2">Your price to Konekt</td></tr>
              <tr><td className="px-3 py-2 font-mono">partner_available_qty</td><td className="px-3 py-2">No</td><td className="px-3 py-2">Quantity allocated for orders</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
