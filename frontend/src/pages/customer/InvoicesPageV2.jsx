import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Receipt, Eye, AlertCircle, X, FileText, ExternalLink } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import FilterBar from "../../components/ui/FilterBar";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const STATUS_LABELS = {
  pending_payment: "Awaiting Payment", pending: "Awaiting Payment", awaiting_payment_proof: "Awaiting Payment",
  payment_under_review: "Under Review", payment_proof_uploaded: "Under Review", proof_uploaded: "Under Review",
  payment_rejected: "Rejected", proof_rejected: "Rejected",
  paid: "Paid", partially_paid: "Partially Paid",
};
const STATUS_COLORS = {
  pending_payment: "bg-amber-100 text-amber-800", pending: "bg-amber-100 text-amber-800", awaiting_payment_proof: "bg-amber-100 text-amber-800",
  payment_under_review: "bg-blue-100 text-blue-800", payment_proof_uploaded: "bg-blue-100 text-blue-800", proof_uploaded: "bg-blue-100 text-blue-800",
  payment_rejected: "bg-red-100 text-red-700", proof_rejected: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-800", partially_paid: "bg-orange-100 text-orange-800",
};

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

function getInvoiceAction(invoice) {
  const state = invoice.payment_status || invoice.status || "pending_payment";
  if (state === "payment_under_review" || state === "proof_uploaded" || state === "payment_proof_uploaded") return "under_review";
  if (state === "paid") return "paid";
  if (state === "partially_paid") return "pay_balance";
  if (state === "payment_rejected" || state === "proof_rejected") return "resubmit";
  return "pay";
}

export default function InvoicesPageV2() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setInvoices(r.data || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter((invoice) => {
    const ref = `${invoice.invoice_number || ""} ${invoice.id || ""}`.toLowerCase();
    const state = invoice.payment_status || invoice.status;
    return (!searchValue || ref.includes(searchValue.toLowerCase())) && (!statusFilter || state === statusFilter);
  });

  const unpaidTotal = invoices.filter((i) => !["paid"].includes(i.payment_status || i.status)).reduce((s, i) => s + Number(i.total || i.total_amount || 0), 0);

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <PageHeader title="Invoices" subtitle="Track payments, review finance feedback, and open invoice details." />

      {unpaidTotal > 0 && (
        <SurfaceCard className="bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-800">You have {money(unpaidTotal)} awaiting payment or review.</span>
          </div>
        </SurfaceCard>
      )}

      <FilterBar
        searchValue={searchValue} onSearchChange={setSearchValue}
        searchPlaceholder="Search by invoice number..."
        filters={[{ name: "status", value: statusFilter, onChange: setStatusFilter, placeholder: "All Statuses",
          options: [{ value: "pending_payment", label: "Awaiting Payment" }, { value: "payment_under_review", label: "Under Review" }, { value: "payment_rejected", label: "Rejected" }, { value: "paid", label: "Paid" }],
        }]}
      />

      <div className="grid xl:grid-cols-[1fr_400px] gap-6">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" data-testid="invoices-table">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Loading invoices...</td></tr>
                ) : filtered.length ? filtered.map((invoice) => {
                  const state = invoice.payment_status || invoice.status || "pending_payment";
                  const action = getInvoiceAction(invoice);
                  return (
                    <tr key={invoice.id || invoice._id} onClick={() => setSelected(invoice)}
                      className={`border-t hover:bg-slate-50/60 cursor-pointer ${selected?.id === (invoice.id || invoice._id) ? "bg-[#20364D]/5" : ""}`}
                      data-testid={`invoice-row-${invoice.id}`}>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600">{fmtDate(invoice.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#20364D]">{invoice.invoice_number || invoice.id?.slice(-8)}</div>
                        <div className="text-xs text-slate-500">{invoice.source_type || invoice.type || "invoice"}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{(invoice.type || invoice.source_type || "general").replace(/_/g, " ")}</td>
                      <td className="px-4 py-4 font-semibold text-[#20364D]">{money(invoice.total || invoice.total_amount)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[state] || "bg-slate-100 text-slate-700"}`}>
                          {STATUS_LABELS[state] || state}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {action === "pay" && (
                            <BrandButton href={`/dashboard/invoices/${invoice.id || invoice._id}/pay`} variant="gold" className="text-xs py-2" data-testid="pay-invoice-btn">
                              Pay Invoice
                            </BrandButton>
                          )}
                          {action === "resubmit" && (
                            <BrandButton href={`/dashboard/invoices/${invoice.id || invoice._id}/pay`} variant="gold" className="text-xs py-2" data-testid="resubmit-proof-btn">
                              Resubmit Proof
                            </BrandButton>
                          )}
                          {action === "pay_balance" && (
                            <BrandButton href={`/dashboard/invoices/${invoice.id || invoice._id}/pay`} variant="gold" className="text-xs py-2" data-testid="pay-balance-btn">
                              Pay Balance
                            </BrandButton>
                          )}
                          {action === "under_review" && (
                            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold">
                              Under Review
                            </span>
                          )}
                          {action === "paid" && (
                            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold">
                              Paid
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                      <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <div className="font-semibold text-[#20364D] mb-1">No invoices yet</div>
                      <div>Invoices from product orders and approved service or promo quotes will appear here.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        {/* Detail Drawer/Panel */}
        <SurfaceCard data-testid="invoice-detail-panel">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-[#20364D]">{selected.invoice_number || selected.id?.slice(-8)}</div>
                  <div className="text-sm text-slate-500">{fmtDate(selected.created_at)}</div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100" data-testid="close-detail-btn">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Payment Status</div>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selected.payment_status || selected.status] || "bg-slate-100"}`}>
                    {STATUS_LABELS[selected.payment_status || selected.status] || selected.status}
                  </span>
                </div>
                <div>
                  <div className="text-slate-500">Amount</div>
                  <div className="font-semibold text-[#20364D] text-lg">{money(selected.total || selected.total_amount)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Type</div>
                  <div className="font-semibold text-[#20364D]">{(selected.type || selected.source_type || "General").replace(/_/g, " ")}</div>
                </div>
                <div>
                  <div className="text-slate-500">Source</div>
                  <div className="font-semibold text-[#20364D]">{selected.source_type || "Cart"}</div>
                </div>
              </div>

              {/* Rejection reason */}
              {selected.rejection_reason && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                  <div className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</div>
                  <div className="text-sm text-red-800">{selected.rejection_reason}</div>
                </div>
              )}

              {/* Items */}
              {selected.items && selected.items.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-500 mb-2">Items ({selected.items.length})</div>
                  <div className="space-y-2">
                    {selected.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-3 py-2">
                        <span>{item.name || item.description || "Item"} x{item.quantity || 1}</span>
                        <span className="font-semibold">{money(item.line_total || item.total || item.unit_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t space-y-2">
                {(() => {
                  const action = getInvoiceAction(selected);
                  if (action === "pay" || action === "resubmit" || action === "pay_balance") {
                    return (
                      <BrandButton href={`/dashboard/invoices/${selected.id || selected._id}/pay`} variant="gold" className="w-full text-center" data-testid="drawer-pay-btn">
                        {action === "resubmit" ? "Resubmit Payment Proof" : action === "pay_balance" ? "Pay Balance" : "Pay Invoice"}
                      </BrandButton>
                    );
                  }
                  if (action === "under_review") {
                    return <div className="text-center py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm">Payment Under Review</div>;
                  }
                  if (action === "paid") {
                    return <div className="text-center py-3 rounded-xl bg-green-50 text-green-700 font-semibold text-sm">Payment Complete</div>;
                  }
                  return null;
                })()}
                <Link to={`/dashboard/invoices/${selected.id || selected._id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border px-4 py-3 text-sm font-medium hover:bg-slate-50" data-testid="view-full-detail-btn">
                  <ExternalLink className="w-4 h-4" /> View Full Details
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <div>Select an invoice to see details</div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
