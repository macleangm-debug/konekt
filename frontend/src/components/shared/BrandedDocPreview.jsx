import React from "react";
import { Download, FileText, Layers } from "lucide-react";

function money(v, c = "TZS") { return `${c} ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); } catch { return "-"; } }

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-800", pending_payment: "bg-amber-100 text-amber-800",
  sent: "bg-amber-100 text-amber-800", draft: "bg-slate-100 text-slate-600",
  approved: "bg-green-100 text-green-800", converted: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800", partially_paid: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-700", payment_rejected: "bg-red-100 text-red-700",
  payment_under_review: "bg-blue-100 text-blue-800",
};

export function BrandedDocPreview({ type = "invoice", doc, splits = [], onDownload }) {
  if (!doc) return null;
  const isInvoice = type === "invoice";
  const number = doc.invoice_number || doc.quote_number || doc.id?.slice(-8) || "";
  const total = Number(doc.total_amount || doc.total || 0);
  const items = doc.items || doc.line_items || [];
  const status = doc.payment_status || doc.status || "pending";
  const currency = doc.currency || "TZS";

  const handleDownload = () => {
    if (onDownload) return onDownload();
    window.print();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden print:border-none" data-testid="branded-doc-preview">
      {/* Header */}
      <div className="bg-[#20364D] px-6 py-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <div>
              <div className="text-white font-bold text-xl">KONEKT</div>
              <div className="text-white/60 text-xs">Commercial Document</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#D4A843] font-bold text-lg">{isInvoice ? "INVOICE" : "QUOTE"}</div>
          <div className="text-white/80 text-sm font-medium">{number}</div>
          <div className="text-white/50 text-xs mt-1">{fmtDate(doc.created_at)}</div>
        </div>
      </div>

      {/* Status + Actions Bar */}
      <div className="px-6 py-3 bg-slate-50 border-b flex items-center justify-between">
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_BADGE[status] || "bg-slate-100 text-slate-600"}`}>
          {(status || "").replace(/_/g, " ")}
        </span>
        <button onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs text-[#20364D] font-medium hover:underline print:hidden"
          data-testid="doc-download-btn">
          <Download size={14} /> Download
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Parties */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">From</div>
            <div className="font-semibold text-[#20364D]">KONEKT LIMITED</div>
            <div className="text-slate-500 text-xs">Dar es Salaam, Tanzania</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">{isInvoice ? "Bill To" : "Prepared For"}</div>
            <div className="font-semibold text-[#20364D]">{doc.customer_name || "-"}</div>
            <div className="text-slate-500 text-xs">{doc.customer_email || ""}</div>
          </div>
        </div>

        {/* Line Items */}
        {items.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Line Items</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs text-slate-500">Description</th>
                  <th className="text-right py-2 text-xs text-slate-500 w-16">Qty</th>
                  <th className="text-right py-2 text-xs text-slate-500 w-28">Unit Price</th>
                  <th className="text-right py-2 text-xs text-slate-500 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{item.name || item.description || "Item"}</td>
                    <td className="py-2 text-right text-slate-600">{item.quantity || 1}</td>
                    <td className="py-2 text-right text-slate-600">{money(item.unit_price, currency)}</td>
                    <td className="py-2 text-right font-medium text-slate-800">{money(item.line_total || (item.unit_price || 0) * (item.quantity || 1), currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t pt-3 space-y-1.5">
          {(doc.subtotal_amount || doc.subtotal) > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{money(doc.subtotal_amount || doc.subtotal, currency)}</span>
            </div>
          )}
          {(doc.vat_amount || doc.tax) > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>VAT</span>
              <span>{money(doc.vat_amount || doc.tax, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-[#20364D] pt-2 border-t">
            <span>Total</span>
            <span>{money(total, currency)}</span>
          </div>
          {isInvoice && doc.amount_due !== undefined && doc.amount_due !== total && (
            <div className="flex justify-between text-sm font-semibold text-amber-700">
              <span>Amount Due</span>
              <span>{money(doc.amount_due, currency)}</span>
            </div>
          )}
        </div>

        {/* Installment Splits */}
        {splits.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4" data-testid="doc-installment-splits">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold mb-2">
              <Layers size={14} /> Installment Breakdown
            </div>
            <div className="space-y-1.5">
              {splits.map((s, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="capitalize text-amber-700">{s.type}</span>
                  <div className="text-right">
                    <span className="font-semibold text-amber-800">{money(s.amount, currency)}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Info for invoices */}
        {isInvoice && (
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Bank Transfer Details</div>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div><strong>Bank:</strong> CRDB Bank</div>
              <div><strong>Account:</strong> KONEKT LIMITED</div>
              <div><strong>Account No:</strong> 015C8841347002</div>
              <div><strong>SWIFT:</strong> CORUTZTZ</div>
            </div>
          </div>
        )}

        {/* Notes */}
        {doc.notes && (
          <div className="text-sm text-slate-600 pt-2 border-t">
            <span className="font-medium text-slate-500">Notes:</span> {doc.notes}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 px-6 py-3 text-center text-xs text-slate-400 border-t">
        KONEKT LIMITED &middot; Dar es Salaam, Tanzania &middot; info@konekt.co.tz
      </div>
    </div>
  );
}
