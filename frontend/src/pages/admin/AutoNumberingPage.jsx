import React, { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, Eye, AlertTriangle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const documentTypes = [
  { key: "invoice", label: "Invoices", description: "Invoice numbers for billing" },
  { key: "quote", label: "Quotes", description: "Quote numbers for proposals" },
  { key: "order", label: "Orders", description: "Order numbers for purchases" },
  { key: "sku", label: "SKUs", description: "Product SKU codes" },
  { key: "delivery_note", label: "Delivery Notes", description: "Delivery note numbers" },
  { key: "grn", label: "GRN", description: "Goods received notes" },
];

const dateFormats = [
  { value: "YYYYMMDD", label: "YYYYMMDD (e.g., 20260317)" },
  { value: "YYMM", label: "YYMM (e.g., 2603)" },
  { value: "MMYY", label: "MMYY (e.g., 0326)" },
];

function FormatEditor({ docType, format, onChange, onPreview, preview }) {
  const [showResetWarning, setShowResetWarning] = useState(false);

  return (
    <div className="border rounded-2xl p-6 bg-white" data-testid={`format-editor-${docType.key}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-[#20364D]">{docType.label}</h3>
          <p className="text-sm text-slate-500">{docType.description}</p>
        </div>
        <button
          onClick={() => onPreview(docType.key)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-slate-50 transition text-sm"
        >
          <Eye className="w-4 h-4" /> Preview
        </button>
      </div>

      {preview && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <div className="text-xs text-slate-500 mb-1">Next number preview:</div>
          <div className="text-xl font-mono font-bold text-[#20364D]">{preview.preview}</div>
          <div className="text-xs text-slate-500 mt-1">
            Current sequence: {preview.current_sequence}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
          <input
            type="text"
            value={format.prefix || ""}
            onChange={(e) => onChange({ ...format, prefix: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 rounded-xl border focus:border-[#20364D] outline-none"
            placeholder="e.g., INV"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Separator</label>
          <select
            value={format.separator || "-"}
            onChange={(e) => onChange({ ...format, separator: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border focus:border-[#20364D] outline-none"
          >
            <option value="-">Dash (-)</option>
            <option value="/">Slash (/)</option>
            <option value="_">Underscore (_)</option>
            <option value="">None</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
            <input
              type="checkbox"
              checked={format.include_date !== false}
              onChange={(e) => onChange({ ...format, include_date: e.target.checked })}
              className="rounded border-slate-300"
            />
            Include Date
          </label>
          {format.include_date !== false && (
            <select
              value={format.date_format || "YYYYMMDD"}
              onChange={(e) => onChange({ ...format, date_format: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border focus:border-[#20364D] outline-none mt-2"
            >
              {dateFormats.map((df) => (
                <option key={df.value} value={df.value}>{df.label}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sequence Length</label>
          <select
            value={format.sequence_length || 4}
            onChange={(e) => onChange({ ...format, sequence_length: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-xl border focus:border-[#20364D] outline-none"
          >
            <option value={3}>3 digits (001)</option>
            <option value={4}>4 digits (0001)</option>
            <option value={5}>5 digits (00001)</option>
            <option value={6}>6 digits (000001)</option>
          </select>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={() => setShowResetWarning(!showResetWarning)}
          className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" /> Reset Sequence
        </button>
        {showResetWarning && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  This will reset the sequence counter. Use with caution.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Only reset if you're starting fresh or after a system migration.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AutoNumberingPage() {
  const [config, setConfig] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/api/admin/auto-numbering/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (docType) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/api/admin/auto-numbering/preview/${docType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPreviews((prev) => ({ ...prev, [docType]: data }));
      }
    } catch (err) {
      console.error("Failed to load preview:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/api/admin/auto-numbering/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Configuration saved successfully" });
      } else {
        setMessage({ type: "error", text: "Failed to save configuration" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  const updateFormat = (docType, newFormat) => {
    setConfig((prev) => ({
      ...prev,
      [`${docType}_format`]: newFormat,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#20364D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="auto-numbering-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#20364D]">Auto-Numbering</h1>
          <p className="text-slate-500 mt-1">
            Configure how document numbers are generated across the platform.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#20364D] text-white font-semibold hover:bg-[#2a4a66] transition disabled:opacity-50"
          data-testid="save-numbering-btn"
        >
          {saving ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Changes
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl p-4 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {documentTypes.map((docType) => (
          <FormatEditor
            key={docType.key}
            docType={docType}
            format={config[`${docType.key}_format`] || {}}
            onChange={(newFormat) => updateFormat(docType.key, newFormat)}
            onPreview={handlePreview}
            preview={previews[docType.key]}
          />
        ))}
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Settings className="w-6 h-6 text-[#20364D]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#20364D]">How it works</h3>
            <p className="text-slate-600 mt-2">
              Each document type has its own numbering format. Numbers are generated automatically
              when documents are created. The sequence increments with each new document.
            </p>
            <p className="text-slate-600 mt-2">
              <strong>Format:</strong> PREFIX + SEPARATOR + DATE + SEPARATOR + SEQUENCE
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Example: INV-20260317-0001 (Invoice created on March 17, 2026, sequence #1)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
