import React, { useEffect, useMemo, useState } from "react";
import { X, FileText, Download, CheckCircle, Clock } from "lucide-react";
import axios from "axios";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import BrandLogo from "../../components/branding/BrandLogo";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

function statusMeta(quote) {
  const s = quote.status || "pending";
  if (s === "approved") return { label: "Accepted", cls: "bg-green-100 text-green-700" };
  if (s === "rejected") return { label: "Rejected", cls: "bg-red-100 text-red-700" };
  if (s === "expired") return { label: "Expired", cls: "bg-slate-100 text-slate-600" };
  return { label: "Awaiting Approval", cls: "bg-amber-100 text-amber-700" };
}

function QuoteDrawer({ quote, onClose }) {
  if (!quote) return null;
  const status = statusMeta(quote);
  const items = quote.items || [];
  const subtotal = Number(quote.subtotal || quote.total || 0);
  const vat = Number(quote.vat_amount || 0);
  const total = Number(quote.total || quote.total_amount || 0);

  const handleDownload = () => {
    const id = quote.id || quote._id;
    window.open(`${API_URL}/api/pdf/quotes/${id}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="quote-drawer">
      <button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close drawer" />
      <div className="relative w-full max-w-[520px] h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#20364D] to-[#2f526f]">
          <div className="px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <BrandLogo size="md" variant="light" className="mb-3" />
                <div className="text-lg font-semibold">Quote Preview</div>
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
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Created</div>
              <div className="font-semibold text-[#20364D]">{fmtDate(quote.created_at)}</div>
            </div>
            {quote.valid_until && (
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Valid Until</div>
                <div className="font-semibold text-[#20364D]">{fmtDate(quote.valid_until)}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Prepared For</div>
              <div className="font-semibold text-[#20364D] text-sm">{quote.customer_name || "Customer"}</div>
              {quote.customer_email && <div className="text-xs text-slate-500 mt-1">{quote.customer_email}</div>}
              {quote.customer_phone && <div className="text-xs text-slate-500">{quote.customer_phone}</div>}
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Quote Status</div>
              <div className="font-semibold text-[#20364D] text-sm capitalize">{status.label}</div>
              {quote.notes && <div className="text-xs text-slate-500 mt-2 line-clamp-3">{quote.notes}</div>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="font-semibold text-[#20364D] text-sm">Quote Items</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.length ? items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium text-[#20364D]">{item.name || item.product_name || item.title || `Item ${idx + 1}`}</div>
                    <div className="text-xs text-slate-400">Qty {item.quantity || 1} &times; {money(item.price || item.unit_price || 0)}</div>
                  </div>
                  <div className="font-semibold text-[#20364D]">{money(item.subtotal || ((item.price || item.unit_price || 0) * (item.quantity || 1)))}</div>
                </div>
              )) : <div className="px-4 py-6 text-sm text-slate-400 text-center">No items on this quote.</div>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium text-[#20364D]">{money(subtotal)}</span></div>
            {vat > 0 && <div className="flex items-center justify-between text-sm"><span className="text-slate-500">VAT</span><span className="font-medium text-[#20364D]">{money(vat)}</span></div>}
            <div className="flex items-center justify-between text-base pt-2 border-t border-slate-200">
              <span className="font-semibold text-[#20364D]">Total</span>
              <span className="font-bold text-[#20364D]">{money(total)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 text-sm font-semibold hover:bg-[#2a4a66] transition-colors"
              data-testid="download-quote-btn"
            >
              <Download className="w-4 h-4" /> Download Quote
            </button>
            {quote.status === "approved" && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] text-white px-5 py-3 text-sm font-semibold hover:bg-[#c09a3a] transition-colors"
                data-testid="convert-to-order-btn"
              >
                <CheckCircle className="w-4 h-4" /> Convert to Order
              </button>
            )}
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
      <PageHeader title="My Quotes" subtitle="View quotes and convert them to orders." />
      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search quotes..."
        filters={[{ name: "status", value: statusFilter, onChange: setStatusFilter, placeholder: "All Statuses", options: [
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
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
                <th className="px-6 py-4 text-left">Quote</th>
                <th className="px-6 py-4 text-left">Items</th>
                <th className="px-6 py-4 text-left">Amount</th>
                <th className="px-6 py-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">Loading quotes...</td></tr>
              ) : filteredQuotes.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No quotes found.</td></tr>
              ) : filteredQuotes.map((quote) => {
                const st = statusMeta(quote);
                return (
                  <tr key={quote.id || quote._id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => setSelectedQuote(quote)} data-testid={`quote-row-${quote.id}`}>
                    <td className="px-6 py-4 text-[#20364D]">{fmtDate(quote.created_at)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">#{quote.quote_number || (quote.id || "").slice(-8)}</td>
                    <td className="px-6 py-4 text-slate-600">{(quote.items || []).length} item{(quote.items || []).length !== 1 ? "s" : ""}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{money(quote.total || quote.total_amount)}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${st.cls}`}>{st.label}</span></td>
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
