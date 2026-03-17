import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

export default function NumberingRulesPage() {
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    entity_type: "sku",
    entity_code: "SKU",
    format_string: "[CompanyCode]-[CountryCode]-[AlphaNum]",
    allow_manual_input: false,
    auto_generate: true,
    alnum_length: 6,
    is_active: true,
  });

  const entityTypes = [
    { value: "sku", label: "SKU" },
    { value: "quote", label: "Quote" },
    { value: "invoice", label: "Invoice" },
    { value: "order", label: "Order" },
    { value: "service_request", label: "Service Request" },
  ];

  const load = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await api.get("/api/admin/numbering-rules", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data || []);
    } catch (err) {
      console.error("Failed to load numbering rules:", err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      await api.post("/api/admin/numbering-rules", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
      setPreview("");
    } catch (err) {
      console.error("Failed to save rule:", err);
    } finally {
      setSaving(false);
    }
  };

  const previewValue = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await api.post("/api/admin/numbering-rules/preview", {
        entity_type: form.entity_type,
        company_code: "KON",
        country_code: "TZ",
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPreview(res.data?.preview || "");
    } catch (err) {
      console.error("Failed to preview:", err);
    }
  };

  const selectRule = (rule) => {
    setForm({
      entity_type: rule.entity_type,
      entity_code: rule.entity_code || "",
      format_string: rule.format_string || "",
      allow_manual_input: rule.allow_manual_input || false,
      auto_generate: rule.auto_generate !== false,
      alnum_length: rule.alnum_length || 6,
      is_active: rule.is_active !== false,
    });
    setPreview("");
  };

  return (
    <div className="space-y-8" data-testid="numbering-rules-page">
      <PageHeader
        title="Numbering Rules"
        subtitle="Configure how SKUs, quotes, invoices, orders, and service requests are generated."
      />

      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-6">
        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">Create / Update Rule</div>

          <div className="grid gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Entity Type</label>
              <select
                className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none"
                value={form.entity_type}
                onChange={(e) => setForm({ ...form, entity_type: e.target.value, entity_code: e.target.value.toUpperCase().slice(0, 3) })}
                data-testid="entity-type-select"
              >
                {entityTypes.map((et) => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Entity Code</label>
              <input
                className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none"
                placeholder="e.g., SKU, QT, INV"
                value={form.entity_code}
                onChange={(e) => setForm({ ...form, entity_code: e.target.value.toUpperCase() })}
                data-testid="entity-code-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format String</label>
              <input
                className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none font-mono text-sm"
                placeholder="[CompanyCode]-[EntityCode]-[YY]-[SEQ]"
                value={form.format_string}
                onChange={(e) => setForm({ ...form, format_string: e.target.value })}
                data-testid="format-string-input"
              />
            </div>

            <div className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4">
              <div className="font-medium mb-2">Supported tokens:</div>
              <code>[CompanyCode]</code>, <code>[CountryCode]</code>, <code>[EntityCode]</code>, <code>[YY]</code>, <code>[YYYY]</code>, <code>[MM]</code>, <code>[SEQ]</code>, <code>[AlphaNum]</code>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">AlphaNum Length</label>
              <input
                type="number"
                min="4"
                max="10"
                className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none"
                placeholder="6"
                value={form.alnum_length}
                onChange={(e) => setForm({ ...form, alnum_length: parseInt(e.target.value) || 6 })}
              />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50">
              <input 
                type="checkbox" 
                checked={form.auto_generate} 
                onChange={(e) => setForm({ ...form, auto_generate: e.target.checked })} 
                className="w-4 h-4 rounded"
              />
              <span className="font-medium">Auto Generate</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50">
              <input 
                type="checkbox" 
                checked={form.allow_manual_input} 
                onChange={(e) => setForm({ ...form, allow_manual_input: e.target.checked })} 
                className="w-4 h-4 rounded"
              />
              <span className="font-medium">Allow Manual Input</span>
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={save} 
              disabled={saving}
              className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition disabled:opacity-50"
              data-testid="save-rule-btn"
            >
              {saving ? "Saving..." : "Save Rule"}
            </button>
            <button 
              onClick={previewValue} 
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition"
              data-testid="preview-btn"
            >
              Preview
            </button>
          </div>

          {preview && (
            <div className="rounded-2xl border bg-slate-50 p-4 mt-6">
              <div className="text-sm text-slate-500">Preview</div>
              <div className="text-2xl font-bold font-mono text-[#20364D] mt-2">{preview}</div>
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">Configured Rules</div>

          {rows.length === 0 ? (
            <div className="text-slate-500 mt-6">No rules configured yet. Create your first rule.</div>
          ) : (
            <div className="space-y-4 mt-6">
              {rows.map((row) => (
                <button
                  key={row.id || row.entity_type}
                  onClick={() => selectRule(row)}
                  className="w-full text-left rounded-2xl border bg-slate-50 p-4 hover:border-[#20364D] hover:shadow transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[#20364D] capitalize">{row.entity_type.replace("_", " ")}</div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-slate-600 mt-2">{row.format_string}</div>
                  <div className="text-sm text-slate-500 mt-2">
                    Auto: {row.auto_generate !== false ? "Yes" : "No"} • Manual: {row.allow_manual_input ? "Yes" : "No"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
