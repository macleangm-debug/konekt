import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Receipt, Eye, Clock, Search, AlertCircle, CreditCard, RotateCcw, Package } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const STATUS_CONFIG = {
  pending_payment:       { label: "Unpaid",               color: "bg-amber-100 text-amber-800" },
  pending:               { label: "Unpaid",               color: "bg-amber-100 text-amber-800" },
  awaiting_payment_proof:{ label: "Awaiting Proof",       color: "bg-amber-100 text-amber-800" },
  under_review:          { label: "Payment Under Review", color: "bg-blue-100 text-blue-800" },
  payment_under_review:  { label: "Payment Under Review", color: "bg-blue-100 text-blue-800" },
  paid:                  { label: "Paid",                 color: "bg-green-100 text-green-800" },
  partially_paid:        { label: "Partially Paid",       color: "bg-orange-100 text-orange-800" },
  proof_rejected:        { label: "Proof Rejected",       color: "bg-red-100 text-red-700" },
  overdue:               { label: "Overdue",              color: "bg-red-100 text-red-700" },
  cancelled:             { label: "Cancelled",            color: "bg-slate-100 text-slate-600" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: (status || "").replace(/_/g, " "), color: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>;
}

export default function InvoicesPageV2() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setInvoices(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || (inv.invoice_number || inv.id || "").toLowerCase().includes(search.toLowerCase());
    const status = inv.payment_status || inv.status || "";
    const matchStatus = !statusFilter || status === statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const unpaidTotal = invoices
    .filter(i => !["paid", "cancelled"].includes(i.status))
    .reduce((sum, i) => sum + (i.total || i.total_amount || 0), 0);

  const getActions = (inv) => {
    const actions = [];
    const status = inv.payment_status || inv.status || "pending";

    actions.push(
      <Link key="view" to={`/dashboard/invoices/${inv.id}`} className="text-xs font-medium text-[#20364D] hover:underline" data-testid={`view-invoice-${inv.id}`}>View</Link>
    );

    if (["pending_payment", "pending", "awaiting_payment_proof"].includes(status)) {
      actions.push(
        <Link key="pay" to={`/dashboard/invoices/${inv.id}/pay`} className="text-xs font-semibold text-[#D4A843] hover:underline" data-testid={`pay-invoice-${inv.id}`}>Pay Now</Link>
      );
    }

    if (status === "proof_rejected" || inv.status === "proof_rejected") {
      actions.push(
        <Link key="resubmit" to={`/dashboard/invoices/${inv.id}/pay`} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1" data-testid={`resubmit-proof-${inv.id}`}>
          <RotateCcw className="w-3 h-3" /> Resubmit Proof
        </Link>
      );
    }

    if (status === "paid" || inv.status === "paid") {
      const orderId = inv.order_id;
      if (orderId) {
        actions.push(
          <Link key="order" to={`/dashboard/orders/${orderId}`} className="text-xs font-medium text-green-700 hover:underline flex items-center gap-1" data-testid={`view-order-${inv.id}`}>
            <Package className="w-3 h-3" /> View Order
          </Link>
        );
      }
    }

    return actions;
  };

  return (
    <div data-testid="invoices-page">
      <PageHeader
        title="My Invoices"
        subtitle="View and pay your invoices."
      />

      {unpaidTotal > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-800 flex-1">
            You have {money(unpaidTotal)} in unpaid invoices.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="invoices-search" />
        </div>
        <select className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="invoices-status-filter">
          <option value="">All Statuses</option>
          <option value="pending_payment">Unpaid</option>
          <option value="under_review">Under Review</option>
          <option value="paid">Paid</option>
          <option value="proof_rejected">Proof Rejected</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="invoices-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payment Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Rejection Reason</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => {
                  const paymentStatus = inv.payment_status || inv.status || "pending";
                  const isRejected = paymentStatus === "proof_rejected" || inv.status === "proof_rejected";
                  return (
                    <tr key={inv.id} className={`transition-colors hover:bg-slate-50 ${isRejected ? "bg-red-50/30" : ""}`} data-testid={`invoice-row-${inv.id}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#20364D]">{inv.invoice_number || `#${(inv.id || "").slice(-8)}`}</div>
                        <div className="text-xs text-slate-500">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ""}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell capitalize">{inv.quote_id ? "Quote" : "Cart"}</td>
                      <td className="px-4 py-3 text-slate-600 hidden lg:table-cell capitalize">{inv.type || "product"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{money(inv.total || inv.total_amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={paymentStatus} /></td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell max-w-[200px] truncate">{inv.rejection_reason || "-"}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-3 flex-wrap">{getActions(inv)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <Receipt size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No invoices yet</h2>
          <p className="text-slate-500 mt-2 mb-6">Paid product orders and approved service quotes create invoices here.</p>
          <Link to="/account/marketplace?tab=products" className="inline-block rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">Continue Shopping</Link>
        </div>
      )}
    </div>
  );
}
