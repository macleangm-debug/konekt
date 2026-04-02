import React, { useEffect, useState, useCallback } from "react";
import { Settings, Save, RotateCcw, Shield, Users, Truck, Clock } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { toast } from "sonner";

const SALES_METRIC_LABELS = {
  customer_rating: "Customer Rating",
  conversion_rate: "Conversion Rate",
  revenue_contribution: "Revenue Contribution",
  response_speed: "Response Speed",
  follow_up_compliance: "Follow-up Compliance",
};

const VENDOR_METRIC_LABELS = {
  timeliness: "Timeliness",
  quality: "Quality",
  responsiveness: "Responsiveness",
  rating: "Internal Rating",
  compliance: "Process Compliance",
};

function WeightSlider({ label, metricKey, value, onChange }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1" data-testid={`weight-${metricKey}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#20364D]">{label}</span>
        <span className="text-xs font-semibold text-slate-600">{pct}%</span>
      </div>
      <input
        type="range"
        min={0} max={50} step={1}
        value={pct}
        onChange={(e) => onChange(metricKey, parseInt(e.target.value) / 100)}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#20364D] bg-slate-200"
        data-testid={`weight-slider-${metricKey}`}
      />
    </div>
  );
}

function ThresholdInput({ label, field, value, onChange, color }) {
  return (
    <div className="flex items-center gap-3" data-testid={`threshold-${field}`}>
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-sm font-medium text-[#20364D] w-24">{label}</span>
      <input
        type="number" min={0} max={100}
        value={value}
        onChange={(e) => onChange(field, parseInt(e.target.value) || 0)}
        className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-center outline-none focus:border-blue-400"
        data-testid={`threshold-input-${field}`}
      />
      <span className="text-xs text-slate-400">%</span>
    </div>
  );
}

function RoleSection({ title, icon: Icon, weights, weightLabels, thresholds, minSample, onWeightChange, onThresholdChange, onMinSampleChange }) {
  const totalPct = Math.round(Object.values(weights).reduce((s, v) => s + v, 0) * 100);
  const isBalanced = totalPct >= 98 && totalPct <= 102;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid={`section-${title.toLowerCase()}`}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#20364D]">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#20364D]">{title} Performance</h2>
      </div>

      <div className="p-5 space-y-6">
        {/* Weights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Metric Weights</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isBalanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              Total: {totalPct}%
            </span>
          </div>
          <div className="space-y-3">
            {Object.entries(weightLabels).map(([key, label]) => (
              <WeightSlider key={key} label={label} metricKey={key} value={weights[key] || 0} onChange={onWeightChange} />
            ))}
          </div>
        </div>

        {/* Thresholds */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Zone Thresholds</h3>
          <div className="space-y-2">
            <ThresholdInput label="Excellent" field="excellent" value={thresholds.excellent} onChange={onThresholdChange} color="bg-emerald-500" />
            <ThresholdInput label="Safe" field="safe" value={thresholds.safe} onChange={onThresholdChange} color="bg-blue-500" />
            <ThresholdInput label="Risk" field="risk" value={thresholds.risk} onChange={onThresholdChange} color="bg-red-500" />
          </div>
        </div>

        {/* Min Sample */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Minimum Sample Size</h3>
          <div className="flex items-center gap-3">
            <input
              type="number" min={1} max={100}
              value={minSample}
              onChange={(e) => onMinSampleChange(parseInt(e.target.value) || 1)}
              className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-center outline-none focus:border-blue-400"
              data-testid="min-sample-input"
            />
            <span className="text-xs text-slate-500">data points required before scoring applies (below = "Developing" zone)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceGovernancePage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState([]);

  // Local editable state
  const [salesWeights, setSalesWeights] = useState({});
  const [salesThresholds, setSalesThresholds] = useState({ excellent: 85, safe: 70, risk: 50 });
  const [salesMinSample, setSalesMinSample] = useState(5);
  const [vendorWeights, setVendorWeights] = useState({});
  const [vendorThresholds, setVendorThresholds] = useState({ excellent: 85, safe: 70, risk: 50 });
  const [vendorMinSample, setVendorMinSample] = useState(3);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, auditRes] = await Promise.all([
        adminApi.getPerformanceGovernance(),
        adminApi.getPerformanceGovernanceAudit().catch(() => ({ data: { entries: [] } })),
      ]);
      const s = settingsRes.data;
      setSettings(s);
      setSalesWeights(s.sales?.weights || {});
      setSalesThresholds(s.sales?.thresholds || { excellent: 85, safe: 70, risk: 50 });
      setSalesMinSample(s.sales?.min_sample_size || 5);
      setVendorWeights(s.vendor?.weights || {});
      setVendorThresholds(s.vendor?.thresholds || { excellent: 85, safe: 70, risk: 50 });
      setVendorMinSample(s.vendor?.min_sample_size || 3);
      setAudit(auditRes.data?.entries || []);
    } catch {
      toast.error("Failed to load governance settings");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updatePerformanceGovernance({
        sales: { weights: salesWeights, thresholds: salesThresholds, min_sample_size: salesMinSample },
        vendor: { weights: vendorWeights, thresholds: vendorThresholds, min_sample_size: vendorMinSample },
      });
      toast.success("Performance governance settings saved");
      load();
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (!settings) return;
    setSalesWeights(settings.sales?.weights || {});
    setSalesThresholds(settings.sales?.thresholds || { excellent: 85, safe: 70, risk: 50 });
    setSalesMinSample(settings.sales?.min_sample_size || 5);
    setVendorWeights(settings.vendor?.weights || {});
    setVendorThresholds(settings.vendor?.thresholds || { excellent: 85, safe: 70, risk: 50 });
    setVendorMinSample(settings.vendor?.min_sample_size || 3);
    toast.info("Reset to last saved values");
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  if (loading) {
    return (
      <div className="space-y-5" data-testid="perf-governance-loading">
        <div><h1 className="text-2xl font-bold text-[#20364D]">Performance Governance</h1></div>
        <div className="py-16 text-center text-sm text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="performance-governance-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Performance Governance</h1>
          <p className="mt-0.5 text-sm text-slate-500">Configure scoring weights, zone thresholds, and minimum sample sizes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors" data-testid="reset-btn">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#20364D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-50 transition-colors" data-testid="save-governance-btn">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Last saved info */}
      {settings?.updated_at && (
        <div className="flex items-center gap-2 text-xs text-slate-400" data-testid="last-saved-info">
          <Clock className="h-3.5 w-3.5" />
          Last saved: {fmtDate(settings.updated_at)} by {settings.updated_by || "—"}
        </div>
      )}

      {/* Settings sections side by side */}
      <div className="grid gap-5 lg:grid-cols-2">
        <RoleSection
          title="Sales"
          icon={Users}
          weights={salesWeights}
          weightLabels={SALES_METRIC_LABELS}
          thresholds={salesThresholds}
          minSample={salesMinSample}
          onWeightChange={(k, v) => setSalesWeights(prev => ({ ...prev, [k]: v }))}
          onThresholdChange={(k, v) => setSalesThresholds(prev => ({ ...prev, [k]: v }))}
          onMinSampleChange={setSalesMinSample}
        />
        <RoleSection
          title="Vendor"
          icon={Truck}
          weights={vendorWeights}
          weightLabels={VENDOR_METRIC_LABELS}
          thresholds={vendorThresholds}
          minSample={vendorMinSample}
          onWeightChange={(k, v) => setVendorWeights(prev => ({ ...prev, [k]: v }))}
          onThresholdChange={(k, v) => setVendorThresholds(prev => ({ ...prev, [k]: v }))}
          onMinSampleChange={setVendorMinSample}
        />
      </div>

      {/* Audit log */}
      {audit.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="governance-audit-log">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
            <Shield className="h-4 w-4 text-slate-400" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Change History</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {audit.slice(0, 10).map((entry, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 text-sm" data-testid={`audit-entry-${i}`}>
                <div>
                  <span className="font-medium text-[#20364D]">{entry.changed_by || "System"}</span>
                  <span className="text-slate-400 ml-2">updated settings</span>
                </div>
                <span className="text-xs text-slate-400">{fmtDate(entry.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
