import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Megaphone, Sparkles, Save } from "lucide-react";

// KONEKT Global Campaign card.
//
// This is the year-round storewide promo shown on every product creative
// (Content Studio Promo Focus tab) and applied as the default engine
// continuous promo when a SKU has no more specific active promotion.
//
// Reads/writes the same singleton automation_engine_config.continuous_promo
// that the Settings Hub Automation tab edits, so admins can flip it from
// either page. Surfaced prominently here so changing the code for Christmas
// / New Year / public holidays takes one click.
const PRESETS = [
  { code: "KONEKT", label: "Default" },
  { code: "XMAS", label: "Christmas" },
  { code: "NY2026", label: "New Year" },
  { code: "EID", label: "Eid" },
  { code: "INDEPENDENCE", label: "Independence" },
];

export default function KonektGlobalCampaignCard() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ enabled: false, code: "", pool_share_pct: 100 });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/automation/config");
      const cont = data.continuous_promo || {};
      setCfg(cont);
      setDraft({
        enabled: !!cont.enabled,
        code: (cont.code || "KONEKT").toUpperCase(),
        pool_share_pct: Number(cont.pool_share_pct ?? 100),
      });
    } catch (e) {
      toast.error("Failed to load global campaign");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (override = null) => {
      const payload = override || {
        continuous_promo: {
          enabled: draft.enabled,
          code: (draft.code || "KONEKT").toUpperCase(),
          pool_share_pct: Number(draft.pool_share_pct) || 0,
        },
      };
      setSaving(true);
      try {
        const { data } = await api.put("/api/admin/automation/config", payload);
        const cont = data.continuous_promo || {};
        setCfg(cont);
        setDraft({
          enabled: !!cont.enabled,
          code: (cont.code || "KONEKT").toUpperCase(),
          pool_share_pct: Number(cont.pool_share_pct ?? 100),
        });
        toast.success("Global campaign saved");
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [draft]
  );

  const toggle = async () => {
    // Optimistic flip — payload only includes the enabled change so other
    // fields aren't accidentally clobbered if admin hasn't pressed Save.
    const next = !cfg?.enabled;
    setCfg((c) => ({ ...(c || {}), enabled: next }));
    setDraft((d) => ({ ...d, enabled: next }));
    await save({ continuous_promo: { enabled: next } });
  };

  const applyPreset = (code) => setDraft((d) => ({ ...d, code }));

  if (loading || !cfg) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">Loading global campaign…</div>
      </section>
    );
  }

  const isOn = !!cfg.enabled;
  const dirty =
    draft.code !== (cfg.code || "KONEKT").toUpperCase() ||
    Number(draft.pool_share_pct) !== Number(cfg.pool_share_pct ?? 100);

  return (
    <section
      className="rounded-2xl border border-[#D4A843] bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-4 sm:p-5 shadow-sm"
      data-testid="konekt-global-campaign-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#D4A843]" />
          <h2 className="text-lg font-bold text-[#20364D]">Global Campaign</h2>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              isOn
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600"
            }`}
            data-testid="konekt-status-badge"
          >
            {isOn ? "LIVE" : "PAUSED"}
          </span>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition shadow-sm ${
            isOn
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          } disabled:opacity-40`}
          data-testid="konekt-toggle-btn"
        >
          {isOn ? "Pause campaign" : "Start campaign"}
        </button>
      </header>

      <p className="text-xs text-slate-600 mb-3">
        The store-wide promo shown on every Content Studio Promo Focus creative
        and applied at checkout to any product without a more specific active
        promotion. Discount comes from the product's promotion bucket inside
        its distributable margin — it is always pricing-engine-safe.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="rounded-lg bg-white border border-slate-200 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Active code
          </div>
          <div className="text-2xl font-mono font-bold tracking-widest text-[#20364D] mt-0.5">
            {cfg.code || "KONEKT"}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            What customers type at checkout (for branded campaigns).
          </div>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Promotion pool draw
          </div>
          <div className="text-2xl font-bold text-[#20364D] mt-0.5">
            {Number(cfg.pool_share_pct ?? 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Of each product's promotion bucket given as the customer's saving.
          </div>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Override status
          </div>
          <div className="text-sm font-semibold text-[#20364D] mt-0.5">
            Per-product promos win
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            e.g. an active <span className="font-mono">COOLTEX</span> campaign
            replaces this default for products in its scope.
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              Campaign code
            </label>
            <input
              value={draft.code}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  code: e.target.value.toUpperCase().slice(0, 16),
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
              data-testid="konekt-code-input"
            />
          </div>
          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              Pool draw %
            </label>
            <input
              type="number"
              value={draft.pool_share_pct}
              min={0}
              max={100}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  pool_share_pct: Number(e.target.value),
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
              data-testid="konekt-pool-input"
            />
          </div>
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-[#20364D] text-white px-4 py-2 text-sm font-semibold hover:bg-[#2a4865] disabled:opacity-40"
            data-testid="konekt-save-btn"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Holiday presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-500 mr-1">
            Quick presets:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => applyPreset(p.code)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition ${
                draft.code === p.code
                  ? "bg-[#D4A843] text-[#20364D] border-[#D4A843]"
                  : "bg-white text-slate-600 border-slate-300 hover:border-[#D4A843]"
              }`}
              data-testid={`konekt-preset-${p.code}`}
            >
              <Sparkles className="h-3 w-3" /> {p.label}
              <span className="font-mono opacity-70 ml-1">{p.code}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
