import React, { useEffect, useState } from "react";
import { FileText, Plus, Search, Download, ArrowRight, Trash2, X, CreditCard, User } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import PhoneNumberField from "@/components/forms/PhoneNumberField";

const quoteStatuses = ["draft", "sent", "approved", "rejected", "expired", "converted"];
const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  converted: "bg-purple-100 text-purple-700",
};

export default function QuotesPageNew() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_company: "",
    customer_phone: "",
    currency: "TZS",
    valid_until: "",
    notes: "",
    terms: "",
    line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
  });

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getQuotes(params);
      setQuotes(res.data);
    } catch (error) {
      console.error("Failed to load quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [filterStatus]);

  // Fetch customer by email to show payment terms
  const fetchCustomerByEmail = async (email) => {
    if (!email || !email.includes("@")) {
      setCustomerInfo(null);
      return;
    }
    try {
      setLoadingCustomer(true);
      const res = await adminApi.getCustomerByEmail(email);
      setCustomerInfo(res.data);
      // Auto-fill customer details from profile
      if (res.data) {
        setForm((prev) => ({
          ...prev,
          customer_name: res.data.contact_name || prev.customer_name,
          customer_company: res.data.company_name || prev.customer_company,
          customer_phone: res.data.phone || prev.customer_phone,
        }));
      }
    } catch (error) {
      setCustomerInfo(null);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const updateLine = (index, key, value) => {
    const lines = [...form.line_items];
    lines[index][key] = value;
    const quantity = Number(lines[index].quantity || 0);
    const unit_price = Number(lines[index].unit_price || 0);
    lines[index].total = quantity * unit_price;
    setForm({ ...form, line_items: lines });
  };

  const addLine = () => {
    setForm({
      ...form,
      line_items: [...form.line_items, { description: "", quantity: 1, unit_price: 0, total: 0 }],
    });
  };

  const removeLine = (index) => {
    if (form.line_items.length === 1) return;
    setForm({
      ...form,
      line_items: form.line_items.filter((_, i) => i !== index),
    });
  };

  const subtotal = form.line_items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const tax = 0;
  const discount = 0;
  const total = subtotal + tax - discount;

  const createQuote = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createQuote({
        ...form,
        line_items: form.line_items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        })),
        subtotal,
        tax,
        discount,
        total,
        valid_until: form.valid_until || null,
        status: "draft",
      });
      setForm({
        customer_name: "",
        customer_email: "",
        customer_company: "",
        customer_phone: "",
        currency: "TZS",
        valid_until: "",
        notes: "",
        terms: "",
        line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
      });
      setCustomerInfo(null);
      setShowForm(false);
      loadQuotes();
    } catch (error) {
      console.error("Failed to create quote:", error);
      alert(error.response?.data?.detail || "Failed to create quote");
    }
  };

  const changeStatus = async (quoteId, status) => {
    try {
      await adminApi.updateQuoteStatus(quoteId, status);
      loadQuotes();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const convertToOrder = async (quoteId) => {
    if (!window.confirm("Convert this quote to an order?")) return;
    try {
      await adminApi.convertQuoteToOrder(quoteId);
      loadQuotes();
      alert("Quote converted to order successfully!");
    } catch (error) {
      console.error("Failed to convert:", error);
      alert(error.response?.data?.detail || "Failed to convert quote");
    }
  };

  const convertToInvoice = async (quoteId) => {
    if (!window.confirm("Convert this quote directly to an invoice?")) return;
    try {
      await adminApi.convertQuoteToInvoice(quoteId);
      loadQuotes();
      alert("Quote converted to invoice successfully!");
    } catch (error) {
      console.error("Failed to convert:", error);
      alert(error.response?.data?.detail || "Failed to convert quote");
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      q.quote_number?.toLowerCase().includes(term) ||
      q.customer_name?.toLowerCase().includes(term) ||
      q.customer_email?.toLowerCase().includes(term)
    );
  });

  // Stats
  const draftCount = quotes.filter((q) => q.status === "draft").length;
  const sentCount = quotes.filter((q) => q.status === "sent").length;
  const approvedCount = quotes.filter((q) => q.status === "approved").length;
  const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="quotes-page-new">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#D4A843]" />
              Quotes
            </h1>
            <p className="text-slate-600 mt-1">Create and manage customer quotes with PDF export</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
            data-testid="create-quote-btn"
          >
            <Plus className="w-5 h-5" />
            Create Quote
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-white border p-4">
            <p className="text-sm text-slate-500">Total Quotes</p>
            <p className="text-2xl font-bold text-slate-900">{quotes.length}</p>
          </div>
          <div className="rounded-xl bg-slate-100 border p-4">
            <p className="text-sm text-slate-600">Draft</p>
            <p className="text-2xl font-bold text-slate-700">{draftCount}</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-600">Sent</p>
            <p className="text-2xl font-bold text-blue-700">{sentCount}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-600">Approved</p>
            <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              data-testid="search-quotes-input"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            data-testid="filter-quote-status"
          >
            <option value="">All Statuses</option>
            {quoteStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="grid xl:grid-cols-[480px_1fr] gap-6">
          {/* Create Quote Form */}
          {showForm && (
            <div className="rounded-2xl border bg-white p-6 shadow-lg" data-testid="quote-form">
              <h2 className="text-xl font-bold mb-4">Create New Quote</h2>
              <form onSubmit={createQuote} className="space-y-4">
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Customer email *"
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  onBlur={(e) => fetchCustomerByEmail(e.target.value)}
                  required
                  data-testid="quote-customer-email"
                />

                {/* Customer Info Card */}
                {loadingCustomer && (
                  <div className="rounded-xl bg-slate-50 border p-3 text-sm text-slate-500">
                    Looking up customer...
                  </div>
                )}
                {customerInfo && (
                  <div className="rounded-xl bg-[#D4A843]/5 border border-[#D4A843]/30 p-4" data-testid="customer-info-card">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-[#D4A843]" />
                      <span className="font-semibold text-sm">Customer Profile Found</span>
                    </div>
                    <p className="text-sm text-slate-700">{customerInfo.company_name}</p>
                    <p className="text-xs text-slate-500">{customerInfo.contact_name}</p>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#D4A843]/20">
                      <CreditCard className="w-4 h-4 text-[#2D3E50]" />
                      <span className="text-sm font-medium text-[#2D3E50]">
                        {customerInfo.payment_term_label || "Due on Receipt"}
                      </span>
                    </div>
                    {customerInfo.payment_term_notes && (
                      <p className="text-xs text-slate-500 mt-1 ml-6">
                        {customerInfo.payment_term_notes}
                      </p>
                    )}
                    {customerInfo.tax_number && (
                      <p className="text-xs text-slate-500 mt-2">TIN: {customerInfo.tax_number}</p>
                    )}
                  </div>
                )}

                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Customer name *"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  required
                  data-testid="quote-customer-name"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Company"
                    value={form.customer_company}
                    onChange={(e) => setForm({ ...form, customer_company: e.target.value })}
                  />
                  <PhoneNumberField
                    label=""
                    prefix={form.customer_phone_prefix || "+255"}
                    number={form.customer_phone}
                    onPrefixChange={(v) => setForm({ ...form, customer_phone_prefix: v })}
                    onNumberChange={(v) => setForm({ ...form, customer_phone: v })}
                    testIdPrefix="quote-customer-phone"
                  />
                </div>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  type="date"
                  placeholder="Valid until"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />

                {/* Line Items */}
                <div className="space-y-3">
                  <p className="font-semibold">Line Items</p>
                  {form.line_items.map((item, index) => (
                    <div key={index} className="rounded-xl border p-3 space-y-2 bg-slate-50">
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLine(index, "description", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateLine(index, "quantity", e.target.value)}
                        />
                        <input
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          type="number"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => updateLine(index, "unit_price", e.target.value)}
                        />
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-right font-medium">
                          {item.total.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-sm text-[#D4A843] font-medium hover:underline"
                  >
                    + Add Line Item
                  </button>
                </div>

                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Terms & Conditions"
                  rows={2}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                />

                {/* Totals */}
                <div className="rounded-xl bg-slate-100 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>TZS {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>TZS {total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-[#2D3E50] text-white py-3 rounded-xl font-semibold hover:bg-[#3d5166]"
                    data-testid="save-quote-btn"
                  >
                    Save Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 border border-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quotes List */}
          <div className={showForm ? "" : "xl:col-span-2"}>
            <div className="space-y-4">
              {loading ? (
                <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
                  Loading quotes...
                </div>
              ) : filteredQuotes.length === 0 ? (
                <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
                  No quotes found
                </div>
              ) : (
                filteredQuotes.map((quote) => (
                  <div key={quote.id} className="rounded-2xl border bg-white p-5" data-testid={`quote-card-${quote.id}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-bold text-[#2D3E50]">{quote.quote_number}</span>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[quote.status]}`}>
                            {quote.status}
                          </span>
                        </div>
                        <p className="font-semibold text-lg">{quote.customer_name}</p>
                        <p className="text-sm text-slate-500">
                          {quote.customer_company || quote.customer_email}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-semibold text-green-600">
                            {quote.currency || "TZS"} {(quote.total || 0).toLocaleString()}
                          </span>
                          {quote.valid_until && (
                            <span className="text-slate-500">
                              Valid until: {quote.valid_until.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={quote.status}
                          onChange={(e) => changeStatus(quote.id, e.target.value)}
                          className="border rounded-lg px-3 py-2 text-sm"
                          data-testid={`quote-status-${quote.id}`}
                        >
                          {quoteStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>

                        <a
                          href={adminApi.downloadQuotePdf(quote.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 border rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                          data-testid={`download-quote-${quote.id}`}
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </a>

                        {quote.status !== "converted" && (
                          <>
                            <button
                              onClick={() => convertToOrder(quote.id)}
                              className="inline-flex items-center gap-1 bg-[#D4A843] text-slate-900 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#c49936]"
                              data-testid={`convert-to-order-${quote.id}`}
                            >
                              <ArrowRight className="w-4 h-4" />
                              To Order
                            </button>
                            <button
                              onClick={() => convertToInvoice(quote.id)}
                              className="inline-flex items-center gap-1 border border-[#2D3E50] text-[#2D3E50] px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
                              data-testid={`convert-to-invoice-${quote.id}`}
                            >
                              <ArrowRight className="w-4 h-4" />
                              To Invoice
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
