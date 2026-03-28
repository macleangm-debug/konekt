import React, { useEffect, useMemo, useState } from "react";
import { X, Download, CheckCircle, XCircle, Clock, FileText, ArrowRight } from "lucide-react";
import axios from "axios";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import BrandLogo from "../../components/branding/BrandLogo";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { if (!v) return "-"; try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

function quoteStatusMeta(s) {
  const st = (s || "pending").toLowerCase();
  if (st === "approved" || st === "accepted") return { label: "Accepted", cls: "bg-green-100 text-green-700" };
  if (st === "rejected") return { label: "Rejected", cls: "bg-red-100 text-red-700" };
  if (st === "expired") return { label: "Expired", cls: "bg-slate-200 text-slate-600" };
  if (st === "converted" || st === "converted_to_invoice") return { label: "Converted to Invoice", cls: "bg-violet-100 text-violet-700" };
  return { label: "Awaiting Approval", cls: "bg-amber-100 text-amber-700" };
}

function paymentStatusMeta(quote) {
  const qs = (quote.status || "").toLowerCase();
  const ps = (quote.payment_status || "").toLowerCase();
  if (ps === "paid") return { label: "Paid", cls: "bg-green-100 text-green-700" };
  if (ps === "under_review") return { label: "Under Review", cls: "bg-blue-100 text-blue-700" };
  if (ps === "awaiting_payment") return { label: "Awaiting Payment", cls: "bg-amber-100 text-amber-700" };
  if (qs === "approved" || qs === "accepted" || qs === "converted") return { label: "Awaiting Payment", cls: "bg-amber-100 text-amber-700" };
  return { label: "N/A", cls: "bg-slate-100 text-slate-500" };
}

function quoteType(quote) {
  if (quote.type) return quote.type;
  const src = (quote.source || "").toLowerCase();
  if (src.includes("service")) return "Service";
  if (src.includes("promo")) return "Promo";
  return "Product";
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function QuoteDrawer({ quote, onClose }) {
  if (!quote) return null;
  const status = quoteStatusMeta(quote.status);
  const pStatus = paymentStatusMeta(quote);
  const items = quote.items || [];
  const subtotal = Number(quote.subtotal || 0);
  const vat = Number(quote.vat_amount || 0);
  const total = Number(quote.total || quote.total_amount || 0);
  const isPending = ["pending", "awaiting_approval"].includes((quote.status || "").toLowerCase());
  const isAccepted = ["approved", "accepted", "converted", "converted_to_invoice"].includes((quote.status || "").toLowerCase());
  const daysLeft = daysUntil(quote.valid_until);
  const delivery = quote.delivery_address || {};

  const handleDownload = () => {
    const id = quote.id || quote._id;
    window.open(`${API_URL}/api/pdf/quotes/${id}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="quote-drawer">
      <button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close drawer" />
      <div className="relative w-full max-w-[560px] h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#20364D] to-[#2f526f]">
          <div className="px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <BrandLogo size="md" variant="light" className="mb-3" />
                <div className="text-lg font-semibold">Quote</div>
                <div className="text-xs text-white/70 mt-1">#{quote.quote_number || quote.id}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${status.cls}`}>{status.label}</span>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20" data-testid="close-quote-drawer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Expiry countdown for pending */}
          {isPending && daysLeft !== null && (
            <div className={`rounded-xl p-3 flex items-center gap-3 text-sm font-medium ${daysLeft > 7 ? "bg-blue-50 text-blue-700" : daysLeft > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`} data-testid="quote-expiry-notice">
              <Clock className="w-4 h-4 shrink-0" />
              {daysLeft > 0 ? `Expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}` : "This quote has expired"}
            </div>
          )}

          {/* 1. Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Customer</div>
              <div className="font-semibold text-[#20364D] text-sm">{quote.customer_name || "Customer"}</div>
              {quote.customer_company && <div className="text-xs text-slate-500 mt-1">{quote.customer_company}</div>}
              {quote.customer_email && <div className="text-xs text-slate-500 mt-1">{quote.customer_email}</div>}
              {quote.customer_phone && <div className="text-xs text-slate-500">{quote.customer_phone}</div>}
              {delivery.street && <div className="text-xs text-slate-500 mt-1">{delivery.street}, {delivery.city}</div>}
            </div>

            {/* 2. Quote Details */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Quote Details</div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div><strong className="text-slate-500">Issued:</strong> {fmtDate(quote.created_at)}</div>
                <div><strong className="text-slate-500">Valid Until:</strong> {fmtDate(quote.valid_until)}</div>
                <div><strong className="text-slate-500">Prepared by:</strong> {quote.prepared_by || quote.sales_person || ""}</div>
                <div><strong className="text-slate-500">Type:</strong> <span className="capitalize">{quoteType(quote)}</span></div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(quote.notes || quote.delivery_notes) && (
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Notes</div>
              <div className="text-sm text-slate-600">{quote.notes || quote.delivery_notes}</div>
            </div>
          )}

          {/* 3. Line Items */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="font-semibold text-[#20364D] text-sm">Line Items</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-white text-slate-500 text-xs">
                  <th className="px-4 py-2.5 text-left">Item</th>
                  <th className="px-4 py-2.5 text-center">Qty</th>
                  <th className="px-4 py-2.5 text-right">Unit Price</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length ? items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-[#20364D]">{item.name || item.product_name || `Item ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{item.quantity || 1}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{money(item.unit_price || item.price)}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#20364D]">{money(item.subtotal || ((item.unit_price || item.price || 0) * (item.quantity || 1)))}</td>
                  </tr>
                )) : <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">No items</td></tr>}
              </tbody>
            </table>
          </div>

          {/* 4. Totals */}
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium text-[#20364D]">{money(subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">VAT ({quote.vat_percent || 18}%)</span><span className="font-medium text-[#20364D]">{money(vat)}</span></div>
            {Number(quote.discount || 0) > 0 && <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Discount</span><span className="font-medium text-green-700">-{money(quote.discount)}</span></div>}
            <div className="flex items-center justify-between text-base pt-2 border-t border-slate-200">
              <span className="font-semibold text-[#20364D]">Total</span>
              <span className="font-bold text-[#20364D]">{money(total)}</span>
            </div>
          </div>

          {/* 6. Converted to Invoice */}
          {isAccepted && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 flex items-center gap-3" data-testid="converted-to-invoice">
              <FileText className="w-5 h-5 text-violet-600 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-violet-700 text-sm">Converted to Invoice</div>
                {quote.invoice_id && <div className="text-xs text-violet-600 mt-0.5">Invoice: {quote.invoice_number || quote.invoice_id}</div>}
              </div>
              {quote.invoice_id && <ArrowRight className="w-4 h-4 text-violet-400" />}
            </div>
          )}

          {/* 5. Actions */}
          <div className="flex items-center gap-3 pt-2">
            {isPending && (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 text-sm font-semibold hover:bg-[#2a4a66] transition-colors"
                  data-testid="accept-quote-btn"
                >
                  <CheckCircle className="w-4 h-4" /> Accept Quote
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 text-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  data-testid="reject-quote-btn"
                >
                  <XCircle className="w-4 h-4" /> Reject Quote
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 text-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors"
              data-testid="download-quote-btn"
            >
              <Download className="w-4 h-4" /> Download Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuotesPageV2() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedQuote, setSelectedQuote] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("konekt_token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/quotes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const sorted = (res.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setQuotes(sorted);
      })
      .catch((err) => console.error("Failed to load quotes:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredQuotes = useMemo(() => quotes.filter((quote) => {
    const q = searchValue.toLowerCase();
    const matchSearch = !q || [quote.quote_number, quote.customer_name, quote.status]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchStatus = !statusFilter || quote.status === statusFilter;
    return matchSearch && matchStatus;
  }), [quotes, searchValue, statusFilter]);

  return (
    <div data-testid="quotes-page" className="space-y-6">
      <PageHeader title="My Quotes" subtitle="Review quotes, approve or reject, and convert to orders." />
      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search quotes..."
        filters={[{ name: "status", value: statusFilter, onChange: setStatusFilter, placeholder: "All Statuses", options: [
          { value: "pending", label: "Awaiting Approval" },
          { value: "approved", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
          { value: "expired", label: "Expired" },
        ] }]}
      />

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="quotes-table">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Quote No</th>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-left">Amount</th>
                <th className="px-6 py-4 text-left">Valid Until</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">Loading quotes...</td></tr>
              ) : filteredQuotes.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">No quotes found.</td></tr>
              ) : filteredQuotes.map((quote) => {
                const st = quoteStatusMeta(quote.status);
                const pst = paymentStatusMeta(quote);
                return (
                  <tr key={quote.id || quote._id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => setSelectedQuote(quote)} data-testid={`quote-row-${quote.id}`}>
                    <td className="px-6 py-4 text-[#20364D]">{fmtDate(quote.created_at)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{quote.quote_number || quote.id}</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{quoteType(quote)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{money(quote.total || quote.total_amount)}</td>
                    <td className="px-6 py-4 text-slate-600">{fmtDate(quote.valid_until)}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${st.cls}`}>{st.label}</span></td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${pst.cls}`}>{pst.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <QuoteDrawer quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
    </div>
  );
}
