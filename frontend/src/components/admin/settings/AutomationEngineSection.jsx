import React, { useEffect, useState, useCallback } from "react";
import api from "../../../lib/api";
import { toast } from "sonner";
import {
  Bot,
  Play,
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  AlertCircle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import SettingsSectionCard from "./SettingsSectionCard";

const POOL_LABELS = {
  promotion: "Promotion share",
  referral: "Referral share",
  sales: "Sales share (assisted)",
  affiliate: "Affiliate share (assisted)",
  reserve: "Reserve pool",
  platform_margin: "Platform margin",
};

const POOL_DESCRIPTIONS = {
  promotion: "Default discount funding bucket.",
  referral: "Margin earmarked for the customer referral program.",
  sales: "Margin earmarked for assisted sales commissions.",
  affiliate: "Margin earmarked for affiliate partner commissions.",
  reserve: "Untouched safety reserve — keep OFF unless you know why.",
  platform_margin: "Protected platform margin — eating this loses revenue. Keep OFF.",
};

const CADENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "every_3_days", label: "Every 3 days" },
  { value: "weekly", label: "Weekly" },
];

function NumberRow({ label, value, onChange, min = 0, max = 1000, step = 1, hint, "data-testid": dataTestId }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex-1">
        <div className="text-sm font-medium text-[#20364D]">{label}</div>
        {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <input
        type="number"
        value={value ?? 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
        data-testid={dataTestId}
      />
    </div>
  );
}

function ToggleRow({ label, value, onChange, hint, "data-testid": dataTestId }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <div className="flex-1">
        <div className="text-sm font-medium text-[#20364D]">{label}</div>
        {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[#D4A843]"
        data-testid={dataTestId}
      />
    </label>
  );
}

function SelectRow({ label, value, options, onChange, hint, "data-testid": dataTestId }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex-1">
        <div className="text-sm font-medium text-[#20364D]">{label}</div>
        {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
        data-testid={dataTestId}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AutomationEngineSection() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [perf, setPerf] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDiscount, setOverrideDiscount] = useState(10);
  const [overrideDuration, setOverrideDuration] = useState(3);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/automation/config");
      setConfig(data);
    } catch (e) {
      toast.error("Failed to load automation config");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPerf = useCallback(async () => {
    try {
      setPerfLoading(true);
      const { data } = await api.get("/api/admin/automation/performance");
      setPerf(data);
    } catch {
      // silent
    } finally {
      setPerfLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadPerf();
  }, [loadConfig, loadPerf]);

  const persist = useCallback(
    async (patch) => {
      setSaving(true);
      try {
        const { data } = await api.put("/api/admin/automation/config", patch);
        setConfig(data);
        toast.success("Automation settings saved");
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Save failed");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const updateSection = (section, patch) => {
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  };

  const updateMarginPool = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      margin_pools: { ...prev.margin_pools, [key]: value },
    }));
  };

  const saveAll = () => persist(config);

  const runNow = async (dryRun = false) => {
    if (!config?.enabled) {
      toast.error("Turn the engine ON first.");
      return;
    }
    setRunning(true);
    try {
      const { data } = await api.post("/api/admin/automation/run", {
        promotions: !!config.promotions?.enabled,
        group_deals: !!config.group_deals?.enabled,
        finalize_deals: true,
        dry_run: dryRun,
      });
      const promoCount = data?.promotions?.created_count ?? 0;
      const dealCount = data?.group_deals?.created_count ?? 0;
      const finalised = data?.finalize_deals?.finalised_count ?? 0;
      toast.success(
        dryRun
          ? `Dry run: would create ${promoCount} promos + ${dealCount} group deals`
          : `Created ${promoCount} promos + ${dealCount} group deals · finalised ${finalised}`
      );
      await loadPerf();
      await loadConfig();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const promoteEverything = async () => {
    if (!confirm(`Apply ${overrideDiscount}% sitewide sale for ${overrideDuration} days?`)) return;
    setRunning(true);
    try {
      const { data } = await api.post("/api/admin/automation/promote-everything", {
        discount_pct: Number(overrideDiscount),
        duration_days: Number(overrideDuration),
      });
      toast.success(
        `Sitewide sale created · ${data.applied} products discounted · ${data.skipped} skipped (margin too thin)`
      );
      setOverrideOpen(false);
      await loadPerf();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Override failed");
    } finally {
      setRunning(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="text-center py-12 text-slate-500">Loading automation engine…</div>
    );
  }

  const lastPromoRun = config.last_run?.promotions_at;
  const lastDealRun = config.last_run?.group_deals_at;

  return (
    <div className="space-y-6">
      {/* Header / master toggle */}
      <SettingsSectionCard
        title={
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#D4A843]" />
            <span>Automation Engine</span>
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                config.enabled
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {config.enabled ? "RUNNING" : "OFF"}
            </span>
          </div>
        }
        description="Self-running engine that keeps the catalogue stocked with promotions and group deals. The engine picks winners (top performers) plus fresh explorers, funds discounts from the margin pools you allow, and silently fulfills group deals at expiry so customer orders never break."
      >
        <ToggleRow
          label="Master switch — enable the automation engine"
          value={config.enabled}
          onChange={(v) => setConfig({ ...config, enabled: v })}
          hint="When ON, promotions refresh daily and group deals refresh on their cadence. When OFF, nothing runs (manual promos remain untouched)."
          data-testid="automation-master-toggle"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-500">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="font-semibold text-[#20364D]">Last promotions pass</div>
            <div>{lastPromoRun ? new Date(lastPromoRun).toLocaleString() : "—"}</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="font-semibold text-[#20364D]">Last group deal pass</div>
            <div>{lastDealRun ? new Date(lastDealRun).toLocaleString() : "—"}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => runNow(false)}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-[#20364D] text-white px-4 py-2 text-sm font-semibold hover:bg-[#2a4865] disabled:opacity-50"
            data-testid="automation-run-now-btn"
          >
            <Play className="h-4 w-4" /> {running ? "Running…" : "Run Now"}
          </button>
          <button
            type="button"
            onClick={() => runNow(true)}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-[#20364D] hover:bg-slate-50 disabled:opacity-50"
            data-testid="automation-dry-run-btn"
          >
            <Activity className="h-4 w-4" /> Dry Run
          </button>
          <button
            type="button"
            onClick={() => setOverrideOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D4A843] text-[#20364D] px-4 py-2 text-sm font-semibold hover:bg-[#c79937]"
            data-testid="automation-promote-everything-btn"
          >
            <Sparkles className="h-4 w-4" /> Promote Everything
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-emerald-500 text-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50"
            data-testid="automation-save-btn"
          >
            <CheckCircle2 className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
        {overrideOpen && (
          <div className="mt-3 rounded-lg border border-[#D4A843] bg-amber-50 p-4 space-y-3">
            <div className="text-sm font-semibold text-[#20364D]">
              Sitewide Sale — one-click override
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberRow
                label="Discount %"
                value={overrideDiscount}
                onChange={setOverrideDiscount}
                min={1}
                max={50}
                hint="Flat % off applied to ALL products where the margin pools can fund it."
                data-testid="override-discount-input"
              />
              <NumberRow
                label="Duration (days)"
                value={overrideDuration}
                onChange={setOverrideDuration}
                min={1}
                max={30}
                data-testid="override-duration-input"
              />
            </div>
            <button
              type="button"
              onClick={promoteEverything}
              disabled={running}
              className="rounded-lg bg-[#20364D] text-white px-4 py-2 text-sm font-semibold hover:bg-[#2a4865] disabled:opacity-50"
              data-testid="override-confirm-btn"
            >
              Apply now
            </button>
          </div>
        )}
      </SettingsSectionCard>

      {/* Promotions block */}
      <SettingsSectionCard
        title={
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#20364D]" /> Promotions (single products)
          </div>
        }
        description="Daily refresh — engine tops up every category to its quota by mixing top-performing products with random explorers."
      >
        <ToggleRow
          label="Enable promotions auto-engine"
          value={config.promotions?.enabled}
          onChange={(v) => updateSection("promotions", { enabled: v })}
          data-testid="promotions-enabled-toggle"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <NumberRow
            label="Quota per category"
            value={config.promotions?.per_category_quota}
            onChange={(v) => updateSection("promotions", { per_category_quota: v })}
            min={0}
            max={200}
            hint="Target number of active promos per category."
            data-testid="promotions-quota-input"
          />
          <NumberRow
            label="Discount pool share %"
            value={config.promotions?.discount_pool_share_pct}
            onChange={(v) =>
              updateSection("promotions", { discount_pool_share_pct: v })
            }
            min={5}
            max={100}
            hint="What % of the available distributable margin to give away."
            data-testid="promotions-pool-share-input"
          />
          <NumberRow
            label="Exploration ratio %"
            value={config.promotions?.exploration_ratio_pct}
            onChange={(v) =>
              updateSection("promotions", { exploration_ratio_pct: v })
            }
            min={0}
            max={100}
            hint="% of fresh random products mixed in. Rest are proven winners."
            data-testid="promotions-exploration-input"
          />
          <NumberRow
            label="Default duration (days)"
            value={config.promotions?.default_duration_days}
            onChange={(v) =>
              updateSection("promotions", { default_duration_days: v })
            }
            min={1}
            max={30}
            data-testid="promotions-duration-input"
          />
          <NumberRow
            label="Min giveaway TZS"
            value={config.promotions?.min_giveaway_tzs}
            onChange={(v) => updateSection("promotions", { min_giveaway_tzs: v })}
            min={0}
            max={100000}
            step={50}
            hint="Skip products where pools cannot fund at least this discount."
            data-testid="promotions-min-giveaway-input"
          />
        </div>
      </SettingsSectionCard>

      {/* Group Deals block */}
      <SettingsSectionCard
        title={
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#20364D]" /> Group Deals
          </div>
        }
        description="Group deals need a duration window for buyers to commit. Backend silently fulfills participants at the advertised price even if the target isn't reached — customers always receive their order."
      >
        <ToggleRow
          label="Enable group deals auto-engine"
          value={config.group_deals?.enabled}
          onChange={(v) => updateSection("group_deals", { enabled: v })}
          data-testid="group-deals-enabled-toggle"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <SelectRow
            label="Refresh cadence"
            value={config.group_deals?.cadence}
            onChange={(v) => updateSection("group_deals", { cadence: v })}
            options={CADENCE_OPTIONS}
            hint="How often to top up the deal pool."
            data-testid="group-deals-cadence-select"
          />
          <NumberRow
            label="Target deal count"
            value={config.group_deals?.target_count}
            onChange={(v) => updateSection("group_deals", { target_count: v })}
            min={5}
            max={100}
            hint="Total active group deals to maintain."
            data-testid="group-deals-target-input"
          />
          <NumberRow
            label="Duration per deal (days)"
            value={config.group_deals?.default_duration_days}
            onChange={(v) =>
              updateSection("group_deals", { default_duration_days: v })
            }
            min={3}
            max={60}
            hint="How long each deal stays open for buyers to join."
            data-testid="group-deals-duration-input"
          />
          <NumberRow
            label="Display target (buyers)"
            value={config.group_deals?.default_display_target}
            onChange={(v) =>
              updateSection("group_deals", { default_display_target: v })
            }
            min={2}
            max={500}
            hint="Number of buyers shown as the goal on the deal page."
            data-testid="group-deals-display-target-input"
          />
          <NumberRow
            label="Discount pool share %"
            value={config.group_deals?.discount_pool_share_pct}
            onChange={(v) =>
              updateSection("group_deals", { discount_pool_share_pct: v })
            }
            min={5}
            max={100}
            hint="% of distributable margin to give away."
            data-testid="group-deals-pool-share-input"
          />
          <SelectRow
            label="Default funding source"
            value={config.group_deals?.default_funding_source}
            onChange={(v) =>
              updateSection("group_deals", { default_funding_source: v })
            }
            options={[
              { value: "internal", label: "Internal (Konekt funded)" },
              { value: "vendor", label: "Vendor-shared" },
            ]}
            data-testid="group-deals-funding-select"
          />
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            <b>Always-fulfill at expiry (silent):</b> ON — every committed buyer
            gets their order at the advertised price, regardless of whether the
            target is met. Customer-facing UI remains unchanged.
          </span>
        </div>
      </SettingsSectionCard>

      {/* Margin pool funding */}
      <SettingsSectionCard
        title={
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#20364D]" /> Margin Pool Funding
          </div>
        }
        description="Which margin pools the engine may draw from to fund auto-discounts. Default keeps Promotion + Referral + Sales + Affiliate ON. Reserve and Platform Margin stay OFF unless you explicitly opt in."
      >
        {Object.keys(POOL_LABELS).map((k) => (
          <ToggleRow
            key={k}
            label={POOL_LABELS[k]}
            hint={POOL_DESCRIPTIONS[k]}
            value={!!config.margin_pools?.[k]}
            onChange={(v) => updateMarginPool(k, v)}
            data-testid={`margin-pool-${k}-toggle`}
          />
        ))}
      </SettingsSectionCard>

      {/* Scoring weights */}
      <SettingsSectionCard
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#20364D]" /> Scoring weights
          </div>
        }
        description="How the engine ranks products. Weights sum to 100 (ideal). Default: 50% revenue, 30% conversion, 20% margin signal."
      >
        <NumberRow
          label="Revenue weight %"
          value={config.scoring_weights?.revenue_pct}
          onChange={(v) => updateSection("scoring_weights", { revenue_pct: v })}
          min={0}
          max={100}
          data-testid="scoring-revenue-input"
        />
        <NumberRow
          label="Conversion weight %"
          value={config.scoring_weights?.conversion_pct}
          onChange={(v) =>
            updateSection("scoring_weights", { conversion_pct: v })
          }
          min={0}
          max={100}
          data-testid="scoring-conversion-input"
        />
        <NumberRow
          label="Margin weight %"
          value={config.scoring_weights?.margin_pct}
          onChange={(v) => updateSection("scoring_weights", { margin_pct: v })}
          min={0}
          max={100}
          data-testid="scoring-margin-input"
        />
        <NumberRow
          label="Auto-expire promo after (days)"
          value={config.expiry_rules?.max_age_days}
          onChange={(v) => updateSection("expiry_rules", { max_age_days: v })}
          min={1}
          max={365}
          hint="Engine-created promos older than this are auto-ended."
          data-testid="expiry-max-age-input"
        />
      </SettingsSectionCard>

      {/* Performance dashboard */}
      <SettingsSectionCard
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#D4A843]" /> Performance — last 30 days
          </div>
        }
        description="What the engine has done recently. Use this to tune your weights and quotas."
      >
        {perfLoading && <div className="text-sm text-slate-500">Loading…</div>}
        {perf && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Engine promos" value={perf.promotions?.total_engine_promos ?? 0} />
              <Stat label="Active" value={perf.promotions?.active ?? 0} />
              <Stat
                label="Orders attributed"
                value={perf.promotions?.total_orders ?? 0}
              />
              <Stat
                label="Revenue (TZS)"
                value={(perf.promotions?.total_revenue ?? 0).toLocaleString()}
              />
              <Stat
                label="Engine deals"
                value={perf.group_deals?.total_engine_deals ?? 0}
              />
              <Stat label="Active deals" value={perf.group_deals?.active ?? 0} />
              <Stat
                label="Completed/Fulfilled"
                value={perf.group_deals?.completed_or_fulfilled ?? 0}
              />
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold text-[#20364D] mb-2">Top performers</div>
              {(perf.promotions?.top_performers || []).length === 0 ? (
                <div className="text-xs text-slate-500">No data yet.</div>
              ) : (
                <table className="w-full text-sm" data-testid="top-performers-table">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-200">
                      <th className="text-left py-2">Promo</th>
                      <th className="text-left py-2">Category</th>
                      <th className="text-right py-2">Orders</th>
                      <th className="text-right py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(perf.promotions.top_performers || []).map((p) => (
                      <tr key={p.promo_id} className="border-b border-slate-100">
                        <td className="py-2">{p.name || p.promo_id}</td>
                        <td className="py-2 text-slate-500">{p.category || "—"}</td>
                        <td className="py-2 text-right">{p.orders}</td>
                        <td className="py-2 text-right">
                          TZS {Math.round(p.revenue).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {(perf.promotions?.dead_promos || []).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-[#20364D] mb-2">
                  Dead promos (zero orders)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {perf.promotions.dead_promos.slice(0, 12).map((p) => (
                    <span
                      key={p.promo_id}
                      className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs"
                    >
                      {p.name || p.promo_id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SettingsSectionCard>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-[#20364D]">{value}</div>
    </div>
  );
}
