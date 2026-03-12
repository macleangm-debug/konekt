import React, { useEffect, useMemo, useState } from "react";
import { FileText, Download, Send, ArrowRightCircle, Search } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { calculateTotals, formatMoney } from "@/utils/finance";
import CustomerSummaryCard from "@/components/admin/CustomerSummaryCard";
import PaymentTermsCard from "@/components/admin/PaymentTermsCard";
import TaxSummaryCard from "@/components/admin/TaxSummaryCard";
import LineItemsEditor from "@/components/admin/LineItemsEditor";

const quoteStatuses = ["draft", "sent", "approved", "rejected", "expired", "converted"];
const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  converted: "bg-purple-100 text-purple-700",
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_company: "",
    customer_phone: "",
    customer_address: "",
    customer_tin: "",
    customer_registration_number: "",
    currency: "TZS",
    valid_until: "",
    notes: "",
    terms: "",
  });

  const [lineItems, setLineItems] = useState([
    { sku: "", description: "", quantity: 1, unit_price: 0, total: 0 },
  ]);

  const [discount, setDiscount] = useState(0);

  const taxEnabled = settings?.tax_enabled ?? true;
  const taxRate = settings?.tax_rate ?? 18;
  const taxName = settings?.tax_name || "VAT";

  const totals = useMemo(
    () => calculateTotals({ lineItems, discount, taxRate, taxEnabled }),
    [lineItems, discount, taxRate, taxEnabled]
  );

  const load = async () => {
    try {
      setLoading(true);
      const [quotesRes, customersRes, settingsRes] = await Promise.all([
        adminApi.getQuotes(),
        adminApi.getCustomers(),
        adminApi.getCompanySettings(),
      ]);

      setQuotes(quotesRes.data || []);
      setCustomers(customersRes.data || []);
      setSettings(settingsRes.data || null);

      if (settingsRes.data?.currency) {
        setForm((prev) => ({ ...prev, currency: settingsRes.data.currency }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer || null);

    if (customer) {
      const address = [customer.address_line_1, customer.address_line_2, customer.city, customer.country]
        .filter(Boolean)
        .join(", ");
      setForm((prev) => ({
        ...prev,
        customer_name: customer.contact_name || "",
        customer_email: customer.email || "",
        customer_company: customer.company_name || "",
        customer_phone: customer.phone || "",
        customer_address: address,
        customer_tin: customer.tax_number || "",
        customer_registration_number: customer.business_registration_number || "",
      }));
    }
  };

  const fetchPricing = async (index, sku) => {
    try {
      const res = await adminApi.getProductPricingBySku(sku);
      const next = [...lineItems];
      next[index].sku = sku;
      next[index].description = res.data.name || res.data.product_title || "";
      next[index].unit_price = Number(res.data.unit_price || res.data.price || 0);
      next[index].total = Number(next[index].quantity || 0) * Number(next[index].unit_price || 0);
      setLineItems(next);
    } catch (error) {
      console.log("SKU not found in inventory, manual entry required");
    }
  };

  const createQuote = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      line_items: lineItems.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      tax_rate: taxRate,
      total: totals.total,
      valid_until: form.valid_until || null,
      notes: form.notes,
      terms: form.terms,
      payment_term_type: selectedCustomer?.payment_term_type || "due_on_receipt",
      payment_term_days: selectedCustomer?.payment_term_days || 0,
      payment_term_label: selectedCustomer?.payment_term_label || "Due on Receipt",
      payment_term_notes: selectedCustomer?.payment_term_notes || "",
      status: "draft",
    };

    try {
      await adminApi.createQuote(payload);

      // Reset form
      setSelectedCustomerId("");
      setSelectedCustomer(null);
      setForm({
        customer_name: "",
        customer_email: "",
        customer_company: "",
        customer_phone: "",
        customer_address: "",
        customer_tin: "",
        customer_registration_number: "",
        currency: settings?.currency || "TZS",
        valid_until: "",
        notes: "",
        terms: "",
      });
      setLineItems([{ sku: "", description: "", quantity: 1, unit_price: 0, total: 0 }]);
      setDiscount(0);
      setShowForm(false);
      load();
    } catch (error) {
      console.error("Failed to create quote:", error);
      alert(error.response?.data?.detail || "Failed to create quote");
    }
  };

  const changeStatus = async (quoteId, status) => {
    await adminApi.updateQuoteStatus(quoteId, status);
    load();
  };

  const convertToOrder = async (quoteId) => {
    try {
      await adminApi.convertQuoteToOrder(quoteId);
      load();
      alert("Quote converted to order successfully");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to convert quote");
    }
  };

  const sendQuote = async (quoteId) => {
    try {
      await adminApi.sendQuoteDocument(quoteId);
      alert("Quote email sent (or queued)");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to send quote");
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      q.quote_number?.toLowerCase().includes(term) ||
      q.customer_name?.toLowerCase().includes(term) ||
      q.customer_company?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="quotes-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#D4A843]" />
              Quotes
            </h1>
            <p className="text-slate-600 mt-1">Create professional quotes with customer payment terms</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
            data-testid="create-quote-btn"
          >
            {showForm ? "Cancel" : "Create Quote"}
          </button>
        </div>

        <div className="grid xl:grid-cols-[520px_1fr] gap-6">
          {/* Create Quote Form */}
          {showForm && (
            <form onSubmit={createQuote} className="space-y-5" data-testid="quote-form">
              {/* Customer Selection */}
              <div className="rounded-2xl border bg-white p-5 space-y-4">
                <h2 className="text-lg font-bold">Select Customer</h2>

                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  value={selectedCustomerId}
                  onChange={(e) => selectCustomer(e.target.value)}
                  data-testid="customer-select"
                >
                  <option value="">Choose customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name} — {customer.contact_name}
                    </option>
                  ))}
                </select>

                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    className="border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Contact Name *"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    required
                  />
                  <input
                    className="border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Email *"
                    type="email"
                    value={form.customer_email}
                    onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                    required
                  />
                  <input
                    className="border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Company"
                    value={form.customer_company}
                    onChange={(e) => setForm({ ...form, customer_company: e.target.value })}
                  />
                  <input
                    className="border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Phone"
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  />
                  <input
                    className="border border-slate-300 rounded-xl px-4 py-3 md:col-span-2"
                    placeholder="Address"
                    value={form.customer_address}
                    onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                  />
                  <input
                    className="border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Client TIN"
                    value={form.customer_tin}
                    onChange={(e) => setForm({ ...form, customer_tin: e.target.value })}
                  />
                  <input
                    className="border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Client BRN"
                    value={form.customer_registration_number}
                    onChange={(e) => setForm({ ...form, customer_registration_number: e.target.value })}
                  />
                </div>
              </div>

              {/* Line Items */}
              <LineItemsEditor
                items={lineItems}
                setItems={setLineItems}
                onFetchPricing={fetchPricing}
                currency={form.currency}
              />

              {/* Commercial Details */}
              <div className="rounded-2xl border bg-white p-5 space-y-4">
                <h2 className="text-lg font-bold">Commercial Details</h2>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Valid Until</label>
                    <input
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      type="date"
                      value={form.valid_until}
                      onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Discount</label>
                    <input
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[80px]"
                  placeholder="Notes (visible on PDF)"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />

                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[80px]"
                  placeholder="Terms (optional - override default)"
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#2D3E50] text-white py-4 font-semibold text-lg hover:bg-[#3d5166] transition-colors"
                data-testid="save-quote-btn"
              >
                Save Quote
              </button>
            </form>
          )}

          {/* Right Column - Customer Info + Quotes List */}
          <div className={`space-y-5 ${showForm ? "" : "xl:col-span-2"}`}>
            {/* Customer & Payment Cards */}
            {showForm && selectedCustomer && (
              <div className="grid md:grid-cols-2 gap-4">
                <CustomerSummaryCard customer={selectedCustomer} />
                <PaymentTermsCard customer={selectedCustomer} />
              </div>
            )}

            {/* Tax Summary (only when form is showing) */}
            {showForm && (
              <TaxSummaryCard
                currency={form.currency}
                taxName={taxName}
                subtotal={totals.subtotal}
                discount={totals.discount}
                tax={totals.tax}
                total={totals.total}
              />
            )}

            {/* Search */}
            <div className="relative max-w-md">
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

            {/* Quotes List */}
            <div className="rounded-2xl border bg-white p-5">
              <h2 className="text-xl font-bold mb-4">All Quotes</h2>

              {loading ? (
                <p className="text-slate-500">Loading quotes...</p>
              ) : filteredQuotes.length === 0 ? (
                <p className="text-slate-500">No quotes found</p>
              ) : (
                <div className="space-y-4">
                  {filteredQuotes.map((quote) => (
                    <div key={quote.id} className="rounded-xl border p-4 hover:shadow-md transition-shadow" data-testid={`quote-card-${quote.id}`}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-lg">{quote.quote_number}</span>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${statusColors[quote.status] || "bg-slate-100"}`}>
                              {quote.status}
                            </span>
                          </div>
                          <p className="text-slate-600">{quote.customer_name} • {quote.customer_company || "—"}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            {formatMoney(quote.total, quote.currency)}
                          </p>
                          {quote.payment_term_label && (
                            <p className="text-xs text-[#D4A843] mt-1 font-medium">{quote.payment_term_label}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <select
                            className="border rounded-lg px-3 py-2 text-sm"
                            value={quote.status}
                            onChange={(e) => changeStatus(quote.id, e.target.value)}
                          >
                            {quoteStatuses.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>

                          <a
                            href={adminApi.downloadQuotePdf(quote.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </a>

                          <button
                            type="button"
                            onClick={() => sendQuote(quote.id)}
                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            <Send className="w-4 h-4" />
                            Send
                          </button>

                          {quote.status !== "converted" && (
                            <button
                              type="button"
                              onClick={() => convertToOrder(quote.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#D4A843] text-[#2D3E50] px-3 py-2 text-sm font-medium hover:bg-[#c49933]"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                              Convert
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
