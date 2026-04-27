import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Tag,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Users as UsersIcon,
  Layers,
  Wallet,
} from "lucide-react";

const money = (n) => `TZS ${Math.round(Number(n) || 0).toLocaleString()}`;
const moneyZ = (n) => `TZS ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// Pools the admin may toggle on a promotion-kind draft. Reserve is the
// "deeper margin" choice — when ON, that money cannot also fund reserve
// activities. Source-of-truth comes from the pricing engine; we only
// display capacity figures the engine already produced.
const POOL_DEFS = [
  {
    key: "promotion",
    label: "Promotion bucket",
    blurb: "Default promo funding. Doesn't block any other incentive.",
  },
  {
    key: "referral",
    label: "Referral share",
    blurb: "If ON, this product won't earn referral rewards while the promo runs.",
  },
  {
    key: "sales",
    label: "Sales (assisted)",
    blurb: "If ON, sales/assisted commission is reduced for this product. Preserves a 10% floor.",
  },
  {
    key: "affiliate",
    label: "Affiliate share",
    blurb: "If ON, this product won't earn affiliate commission while the promo runs.",
  },
  {
    key: "reserve",
    label: "Reserve pool (deeper)",
    blurb: "Eats into the safety reserve. Only opt in when you really need a deeper discount.",
  },
];

function PoolPill({ on, capacity, used, label, blurb, onToggle, locked }) {
  return (
    <label
      className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border transition cursor-pointer text-xs ${
        on
          ? "border-[#D4A843] bg-amber-50/60"
          : "border-slate-200 bg-white hover:border-slate-300"
      } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        type="checkbox"
        checked={!!on}
        disabled={locked}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 mt-0.5 accent-[#D4A843]"
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[#20364D] flex items-center justify-between gap-2">
          <span>{label}</span>
          <span className="font-mono text-[11px] text-slate-500">{moneyZ(capacity)}</span>
        </div>
        <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{blurb}</div>
        {on && used !== undefined && used > 0 && (
          <div className="mt-1 text-[11px] font-mono text-[#D4A843]">
            using {moneyZ(used)} / {moneyZ(capacity)}
          </div>
        )}
      </div>
    </label>
  );
}

function PriceMath({ p }) {
  // Vendor cost → tier markup → selling price → distributable margin →
  // promotion bucket → after-promo margin. Single source of truth.
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
      <div className="font-semibold text-[#20364D] flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5" /> Pricing engine math
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
        <span className="text-slate-500">Vendor cost</span>
        <span className="text-right">{moneyZ(p.vendor_cost)}</span>
        <span className="text-slate-500">Tier markup</span>
        <span className="text-right">{Number(p.tier_total_margin_pct || 0).toFixed(1)}% ({p.tier_label || "—"})</span>
        <span className="text-slate-500">Selling price</span>
        <span className="text-right">{moneyZ(p.current_price)}</span>
        <span className="text-slate-500">Distributable margin</span>
        <span className="text-right">{moneyZ(p.distributable_margin_tzs)} ({Number(p.distributable_margin_pct || 0).toFixed(1)}%)</span>
        <span className="text-slate-500 border-t pt-1 mt-0.5">Customer saves</span>
        <span className="text-right border-t pt-1 mt-0.5 font-bold text-[#D4A843]">{moneyZ(p.save_tzs)}</span>
        <span className="text-slate-500">After-promo margin</span>
        <span className="text-right">{moneyZ(p.post_promo_margin_tzs)} ({Number(p.post_promo_margin_pct || 0).toFixed(1)}%)</span>
      </div>
    </div>
  );
}

function DraftRow({ draft, onApprove, onReject, busy }) {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState(draft.code || "");
  const [required, setRequired] = useState(!!draft.promo_code_required);
  const [pools, setPools] = useState(() => new Set(draft.pools || []));
  const p = draft.preview || {};
  const productName = p.product_name || draft.name;
  const start = draft.start_date ? new Date(draft.start_date).toLocaleDateString() : "—";
  const end = draft.end_date ? new Date(draft.end_date).toLocaleDateString() : "—";
  const isGroupDeal = draft.kind === "group_deal";

  const togglePool = (key, on) => {
    setPools((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleApprove = () => {
    const original = JSON.stringify([...(draft.pools || [])].sort());
    const current = JSON.stringify([...pools].sort());
    const override = original !== current ? Array.from(pools) : null;
    onApprove(draft.id, code, required, override);
  };

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white hover:border-[#D4A843]/40 transition"
      data-testid={`promo-draft-${draft.id}`}
    >
      {/* Compact summary row */}
      <div className="flex flex-col md:flex-row gap-4 p-4">
        <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
          {p.product_image ? (
            <img
              src={p.product_image}
              alt=""
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300">
              {isGroupDeal ? <UsersIcon className="h-8 w-8" /> : <Tag className="h-8 w-8" />}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                {p.category || "—"}
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    isGroupDeal ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isGroupDeal ? "Group Deal" : "Promotion"}
                </span>
              </div>
              <div className="text-base font-semibold text-[#20364D] truncate">
                {productName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-slate-500 hover:text-[#20364D] inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200"
              data-testid={`draft-${draft.id}-expand-btn`}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Hide details" : "Show details"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div>
              <div className="text-slate-500">Vendor cost</div>
              <div className="font-mono text-slate-700">{money(p.vendor_cost)}</div>
            </div>
            <div>
              <div className="text-slate-500">Selling now</div>
              <div className="font-mono text-[#20364D]">{money(p.current_price)}</div>
            </div>
            <div>
              <div className="text-slate-500">New price</div>
              <div className="font-mono text-emerald-700 font-bold">
                {money(p.suggested_price)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Customer saves</div>
              <div className="font-mono text-[#D4A843] font-bold">
                {money(p.save_tzs)}
                {p.save_pct ? <span className="text-[10px] ml-1">({p.save_pct}%)</span> : null}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Duration</div>
              <div className="text-[#20364D]">
                {p.duration_days || "—"}d
                <span className="block text-[10px] text-slate-500">{start} → {end}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable detail panel */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PriceMath p={p} />
            {!isGroupDeal && (
              <div>
                <div className="text-xs font-semibold text-[#20364D] mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Margin pools to draw from
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POOL_DEFS.map((def) => (
                    <PoolPill
                      key={def.key}
                      on={pools.has(def.key)}
                      capacity={(p.per_pool_capacity_tzs || {})[def.key] || 0}
                      used={pools.has(def.key) ? ((p.per_pool_used_tzs || {})[def.key] || 0) : 0}
                      label={def.label}
                      blurb={def.blurb}
                      onToggle={(on) => togglePool(def.key, on)}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Switching pools recomputes the discount on approval. Whichever
                  pools you turn ON will be <b>blocked</b> for this product during
                  the promo window (e.g. enabling Affiliate means no affiliate
                  commission is paid on this SKU until the promo ends).
                </div>
              </div>
            )}
            {isGroupDeal && (
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs space-y-1">
                <div className="font-semibold text-purple-800">Group Deal funding</div>
                <div className="grid grid-cols-2 gap-x-3 font-mono">
                  <span className="text-purple-700/80">Funding source</span>
                  <span className="text-right">{p.funding_source || "internal"}</span>
                  <span className="text-purple-700/80">Display target</span>
                  <span className="text-right">{p.display_target || "—"} buyers</span>
                </div>
                <div className="text-[11px] text-purple-700/80 leading-snug">
                  After approval, this deal moves to the Group Deals tab and goes
                  live for customers. Backend silently fulfills participants at
                  the advertised price even if the target is missed.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval controls — always visible */}
      <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">
            Optional code
          </div>
          <input
            value={code}
            disabled={isGroupDeal}
            placeholder={isGroupDeal ? "Group deals don't use codes" : "e.g. COOLTEX (empty = open promo)"}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 16))}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D4A843] disabled:bg-slate-50"
            data-testid={`draft-${draft.id}-code-input`}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 self-end pb-1">
          <input
            type="checkbox"
            checked={required}
            disabled={!code || isGroupDeal}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 accent-[#D4A843]"
            data-testid={`draft-${draft.id}-required-toggle`}
          />
          Customer must enter code
        </label>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onReject(draft.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 text-rose-700 px-3 py-1.5 text-sm font-semibold hover:bg-rose-50 disabled:opacity-40"
            data-testid={`draft-${draft.id}-reject-btn`}
          >
            <XCircle className="h-4 w-4" /> Reject
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40"
            data-testid={`draft-${draft.id}-approve-btn`}
          >
            <CheckCircle2 className="h-4 w-4" /> Approve & Publish
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromoDraftsPanel() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/automation/drafts");
      setDrafts(data.drafts || []);
    } catch (e) {
      toast.error("Failed to load engine drafts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id, code, required, poolsOverride) => {
    setBusy(true);
    try {
      await api.post(`/api/admin/automation/drafts/${id}/approve`, {
        code: code || "",
        required: !!required,
        pools_override: poolsOverride || null,
      });
      toast.success("Draft approved & published");
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const reject = async (id) => {
    if (!confirm("Reject this draft? The engine will offer fresh suggestions on the next pass.")) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/automation/drafts/${id}/reject`);
      toast.success("Draft rejected");
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const approveAll = async () => {
    if (!confirm(`Approve and publish ALL ${drafts.length} drafts at once?`)) return;
    setBusy(true);
    try {
      const { data } = await api.post("/api/admin/automation/drafts/approve-all");
      toast.success(`${data.approved} drafts published`);
      setDrafts([]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bulk approve failed");
    } finally {
      setBusy(false);
    }
  };

  const promoDrafts = drafts.filter((d) => d.kind !== "group_deal");
  const dealDrafts = drafts.filter((d) => d.kind === "group_deal");

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
      data-testid="promo-drafts-panel"
    >
      <header className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-[#D4A843]" />
          <h2 className="text-lg font-bold text-[#20364D]">Engine Drafts</h2>
          <span
            className="ml-1 px-2 py-0.5 rounded-full bg-[#D4A843]/15 text-[#20364D] text-xs font-bold"
            data-testid="drafts-count-badge"
          >
            {drafts.length} pending
          </span>
          {(promoDrafts.length > 0 || dealDrafts.length > 0) && (
            <span className="text-xs text-slate-500">
              {promoDrafts.length} promo · {dealDrafts.length} group deal
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 text-[#20364D] px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40"
            data-testid="drafts-refresh-btn"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {drafts.length > 0 && (
            <button
              type="button"
              onClick={approveAll}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#20364D] text-white px-3 py-1.5 text-sm font-semibold hover:bg-[#2a4865] disabled:opacity-40"
              data-testid="drafts-approve-all-btn"
            >
              <Sparkles className="h-4 w-4" /> Approve All
            </button>
          )}
        </div>
      </header>
      <p className="text-xs text-slate-500 mb-3">
        After Run Now, the engine creates promotion + group-deal <b>drafts</b> here.
        Click <b>Show details</b> to see the pricing-engine math, choose which
        margin pools fund the discount, then <b>Approve &amp; Publish</b>.
        Approved drafts flow back to their respective tabs.
      </p>
      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading drafts…</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No pending drafts. Click <b>Run Now</b> on the engine card to generate fresh
          suggestions.
        </div>
      ) : (
        <div className="space-y-3" data-testid="drafts-list">
          {drafts.map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              onApprove={approve}
              onReject={reject}
              busy={busy}
            />
          ))}
        </div>
      )}
    </section>
  );
}
