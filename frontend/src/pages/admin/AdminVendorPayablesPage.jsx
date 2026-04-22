import React, { useEffect, useState, useCallback } from "react";
import { DollarSign, FileText, AlertCircle, CheckCircle2, Upload, Play, Repeat, Download, Clock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const STATUS_PILL = {
  pending: "bg-slate-100 text-slate-700",
  invoice_uploaded: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-700",
  open: "bg-slate-100 text-slate-700",
};

function StatCard({ label, value, icon: Icon, tone = "slate", sub }) {
  const tones = {
    slate: "from-slate-50 to-white border-slate-200 text-slate-900",
    amber: "from-amber-50 to-white border-amber-200 text-amber-900",
    rose: "from-rose-50 to-white border-rose-200 text-rose-900",
    emerald: "from-emerald-50 to-white border-emerald-200 text-emerald-900",
  };
  return (
    <div className={`bg-gradient-to-b ${tones[tone]} border rounded-2xl p-5 shadow-sm`} data-testid={`payables-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="text-[11px] mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

function MarkPaidModal({ entry, kind, onClose, onSaved }) {
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const url = kind === "statement"
        ? `/api/admin/vendor-payables/statements/${entry.id}/mark-paid`
        : `/api/admin/vendor-payables/orders/${entry.id}/mark-paid`;
      await api.post(url, { reference: ref, note });
      toast.success("Marked as paid");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="mark-paid-modal">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h3 className="text-lg font-bold mb-1">Mark as paid</h3>
        <p className="text-xs text-slate-500 mb-4">
          {kind === "statement"
            ? `Statement ${entry.period} · ${entry.vendor_name}`
            : `Order ${entry.vendor_order_no} · ${entry.vendor_name}`}
          <span className="ml-2 font-semibold">{money(entry.amount || entry.total_amount)}</span>
        </p>
        <label className="text-xs font-semibold text-slate-600">Payment reference</label>
        <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. TXN-20250412-9812" data-testid="mark-paid-reference" className="mb-3" />
        <label className="text-xs font-semibold text-slate-600">Note (optional)</label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" data-testid="mark-paid-note" className="mb-4" />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving} data-testid="mark-paid-cancel">Cancel</Button>
          <Button onClick={submit} disabled={saving || !ref.trim()} data-testid="mark-paid-confirm">
            {saving ? "Saving…" : "Confirm paid"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVendorPayablesPage() {
  const [tab, setTab] = useState("orders"); // orders | statements | requests
  const [stats, setStats] = useState({});
  const [ledger, setLedger] = useState([]);
  const [statements, setStatements] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [markPaidEntry, setMarkPaidEntry] = useState(null);
  const [markPaidKind, setMarkPaidKind] = useState("order");
  const [generatingStatements, setGeneratingStatements] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l, st, rq] = await Promise.all([
        api.get("/api/admin/vendor-payables/stats"),
        api.get("/api/admin/vendor-payables/ledger", {
          params: { status: statusFilter || undefined, modality: modalityFilter || undefined },
        }),
        api.get("/api/admin/vendor-payables/statements"),
        api.get("/api/admin/vendor-payables/modality-requests", { params: { status: "pending" } }),
      ]);
      setStats(s.data || {});
      setLedger(l.data || []);
      setStatements(st.data || []);
      setRequests(rq.data || []);
    } catch (e) {
      toast.error("Failed to load payables");
    }
    setLoading(false);
  }, [statusFilter, modalityFilter]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const runStatements = async () => {
    setGeneratingStatements(true);
    try {
      const r = await api.post("/api/admin/vendor-payables/statements/generate");
      toast.success(`Statements run: ${r.data.created} new, ${r.data.updated} updated (${r.data.period})`);
      await loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
    setGeneratingStatements(false);
  };

  const decide = async (reqId, action) => {
    try {
      await api.post(`/api/admin/vendor-payables/modality-requests/${reqId}/${action}`, { note: "" });
      toast.success(`Request ${action}d`);
      await loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const filteredLedger = ledger.filter((r) =>
    !search || (r.vendor_name?.toLowerCase().includes(search.toLowerCase()) || r.vendor_order_no?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6" data-testid="admin-vendor-payables-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Vendor Payables</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track invoices from vendors and pay on time. Pay-per-order for new vendors, monthly statements for trusted ones.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runStatements} disabled={generatingStatements} data-testid="generate-statements-btn">
            <Play className="w-4 h-4 mr-2" />
            {generatingStatements ? "Running…" : "Run monthly statements"}
          </Button>
          <Button variant="outline" onClick={loadAll} data-testid="reload-payables-btn">
            <Repeat className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Per-order outstanding" value={money(stats.orders_outstanding)} icon={DollarSign} tone="amber" sub={`${stats.orders_count || 0} orders`} />
        <StatCard label="Statement outstanding" value={money(stats.statements_outstanding)} icon={FileText} tone="amber" sub={`${stats.statements_count || 0} statements`} />
        <StatCard label="Total outstanding" value={money(stats.total_outstanding)} icon={AlertCircle} tone="rose" />
        <StatCard label="Pending modality requests" value={stats.pending_modality_requests || 0} icon={Clock} tone={stats.pending_modality_requests ? "amber" : "slate"} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { k: "orders", label: "Per-Order Payables", count: ledger.length },
          { k: "statements", label: "Monthly Statements", count: statements.length },
          { k: "requests", label: "Modality Requests", count: requests.length },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${tab === t.k ? "border-[#20364D] text-[#20364D]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            data-testid={`payables-tab-${t.k}`}
          >
            {t.label}
            {t.count > 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === "orders" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input placeholder="Search vendor / order no" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" data-testid="ledger-search" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-md px-3 py-2 text-sm" data-testid="ledger-status-filter">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="invoice_uploaded">Invoice uploaded</option>
              <option value="paid">Paid</option>
            </select>
            <select value={modalityFilter} onChange={(e) => setModalityFilter(e.target.value)} className="border rounded-md px-3 py-2 text-sm" data-testid="ledger-modality-filter">
              <option value="">All modalities</option>
              <option value="pay_per_order">Pay per order</option>
              <option value="monthly_statement">Monthly statement</option>
            </select>
          </div>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Order</th>
                  <th className="text-left px-4 py-3">Vendor</th>
                  <th className="text-left px-4 py-3">Modality</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Invoice</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">{loading ? "Loading…" : "No payables"}</td></tr>
                )}
                {filteredLedger.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50/50" data-testid={`payable-row-${r.id}`}>
                    <td className="px-4 py-3 font-mono text-xs">{r.vendor_order_no}</td>
                    <td className="px-4 py-3">{r.vendor_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{r.modality?.replace("_", " ")}</Badge>
                      {r.in_statement && <span className="ml-2 text-[10px] text-slate-400">in stmt</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{money(r.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[r.vendor_payment_status] || STATUS_PILL.pending}`}>
                        {(r.vendor_payment_status || "pending").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.vendor_invoice_file ? (
                        <a href={r.vendor_invoice_file} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1" data-testid={`view-invoice-${r.id}`}>
                          <Download className="w-3 h-3" /> {r.vendor_invoice_number || "View"}
                        </a>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      {r.vendor_payment_status !== "paid" && !r.in_statement && (
                        <Button size="sm" onClick={() => { setMarkPaidKind("order"); setMarkPaidEntry(r); }} data-testid={`mark-paid-${r.id}`}>
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statements tab */}
      {tab === "statements" && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Period</th>
                <th className="text-left px-4 py-3">Vendor</th>
                <th className="text-right px-4 py-3">Orders</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {statements.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No statements. Click "Run monthly statements" to generate.</td></tr>
              )}
              {statements.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50/50" data-testid={`statement-row-${s.id}`}>
                  <td className="px-4 py-3 font-mono text-xs">{s.period}</td>
                  <td className="px-4 py-3">{s.vendor_name}</td>
                  <td className="px-4 py-3 text-right">{s.order_count}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(s.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[s.status] || STATUS_PILL.open}`}>
                      {(s.status || "open").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.vendor_invoice_file ? (
                      <a href={s.vendor_invoice_file} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1" data-testid={`view-stmt-invoice-${s.id}`}>
                        <Download className="w-3 h-3" /> {s.vendor_invoice_number || "View"}
                      </a>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.status !== "paid" && (
                      <Button size="sm" onClick={() => { setMarkPaidKind("statement"); setMarkPaidEntry(s); }} data-testid={`mark-stmt-paid-${s.id}`}>
                        Mark paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Requests tab */}
      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 && (
            <div className="bg-white rounded-2xl border p-8 text-center text-slate-400">No pending modality requests.</div>
          )}
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border p-4 flex items-start justify-between gap-4" data-testid={`modality-request-${r.id}`}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                <div>
                  <div className="font-bold text-slate-900">{r.vendor_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    From <b>{r.current_modality?.replace("_", " ")}</b> → <b>{r.requested_modality?.replace("_", " ")}</b> ·
                    <span className="ml-1">{String(r.requested_at).slice(0, 10)}</span>
                  </div>
                  {r.reason && <div className="text-xs text-slate-600 mt-1 italic">"{r.reason}"</div>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => decide(r.id, "deny")} data-testid={`deny-${r.id}`}>Deny</Button>
                <Button size="sm" onClick={() => decide(r.id, "approve")} data-testid={`approve-${r.id}`}>Approve</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {markPaidEntry && (
        <MarkPaidModal entry={markPaidEntry} kind={markPaidKind} onClose={() => setMarkPaidEntry(null)} onSaved={loadAll} />
      )}
    </div>
  );
}
