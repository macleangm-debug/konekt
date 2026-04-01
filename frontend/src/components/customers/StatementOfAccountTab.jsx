import React, { useState, useEffect, useRef } from "react";
import { adminApi } from "@/lib/adminApi";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Printer, Download, Calendar, ArrowUpDown } from "lucide-react";

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

const fmtMoney = (val) => {
  if (val === null || val === undefined) return "TZS 0";
  return `TZS ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
};

export default function StatementOfAccountTab({ customerId }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const printRef = useRef();

  const loadStatement = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) params.date_to = new Date(dateTo).toISOString();
      const res = await adminApi.getCustomer360Statement(customerId, params);
      setStatement(res.data);
    } catch {
      setStatement(null);
    }
    setLoading(false);
  };

  useEffect(() => { loadStatement(); }, [customerId]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Statement of Account</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 24px; color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: #64748b; }
        .text-right { text-align: right; }
        .debit { color: #b91c1c; }
        .credit { color: #047857; }
        h2 { margin: 0 0 4px; font-size: 20px; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 16px; }
        .summary-row { background: #f1f5f9; font-weight: 700; }
        .header-block { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .totals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .totals-grid div { padding: 12px; background: #f8fafc; border-radius: 8px; }
        .totals-grid .label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 600; }
        .totals-grid .value { font-size: 18px; font-weight: 800; color: #1e293b; margin-top: 4px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading statement...</div>;
  }

  if (!statement) {
    return <div className="py-12 text-center text-sm text-slate-400">Unable to load statement.</div>;
  }

  const s = statement;

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            data-testid="statement-date-from"
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            data-testid="statement-date-to"
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <button
          onClick={loadStatement}
          data-testid="statement-filter-btn"
          className="rounded-lg bg-[#20364D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4560] transition-colors"
        >
          <Calendar className="mr-1.5 inline-block h-3.5 w-3.5" />
          Apply
        </button>
        <div className="flex-1" />
        <button
          onClick={handlePrint}
          data-testid="statement-print-btn"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Printer className="mr-1.5 inline-block h-3.5 w-3.5" />
          Print
        </button>
      </div>

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Statement Header */}
        <div className="header-block mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#20364D]">Statement of Account</h2>
            <p className="text-sm text-slate-500">
              {s.customer_name}{s.customer_company && s.customer_company !== "-" ? ` — ${s.customer_company}` : ""}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Period: {fmtDate(s.period_from)} to {fmtDate(s.period_to)}
            </p>
          </div>
        </div>

        {/* Summary Totals */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Opening Balance</div>
            <div className="mt-1 text-lg font-extrabold text-[#20364D]">{s.opening_balance_fmt}</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-400">Total Debits</div>
            <div className="mt-1 text-lg font-extrabold text-red-700">{s.total_debits_fmt}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Credits</div>
            <div className="mt-1 text-lg font-extrabold text-emerald-700">{s.total_credits_fmt}</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Closing Balance</div>
            <div className="mt-1 text-lg font-extrabold text-blue-700">{s.closing_balance_fmt}</div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm" data-testid="statement-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Reference</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Debit</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Credit</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Opening Balance Row */}
              <tr className="bg-slate-50/80">
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(s.period_from)}</td>
                <td className="px-4 py-3" colSpan={3}>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Opening Balance</span>
                </td>
                <td className="px-4 py-3 text-right" />
                <td className="px-4 py-3 text-right" />
                <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{s.opening_balance_fmt}</td>
              </tr>
              {s.entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    No transactions in this period.
                  </td>
                </tr>
              ) : (
                s.entries.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        e.type === "invoice"
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {e.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[#20364D]">{e.reference}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{e.description}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-red-600">{e.debit_fmt}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-emerald-600">{e.credit_fmt}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-[#20364D]">{e.balance_fmt}</td>
                  </tr>
                ))
              )}
              {/* Closing Balance Row */}
              <tr className="bg-slate-100 font-bold">
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(s.period_to)}</td>
                <td className="px-4 py-3" colSpan={3}>
                  <span className="text-xs font-bold text-[#20364D] uppercase">Closing Balance</span>
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-red-600">{s.total_debits_fmt}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600">{s.total_credits_fmt}</td>
                <td className="px-4 py-3 text-right text-sm font-extrabold text-[#20364D]">{s.closing_balance_fmt}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
