import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Calendar,
  Tag,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const money = (n) => `TZS ${Math.round(Number(n) || 0).toLocaleString()}`;

function DraftRow({ draft, onApprove, onReject, busy }) {
  const [code, setCode] = useState(draft.code || "");
  const [required, setRequired] = useState(!!draft.promo_code_required);
  const p = draft.preview || {};
  const productName = p.product_name || draft.name;
  const start = draft.start_date ? new Date(draft.start_date).toLocaleDateString() : "—";
  const end = draft.end_date ? new Date(draft.end_date).toLocaleDateString() : "—";

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col md:flex-row gap-4 hover:border-[#D4A843]/40 transition"
      data-testid={`promo-draft-${draft.id}`}
    >
      {/* Image */}
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
            <Tag className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <div className="text-sm text-slate-500">{p.category || "—"}</div>
          <div className="text-base font-semibold text-[#20364D] truncate">
            {productName}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div>
            <div className="text-slate-500">Current price</div>
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
              <span className="block text-[10px] text-slate-500">
                {start} → {end}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end pt-1">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">
              Optional code
            </div>
            <input
              value={code}
              placeholder="e.g. COOLTEX (leave empty for open promo)"
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 16))}
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
              data-testid={`draft-${draft.id}-code-input`}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 self-end pb-1">
            <input
              type="checkbox"
              checked={required}
              disabled={!code}
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
              onClick={() => onApprove(draft.id, code, required)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40"
              data-testid={`draft-${draft.id}-approve-btn`}
            >
              <CheckCircle2 className="h-4 w-4" /> Approve & Publish
            </button>
          </div>
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

  const approve = async (id, code, required) => {
    setBusy(true);
    try {
      await api.post(`/api/admin/automation/drafts/${id}/approve`, {
        code: code || "",
        required: !!required,
      });
      toast.success("Promo published");
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
      toast.success(`${data.approved} promos published`);
      setDrafts([]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bulk approve failed");
    } finally {
      setBusy(false);
    }
  };

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
        After Run Now, the engine creates promotion <b>drafts</b> here. Review each
        suggestion, optionally add a campaign code, and click <b>Approve &amp; Publish</b>
        to push the new price live. Open promos (no code) auto-apply at checkout.
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
