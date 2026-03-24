import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Eye, CreditCard, CheckCircle, XCircle, Clock, Search, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const STATUS_CONFIG = {
  pending:    { label: "Awaiting Your Approval", color: "bg-amber-100 text-amber-800", icon: Clock },
  approved:   { label: "Accepted",              color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected:   { label: "Rejected",              color: "bg-red-100 text-red-700",     icon: XCircle },
  expired:    { label: "Expired",               color: "bg-slate-100 text-slate-600", icon: AlertCircle },
  converted_to_invoice: { label: "Invoiced", color: "bg-blue-100 text-blue-800", icon: CreditCard },
  payment_submitted:    { label: "Payment Submitted", color: "bg-indigo-100 text-indigo-800", icon: CreditCard },
};

const PAYMENT_STATUS_CONFIG = {
  pending:       { label: "Unpaid",           color: "bg-slate-100 text-slate-600" },
  paid:          { label: "Paid",             color: "bg-green-100 text-green-800" },
  under_review:  { label: "Under Review",     color: "bg-blue-100 text-blue-800" },
  approved:      { label: "Paid",             color: "bg-green-100 text-green-800" },
};

function StatusBadge({ status, config = STATUS_CONFIG }) {
  const cfg = config[status] || { label: (status || "").replace(/_/g, " "), color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`} data-testid={`status-${status}`}>
      {cfg.label}
    </span>
  );
}

export default function QuotesPageV2() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/quotes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setQuotes(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isExpired = (q) => {
    if (q.status === "expired") return true;
    if (q.valid_until && new Date(q.valid_until) < new Date() && q.status === "pending") return true;
    return false;
  };

  const filtered = quotes.filter(q => {
    const matchSearch = !search || (q.quote_number || q.id || "").toLowerCase().includes(search.toLowerCase());
    const effectiveStatus = isExpired(q) ? "expired" : q.status;
    const matchStatus = !statusFilter || effectiveStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const getActions = (quote) => {
    const effectiveStatus = isExpired(quote) ? "expired" : quote.status;
    const actions = [];
    actions.push(
      <Link key="view" to={`/dashboard/quotes/${quote.id}`} className="text-xs font-medium text-[#20364D] hover:underline" data-testid={`view-quote-${quote.id}`}>View</Link>
    );
    if (effectiveStatus === "pending") {
      actions.push(
        <Link key="accept" to={`/dashboard/quotes/${quote.id}`} className="text-xs font-semibold text-green-700 hover:underline" data-testid={`accept-quote-${quote.id}`}>Accept</Link>
      );
    }
    if (effectiveStatus === "approved" && quote.invoice_id) {
      actions.push(
        <Link key="pay" to={`/dashboard/invoices/${quote.invoice_id}/pay`} className="text-xs font-semibold text-[#D4A843] hover:underline" data-testid={`pay-invoice-${quote.id}`}>Pay Invoice</Link>
      );
    }
    if (effectiveStatus === "expired") {
      actions.push(<span key="expired" className="text-xs text-slate-400">No actions</span>);
    }
    return actions;
  };

  return (
    <div data-testid="quotes-page">
      <PageHeader
        title="My Quotes"
        subtitle="View quotes and convert them to orders."
        actions={
          <BrandButton href="/account/marketplace?tab=services" variant="primary">
            <FileText className="w-4 h-4 mr-2" /> Request Quote
          </BrandButton>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="quotes-search" />
        </div>
        <select className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="quotes-status-filter">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="quotes-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Quote #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Valid Until</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((q) => {
                  const effectiveStatus = isExpired(q) ? "expired" : q.status;
                  const isDisabled = effectiveStatus === "expired" || effectiveStatus === "rejected";
                  return (
                    <tr key={q.id} className={`transition-colors ${isDisabled ? "opacity-60" : "hover:bg-slate-50"}`} data-testid={`quote-row-${q.id}`}>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{q.quote_number || `#${(q.id || "").slice(-8)}`}</td>
                      <td className="px-4 py-3 text-slate-600">{q.created_at ? new Date(q.created_at).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3 text-slate-600 hidden lg:table-cell capitalize">{q.type || "service"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#20364D]">{money(q.total || q.total_amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={effectiveStatus} /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={q.payment_status || "pending"} config={PAYMENT_STATUS_CONFIG} /></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-3">{getActions(q)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
          <FileText size={40} className="text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-[#20364D] mt-4">No quotes yet</h2>
          <p className="text-slate-500 mt-2 mb-6">Request quotes for custom orders, bulk purchases, or specialized services.</p>
          <Link to="/account/marketplace?tab=services" className="inline-block rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">Request a Quote</Link>
        </div>
      )}
    </div>
  );
}
