import React, { useState } from "react";
import { Upload, FileJson, Check, AlertCircle } from "lucide-react";
import partnerApi from "../../lib/partnerApi";

export default function PartnerBulkUploadPage() {
  const [jsonText, setJsonText] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const templateJson = JSON.stringify([
    {
      sku: "SKU-001",
      name: "Sample Product",
      description: "Product description",
      category: "promotional",
      base_partner_price: 10000,
      partner_available_qty: 100,
      partner_status: "in_stock",
      lead_time_days: 2,
      min_order_qty: 10,
      unit: "piece"
    }
  ], null, 2);

  const loadTemplate = () => {
    setJsonText(templateJson);
    setValidationResult(null);
    setUploadResult(null);
  };

  const validateUpload = async () => {
    try {
      const rows = JSON.parse(jsonText);
      setLoading(true);
      const res = await partnerApi.post("/api/partner-bulk-upload/validate", { rows });
      setValidationResult(res.data);
      setUploadResult(null);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert("Invalid JSON format. Please check your data.");
      } else {
        alert(err?.response?.data?.detail || "Validation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const performUpload = async () => {
    try {
      const rows = JSON.parse(jsonText);
      setLoading(true);
      const res = await partnerApi.post("/api/partner-bulk-upload/catalog", { rows });
      setUploadResult(res.data);
      setValidationResult(null);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert("Invalid JSON format. Please check your data.");
      } else {
        alert(err?.response?.data?.detail || "Upload failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partner-bulk-upload-page">
      <div>
        <h1 className="text-4xl font-bold text-[#20364D]">Bulk Upload</h1>
        <p className="text-slate-600 mt-1">Upload multiple catalog items at once using JSON format</p>
      </div>

      {/* Instructions */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold mb-3">How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-600">
          <li>Click "Load Template" to see the required JSON format</li>
          <li>Replace the sample data with your items</li>
          <li>Click "Validate" to check for errors before uploading</li>
          <li>Click "Upload" to import your items</li>
        </ol>
        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
          <p className="text-sm text-slate-500">
            <strong>Note:</strong> Existing SKUs will be updated. New SKUs will be inserted.
          </p>
        </div>
      </div>

      {/* JSON Input */}
      <div className="rounded-3xl border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">JSON Data</h2>
          <button
            onClick={loadTemplate}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
            data-testid="load-template-btn"
          >
            <FileJson className="w-4 h-4" />
            Load Template
          </button>
        </div>

        <textarea
          className="w-full border rounded-xl px-4 py-3 min-h-[300px] font-mono text-sm"
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setValidationResult(null);
            setUploadResult(null);
          }}
          placeholder="Paste your JSON array here or click Load Template..."
          data-testid="json-input"
        />

        <div className="flex gap-3">
          <button
            onClick={validateUpload}
            disabled={!jsonText.trim() || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-50"
            data-testid="validate-btn"
          >
            <AlertCircle className="w-5 h-5" />
            {loading ? "Validating..." : "Validate"}
          </button>
          <button
            onClick={performUpload}
            disabled={!jsonText.trim() || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68] disabled:opacity-50"
            data-testid="upload-btn"
          >
            <Upload className="w-5 h-5" />
            {loading ? "Uploading..." : "Upload Items"}
          </button>
        </div>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="validation-result">
          <h2 className="text-xl font-bold">Validation Result</h2>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Valid Rows</div>
              <div className="text-2xl font-bold text-green-600">{validationResult.valid_count}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">To Insert</div>
              <div className="text-2xl font-bold text-blue-600">{validationResult.insert_count}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">To Update</div>
              <div className="text-2xl font-bold text-amber-600">{validationResult.update_count}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Errors</div>
              <div className="text-2xl font-bold text-red-600">{validationResult.error_count}</div>
            </div>
          </div>

          {validationResult.errors?.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-red-600">Errors</h3>
              {validationResult.errors.map((err, idx) => (
                <div key={idx} className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">
                  Row {err.row} {err.sku && `(${err.sku})`}: {err.errors?.join(", ") || err.error}
                </div>
              ))}
            </div>
          )}

          {validationResult.preview?.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Preview (first 10 valid items)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2">SKU</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Category</th>
                      <th className="text-right px-3 py-2">Price</th>
                      <th className="text-right px-3 py-2">Qty</th>
                      <th className="text-center px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {validationResult.preview.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-mono">{item.sku}</td>
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2">{item.category || "-"}</td>
                        <td className="px-3 py-2 text-right">{Number(item.base_partner_price || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{item.partner_available_qty || 0}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${item._action === "insert" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                            {item._action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
            <h2 className="text-xl font-bold">Upload Complete</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-green-50 p-4">
              <div className="text-sm text-green-600">Inserted</div>
              <div className="text-2xl font-bold text-green-700">{uploadResult.inserted}</div>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="text-sm text-blue-600">Updated</div>
              <div className="text-2xl font-bold text-blue-700">{uploadResult.updated}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Total Processed</div>
              <div className="text-2xl font-bold">{uploadResult.total_processed}</div>
            </div>
          </div>

          {uploadResult.errors?.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-red-600">Errors during upload</h3>
              {uploadResult.errors.map((err, idx) => (
                <div key={idx} className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">
                  Row {err.row} {err.sku && `(${err.sku})`}: {err.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
