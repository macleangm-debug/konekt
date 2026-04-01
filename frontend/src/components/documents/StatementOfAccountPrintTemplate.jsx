import React from "react";

/**
 * StatementOfAccountPrintTemplate — Branded print layout for customer statements.
 *
 * Props:
 *  - customer: { company, name, email, phone, address }
 *  - statement: { entries: [], opening_balance, closing_balance, period_start, period_end }
 *  - company: { name, tin, brn, bank_name, bank_account, phone, email, address }
 */
const fmtCurrency = (v) => `TZS ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

export default function StatementOfAccountPrintTemplate({ customer = {}, statement = {}, company = {} }) {
  const entries = statement.entries || [];

  return (
    <div className="bg-white text-slate-900 max-w-4xl mx-auto" data-testid="statement-print-template" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          [data-testid="statement-print-template"], [data-testid="statement-print-template"] * { visibility: visible; }
          [data-testid="statement-print-template"] { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-[#20364D] pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#20364D] tracking-tight">{company.name || "Konekt"}</h1>
          {company.tin && <p className="text-xs text-slate-500 mt-1">TIN: {company.tin}</p>}
          {company.brn && <p className="text-xs text-slate-500">BRN: {company.brn}</p>}
          {company.address && <p className="text-xs text-slate-500 mt-1">{company.address}</p>}
          {company.phone && <p className="text-xs text-slate-500">{company.phone}</p>}
          {company.email && <p className="text-xs text-slate-500">{company.email}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-[#20364D] uppercase tracking-wide">Statement of Account</h2>
          <p className="text-sm text-slate-500 mt-1">
            {statement.period_start ? `${fmtDate(statement.period_start)} - ${fmtDate(statement.period_end)}` : "All Time"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Generated: {fmtDate(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="rounded-lg border border-slate-200 p-4 mb-6">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Bill To</h3>
        <p className="font-semibold text-[#20364D]">{customer.company || customer.name || "Customer"}</p>
        {customer.name && customer.company && <p className="text-sm text-slate-600">{customer.name}</p>}
        {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
        {customer.phone && <p className="text-sm text-slate-500">{customer.phone}</p>}
        {customer.address && <p className="text-sm text-slate-500">{customer.address}</p>}
      </div>

      {/* Opening Balance */}
      <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-slate-50 mb-4 text-sm">
        <span className="font-medium text-slate-600">Opening Balance</span>
        <span className="font-bold text-[#20364D]">{fmtCurrency(statement.opening_balance)}</span>
      </div>

      {/* Entries Table */}
      <table className="w-full text-sm border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-slate-300 text-left">
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reference</th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description</th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Debit</th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Credit</th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No transactions found for this period.</td></tr>
          ) : entries.map((e, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-600">{fmtDate(e.date)}</td>
              <td className="px-3 py-2 font-medium text-[#20364D]">{e.reference || "-"}</td>
              <td className="px-3 py-2 text-slate-600">{e.description || "-"}</td>
              <td className="px-3 py-2 text-right text-red-600">{e.debit ? fmtCurrency(e.debit) : "-"}</td>
              <td className="px-3 py-2 text-right text-emerald-600">{e.credit ? fmtCurrency(e.credit) : "-"}</td>
              <td className="px-3 py-2 text-right font-medium text-[#20364D]">{fmtCurrency(e.running_balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Closing Balance */}
      <div className="flex justify-between items-center px-4 py-3 rounded-lg bg-[#20364D] text-white mb-6">
        <span className="font-semibold">Closing Balance</span>
        <span className="text-xl font-extrabold">{fmtCurrency(statement.closing_balance)}</span>
      </div>

      {/* Bank Details Footer */}
      {(company.bank_name || company.bank_account) && (
        <div className="rounded-lg border border-slate-200 p-4 mb-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Bank Details</h3>
          {company.bank_name && <p className="text-sm text-slate-600">Bank: {company.bank_name}</p>}
          {company.bank_account && <p className="text-sm text-slate-600">Account: {company.bank_account}</p>}
          {company.name && <p className="text-sm text-slate-600">Account Name: {company.name}</p>}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        <p>This is a computer-generated statement. No signature is required.</p>
        <p className="mt-1">{company.name || "Konekt"} | {company.email || ""} | {company.phone || ""}</p>
      </div>
    </div>
  );
}
