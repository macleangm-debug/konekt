import React, { useEffect, useMemo, useState } from "react";
import { FileText, Download, Send, ArrowRightCircle, Search } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { calculateTotals, formatMoney } from "@/utils/finance";
import CustomerSummaryCard from "@/components/admin/CustomerSummaryCard";
import PaymentTermsCard from "@/components/admin/PaymentTermsCard";
import TaxSummaryCard from "@/components/admin/TaxSummaryCard";
import LineItemsEditor from "@/components/admin/LineItemsEditor";
import SystemItemSelector from "@/components/admin/SystemItemSelector";
import PhoneNumberField from "@/components/forms/PhoneNumberField";
import { safeDisplay } from "@/utils/safeDisplay";

const quoteStatuses = ["draft", "waiting_for_pricing", "ready_to_send", "sent", "approved", "rejected", "expired", "converted"];
const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  waiting_for_pricing: "bg-amber-100 text-amber-700",
  ready_to_send: "bg-teal-100 text-teal-700",
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
  const [viewMode, setViewMode] = useState("list");
  const [editingQuoteId, setEditingQuoteId] = useState(null);

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

  const [lineItems, setLineItems] = useState([]);

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

    if (lineItems.length === 0) {
      alert("Add at least one item from the system catalog");
      return;
    }

    // Determine status based on pricing completeness
    const waitingForPricing = lineItems.some((i) => i.pricing_status === "waiting_for_pricing");
    const quoteStatus = waitingForPricing ? "waiting_for_pricing" : "draft";

    const payload = {
      ...form,
      line_items: lineItems.map((item) => ({
        description: item.description || item.name,
        name: item.name,
        product_id: item.product_id,
        sku: item.sku,
        category: item.category,
        unit_of_measurement: item.unit_of_measurement,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
        pricing_status: item.pricing_status || "priced",
        vendor_cost: item.vendor_cost || 0,
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
      status: quoteStatus,
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
      setLineItems([]);
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
                  <PhoneNumberField
                    label=""
                    prefix={form.customer_phone_prefix || "+255"}
                    number={form.customer_phone}
                    onPrefixChange={(v) => setForm({ ...form, customer_phone_prefix: v })}
                    onNumberChange={(v) => setForm({ ...form, customer_phone: v })}
                    testIdPrefix="quote-customer-phone"
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

              {/* Line Items — System Items Only */}
              <SystemItemSelector
                items={lineItems}
                setItems={setLineItems}
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

            {/* Search and View Toggle */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
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
              
              <div className="flex rounded-xl border overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2.5 text-sm font-medium ${viewMode === "list" ? "bg-[#2D3E50] text-white" : "hover:bg-slate-50"}`}
                  data-testid="view-list-btn"
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-4 py-2.5 text-sm font-medium ${viewMode === "cards" ? "bg-[#2D3E50] text-white" : "hover:bg-slate-50"}`}
                  data-testid="view-cards-btn"
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`px-4 py-2.5 text-sm font-medium ${viewMode === "kanban" ? "bg-[#2D3E50] text-white" : "hover:bg-slate-50"}`}
                  data-testid="view-kanban-btn"
                >
                  Kanban
                </button>
              </div>
            </div>

            {/* Quotes Display */}
            {viewMode === "list" && (
              <div className="rounded-2xl border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left" data-testid="quotes-table">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Document #</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Client</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading quotes...</td>
                        </tr>
                      ) : filteredQuotes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center">
                            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                            <h3 className="text-base font-semibold text-slate-700">No data available yet</h3>
                            <p className="text-sm text-slate-500 mt-1">Data will appear once activity is recorded</p>
                          </td>
                        </tr>
                      ) : (
                        filteredQuotes.map((quote) => (
                          <tr key={quote.id} className="border-b last:border-b-0 hover:bg-slate-50" data-testid={`quote-row-${quote.id}`}>
                            <td className="px-5 py-3.5 font-semibold text-sm text-[#20364D]">{quote.quote_number}</td>
                            <td className="px-5 py-3.5">
                              <div className="text-sm font-medium">{safeDisplay(quote.customer_company || quote.customer_name, "person")}</div>
                              {quote.customer_company && quote.customer_name && (
                                <div className="text-xs text-slate-500">{quote.customer_name}</div>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                              {quote.created_at ? new Date(quote.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                            </td>
                            <td className="px-5 py-3.5 text-sm font-semibold">{formatMoney(quote.total, quote.currency)}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${statusColors[quote.status] || "bg-slate-100"}`}>
                                {quote.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-2">
                                <a
                                  href={adminApi.downloadQuotePdf(quote.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                                  data-testid={`quote-pdf-${quote.id}`}
                                >
                                  PDF
                                </a>
                                <button
                                  type="button"
                                  onClick={() => sendQuote(quote.id)}
                                  disabled={quote.status === "waiting_for_pricing"}
                                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${quote.status === "waiting_for_pricing" ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-100"}`}
                                  title={quote.status === "waiting_for_pricing" ? "Cannot send — items still waiting for pricing" : "Send quote to customer"}
                                  data-testid={`quote-send-${quote.id}`}
                                >
                                  Send
                                </button>
                                {quote.status !== "converted" && (
                                  <button
                                    type="button"
                                    onClick={() => convertToOrder(quote.id)}
                                    className="rounded-lg bg-[#D4A843] text-[#2D3E50] px-3 py-1.5 text-xs font-medium hover:bg-[#c49933]"
                                    data-testid={`quote-convert-${quote.id}`}
                                  >
                                    Convert
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === "cards" && (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full text-center py-10 text-slate-500">Loading quotes...</div>
                ) : filteredQuotes.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-slate-500">No quotes found</div>
                ) : (
                  filteredQuotes.map((quote) => (
                    <div key={quote.id} className="rounded-2xl border bg-white p-5 hover:shadow-md transition-shadow" data-testid={`quote-card-${quote.id}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="font-bold text-lg">{quote.quote_number}</span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[quote.status] || "bg-slate-100"}`}>
                          {quote.status}
                        </span>
                      </div>
                      <p className="font-medium">{quote.customer_name}</p>
                      <p className="text-sm text-slate-500">{safeDisplay(quote.customer_company, "text")}</p>
                      <p className="text-lg font-bold mt-3">{formatMoney(quote.total, quote.currency)}</p>
                      {quote.payment_term_label && (
                        <p className="text-xs text-[#D4A843] mt-1 font-medium">{quote.payment_term_label}</p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <a
                          href={adminApi.downloadQuotePdf(quote.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          PDF
                        </a>
                        <button
                          type="button"
                          onClick={() => sendQuote(quote.id)}
                          className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          Send
                        </button>
                        {quote.status !== "converted" && (
                          <button
                            type="button"
                            onClick={() => convertToOrder(quote.id)}
                            className="flex-1 rounded-lg bg-[#D4A843] text-[#2D3E50] px-3 py-2 text-sm font-medium hover:bg-[#c49933]"
                          >
                            Convert
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {viewMode === "kanban" && (
              <div className="grid xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
                {["draft", "sent", "approved", "converted"].map((stage) => (
                  <div key={stage} className="rounded-2xl border bg-white p-4 min-h-[400px] min-w-[280px]">
                    <div className="font-semibold capitalize mb-4 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        stage === "draft" ? "bg-slate-400" :
                        stage === "sent" ? "bg-blue-400" :
                        stage === "approved" ? "bg-green-400" : "bg-purple-400"
                      }`} />
                      {stage}
                      <span className="ml-auto text-sm text-slate-500">
                        {filteredQuotes.filter((q) => q.status === stage).length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {filteredQuotes.filter((q) => q.status === stage).map((quote) => (
                        <div key={quote.id} className="rounded-xl border bg-slate-50 p-3 hover:shadow-sm transition-shadow">
                          <div className="font-medium text-sm">{quote.quote_number}</div>
                          <div className="text-sm text-slate-600 mt-1">{quote.customer_name}</div>
                          <div className="text-sm font-semibold mt-2">{formatMoney(quote.total, quote.currency)}</div>
                          <div className="flex gap-2 mt-3">
                            <a
                              href={adminApi.downloadQuotePdf(quote.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-600 hover:text-[#2D3E50]"
                            >
                              PDF
                            </a>
                            {stage !== "converted" && (
                              <button
                                type="button"
                                onClick={() => convertToOrder(quote.id)}
                                className="text-xs text-[#D4A843] hover:text-[#c49933] font-medium"
                              >
                                Convert
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredQuotes.filter((q) => q.status === stage).length === 0 && (
                        <div className="text-sm text-slate-400 text-center py-8">No quotes</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
