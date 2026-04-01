import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/adminApi";
import {
  Percent, Plus, Trash2, Save, FlaskConical, ArrowRight, Pencil, X, Check,
} from "lucide-react";

const fmtCurrency = (v) => `TZS ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

const TYPE_LABELS = { percentage: "Percentage", fixed: "Fixed Amount", hybrid: "Hybrid" };

const EMPTY_TIER = { min: 0, max: 0, type: "percentage", value: 0, percent: 0, fixed: 0, label: "" };

function TierRow({ tier, index, onUpdate, onRemove, editing }) {
  if (!editing) {
    return (
      <tr className="border-b border-slate-100 text-sm" data-testid={`tier-row-${index}`}>
        <td className="px-4 py-3 font-medium text-[#20364D]">{tier.label || `Tier ${index + 1}`}</td>
        <td className="px-4 py-3 text-slate-600">{fmtCurrency(tier.min)}</td>
        <td className="px-4 py-3 text-slate-600">{fmtCurrency(tier.max)}</td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            tier.type === "percentage" ? "bg-blue-50 text-blue-700" :
            tier.type === "fixed" ? "bg-emerald-50 text-emerald-700" :
            "bg-amber-50 text-amber-700"
          }`}>{TYPE_LABELS[tier.type] || tier.type}</span>
        </td>
        <td className="px-4 py-3 text-slate-700 font-medium">
          {tier.type === "percentage" ? fmtPct(tier.value) :
           tier.type === "fixed" ? fmtCurrency(tier.value) :
           `${fmtPct(tier.percent)} + ${fmtCurrency(tier.fixed)}`}
        </td>
        <td className="px-4 py-3 text-right">
          <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600 p-1" data-testid={`remove-tier-${index}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      </tr>
    );
  }
  const upd = (field, val) => onUpdate(index, { ...tier, [field]: val });
  return (
    <tr className="border-b border-slate-100 text-sm bg-blue-50/30" data-testid={`tier-row-${index}`}>
      <td className="px-4 py-2">
        <input value={tier.label} onChange={e => upd("label", e.target.value)} placeholder="Tier label"
          className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" data-testid={`tier-label-${index}`} />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={tier.min} onChange={e => upd("min", Number(e.target.value))}
          className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" data-testid={`tier-min-${index}`} />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={tier.max} onChange={e => upd("max", Number(e.target.value))}
          className="w-28 rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" data-testid={`tier-max-${index}`} />
      </td>
      <td className="px-4 py-2">
        <select value={tier.type} onChange={e => upd("type", e.target.value)}
          className="rounded border border-slate-200 px-2 py-1.5 text-sm outline-none" data-testid={`tier-type-${index}`}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed Amount</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </td>
      <td className="px-4 py-2">
        {tier.type === "hybrid" ? (
          <div className="flex gap-2">
            <input type="number" value={tier.percent} onChange={e => upd("percent", Number(e.target.value))} placeholder="%"
              className="w-16 rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
            <input type="number" value={tier.fixed} onChange={e => upd("fixed", Number(e.target.value))} placeholder="Fixed"
              className="w-20 rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
          </div>
        ) : (
          <input type="number" value={tier.value} onChange={e => upd("value", Number(e.target.value))}
            className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" data-testid={`tier-value-${index}`} />
        )}
      </td>
      <td className="px-4 py-2 text-right">
        <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600 p-1" data-testid={`remove-tier-${index}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export default function MarginAdminPage() {
  const [tiers, setTiers] = useState([]);
  const [defaults, setDefaults] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [testPrice, setTestPrice] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getGlobalMargins();
      setTiers(res.data?.tiers || []);
      setDefaults(res.data?.defaults || []);
    } catch { setTiers([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadPreview = useCallback(async () => {
    try {
      const res = await adminApi.previewMargins();
      setPreview(res.data);
    } catch { setPreview(null); }
  }, []);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateGlobalMargins({ tiers });
      setEditing(false);
      loadPreview();
    } catch {}
    setSaving(false);
  };

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    setTiers([...tiers, { ...EMPTY_TIER, min: last ? last.max + 1 : 0, max: last ? last.max * 2 : 10000 }]);
  };

  const updateTier = (idx, updated) => {
    const next = [...tiers];
    next[idx] = updated;
    setTiers(next);
  };

  const removeTier = (idx) => setTiers(tiers.filter((_, i) => i !== idx));

  const resetToDefaults = () => {
    setTiers(JSON.parse(JSON.stringify(defaults)));
  };

  const runTest = async () => {
    if (!testPrice) return;
    setTestLoading(true);
    try {
      const res = await adminApi.resolvePrice({ base_price: Number(testPrice) });
      setTestResult(res.data);
    } catch { setTestResult(null); }
    setTestLoading(false);
  };

  return (
    <div className="space-y-6" data-testid="margin-admin-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Margin Configuration</h1>
          <p className="mt-0.5 text-sm text-slate-500">Configure global pricing tiers and test margin resolution.</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); load(); }} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50" data-testid="cancel-edit-btn">
                <X className="h-4 w-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#20364D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-40" data-testid="save-tiers-btn">
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Tiers"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-xl bg-[#20364D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560]" data-testid="edit-tiers-btn">
              <Pencil className="h-4 w-4" /> Edit Tiers
            </button>
          )}
        </div>
      </div>

      {/* Tier Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="tiers-table-section">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-[#20364D]">Global Margin Tiers</h2>
          {editing && (
            <div className="flex gap-2">
              <button onClick={resetToDefaults} className="text-xs text-blue-600 hover:underline" data-testid="reset-defaults-btn">Reset to defaults</button>
              <button onClick={addTier} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700" data-testid="add-tier-btn">
                <Plus className="h-3.5 w-3.5" /> Add Tier
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="tiers-table">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Label</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Min (TZS)</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Max (TZS)</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Markup</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Loading tiers...</td></tr>
              ) : tiers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No tiers configured. Click "Edit Tiers" to begin.</td></tr>
              ) : tiers.map((t, i) => (
                <TierRow key={i} tier={t} index={i} onUpdate={updateTier} onRemove={removeTier} editing={editing} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Test */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="pricing-test-section">
        <h2 className="text-sm font-bold text-[#20364D] mb-4">Test Pricing Resolution</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Base Price (TZS)</label>
            <input
              type="number"
              value={testPrice}
              onChange={e => setTestPrice(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              data-testid="test-price-input"
              onKeyDown={e => e.key === "Enter" && runTest()}
            />
          </div>
          <button
            onClick={runTest}
            disabled={!testPrice || testLoading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            data-testid="resolve-price-btn"
          >
            <FlaskConical className="h-4 w-4" /> {testLoading ? "Resolving..." : "Resolve Price"}
          </button>
        </div>
        {testResult && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4" data-testid="test-result">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Base Price</div>
                <div className="mt-1 text-lg font-extrabold text-[#20364D]">{fmtCurrency(testResult.base_price)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Final Price</div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700">{fmtCurrency(testResult.final_price)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Margin</div>
                <div className="mt-1 text-lg font-extrabold text-blue-700">
                  {fmtCurrency(testResult.final_price - testResult.base_price)}
                  <span className="ml-1 text-sm font-medium text-slate-500">
                    ({testResult.base_price ? fmtPct((testResult.final_price - testResult.base_price) / testResult.base_price * 100) : "0%"})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source</div>
                <div className="mt-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">{testResult.resolved_from}</span>
                  {testResult.tier?.label && <span className="ml-2 text-xs text-slate-500">{testResult.tier.label}</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {preview && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="preview-section">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-bold text-[#20364D]">Pricing Preview (Sample Amounts)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="preview-table">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Base Price</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"></th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Final Price</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Margin</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Margin %</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tier</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Source</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview?.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-[#20364D]">{fmtCurrency(r.base_price)}</td>
                    <td className="px-4 py-2.5 text-slate-300"><ArrowRight className="h-3.5 w-3.5" /></td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-700">{fmtCurrency(r.final_price)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{fmtCurrency(r.margin)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{fmtPct(r.margin_pct)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.tier || "-"}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{r.resolved_from}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
