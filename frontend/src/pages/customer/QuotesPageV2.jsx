import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Eye, Clock, CheckCircle, XCircle, AlertCircle, Layers } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"; }

const STATUS_MAP = {
  sent: { label: "Awaiting Your Review", color: "bg-amber-100 text-amber-800" },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  approved: { label: "Accepted", color: "bg-green-100 text-green-800" },
  converted: { label: "Converted to Invoice", color: "bg-blue-100 text-blue-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-700" },
};

export default function QuotesPageV2() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/api/customer/quotes")
      .then(res => setQuotes(res.data || []))
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = quotes.filter(q => {
    const ref = `${q.quote_number || ""} ${q.customer_name || ""} ${q.id || ""}`.toLowerCase();
    const status = q.status || "pending";
    return (!search || ref.includes(search.toLowerCase())) && (!statusFilter || status === statusFilter);
  });

  const canAct = (s) => ["sent", "pending", "draft"].includes(s);

  const handleAccept = async (quote) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/api/customer/quotes/${quote.id}/approve`, { convert_to_invoice: true });
      toast.success("Quote accepted! Invoice has been created.");
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to accept quote");
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(true);
    try {
      await api.post(`/api/customer/quotes/${rejectModal.id}/reject`, { reason: rejectReason });
      toast.success("Quote rejected.");
      setRejectModal(null);
      setRejectReason("");
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reject quote");
    }
    setActionLoading(false);
  };

  const statusInfo = (s) => STATUS_MAP[s] || { label: (s || "pending").replace(/_/g, " "), color: "bg-slate-100 text-slate-600" };

  return (
    <div data-testid="quotes-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">My Quotes</h1>
        <p className="text-slate-500 mt-1 text-sm">Review, accept, or reject quotes from our sales team.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
          placeholder="Search quotes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="quotes-search"
        />
        <select
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm min-w-[160px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="quotes-status-filter"
        >
          <option value="">All Statuses</option>
          <option value="sent">Awaiting Review</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="grid xl:grid-cols-[1fr_400px] gap-6">
        {/* Table */}
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="quotes-table">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Quote</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Loading quotes...</td></tr>
                ) : filtered.length > 0 ? filtered.map((q) => {
                  const si = statusInfo(q.status);
                  return (
                    <tr key={q.id} onClick={() => setSelected(q)}
                      className={`border-t hover:bg-slate-50/60 cursor-pointer ${selected?.id === q.id ? "bg-[#20364D]/5" : ""}`}
                      data-testid={`quote-row-${q.id}`}>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600">{fmtDate(q.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#20364D]">{q.quote_number || q.id?.slice(-8)}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 capitalize">{q.type || "general"}</td>
                      <td className="px-4 py-4 text-right font-semibold text-[#20364D]">{money(q.total_amount || q.total)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${si.color}`}>{si.label}</span>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {canAct(q.status) && (
                            <>
                              <button onClick={() => handleAccept(q)} disabled={actionLoading}
                                className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                data-testid="accept-quote-btn">
                                Accept
                              </button>
                              <button onClick={() => setRejectModal(q)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                data-testid="reject-quote-btn">
                                Reject
                              </button>
                            </>
                          )}
                          {q.status === "converted" && q.invoice_id && (
                            <Link to={`/dashboard/invoices/${q.invoice_id}/pay`}
                              className="text-xs px-3 py-1.5 rounded-lg bg-[#D4A843] text-[#17283C] font-semibold hover:bg-[#c49a3d]"
                              data-testid="pay-invoice-btn">
                              Pay Invoice
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <div className="font-semibold text-[#20364D] mb-1">No quotes yet</div>
                      <div>Quotes from our sales team will appear here once they prepare proposals for your requests.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6" data-testid="quote-detail-panel">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-[#20364D]">{selected.quote_number || selected.id?.slice(-8)}</div>
                  <div className="text-sm text-slate-500">{fmtDate(selected.created_at)}</div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100" data-testid="close-quote-detail">
                  <XCircle className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Status</div>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo(selected.status).color}`}>
                    {statusInfo(selected.status).label}
                  </span>
                </div>
                <div>
                  <div className="text-slate-500">Total Amount</div>
                  <div className="font-semibold text-[#20364D] text-lg">{money(selected.total_amount || selected.total)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Type</div>
                  <div className="font-semibold text-[#20364D] capitalize">{selected.type || "General"}</div>
                </div>
                {selected.valid_until && (
                  <div>
                    <div className="text-slate-500">Valid Until</div>
                    <div className="font-semibold text-[#20364D]">{fmtDate(selected.valid_until)}</div>
                  </div>
                )}
              </div>

              {/* Installment info */}
              {selected.payment_type === "installment" && selected.deposit_percent > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3" data-testid="installment-info">
                  <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold mb-1">
                    <Layers className="w-4 h-4" /> Installment Payment
                  </div>
                  <div className="text-xs text-amber-700 space-y-0.5">
                    <p>Deposit: {selected.deposit_percent}% = {money((selected.total_amount || selected.total || 0) * selected.deposit_percent / 100)}</p>
                    <p>Balance: {100 - selected.deposit_percent}% = {money((selected.total_amount || selected.total || 0) * (100 - selected.deposit_percent) / 100)}</p>
                  </div>
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
                        <span className="font-semibold">{money(item.line_total || item.unit_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Notes</div>
                  {selected.notes}
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t space-y-2">
                {canAct(selected.status) && (
                  <>
                    <button onClick={() => handleAccept(selected)} disabled={actionLoading}
                      className="w-full rounded-xl bg-green-600 text-white px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      data-testid="drawer-accept-quote-btn">
                      <CheckCircle className="w-4 h-4" /> Accept Quote
                    </button>
                    <button onClick={() => setRejectModal(selected)}
                      className="w-full rounded-xl border border-red-200 text-red-600 px-4 py-3 font-semibold hover:bg-red-50 flex items-center justify-center gap-2"
                      data-testid="drawer-reject-quote-btn">
                      <XCircle className="w-4 h-4" /> Reject Quote
                    </button>
                  </>
                )}
                {selected.status === "converted" && selected.invoice_id && (
                  <Link to={`/dashboard/invoices/${selected.invoice_id}/pay`}
                    className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-4 py-3 font-semibold hover:bg-[#c49a3d] flex items-center justify-center gap-2"
                    data-testid="drawer-pay-invoice-btn">
                    Pay Invoice
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <div>Select a quote to see details</div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="reject-modal">
            <h2 className="text-xl font-bold text-[#20364D] mb-4">Reject Quote</h2>
            <p className="text-sm text-slate-600 mb-4">Please provide a reason for rejecting this quote (optional).</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mb-4"
              rows={3}
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-testid="reject-reason-input"
            />
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={actionLoading}
                className="flex-1 rounded-xl bg-red-600 text-white px-4 py-3 font-semibold hover:bg-red-700 disabled:opacity-50"
                data-testid="confirm-reject-btn">
                {actionLoading ? "Rejecting..." : "Reject Quote"}
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 rounded-xl border px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
