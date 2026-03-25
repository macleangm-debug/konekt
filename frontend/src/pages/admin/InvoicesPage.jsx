import React, { useEffect, useMemo, useState } from "react";
import { Receipt, Download, Send, Search, RefreshCcw } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { calculateTotals, formatMoney } from "@/utils/finance";
import CustomerSummaryCard from "@/components/admin/CustomerSummaryCard";
import PaymentTermsCard from "@/components/admin/PaymentTermsCard";
import TaxSummaryCard from "@/components/admin/TaxSummaryCard";
import LineItemsEditor from "@/components/admin/LineItemsEditor";

const invoiceStatuses = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];
const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  partially_paid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [orderId, setOrderId] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_company: "",
    customer_phone: "",
    customer_address: "",
    customer_tin: "",
    customer_registration_number: "",
    currency: "TZS",
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
      const [invoicesRes, customersRes, settingsRes] = await Promise.all([
        adminApi.getInvoices(),
        adminApi.getCustomers(),
        adminApi.getCompanySettings(),
      ]);

      setInvoices(invoicesRes.data || []);
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

  const createInvoice = async (e) => {
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
      due_date: invoiceDueDate || null,
      notes: form.notes,
      terms: form.terms,
      payment_term_type: selectedCustomer?.payment_term_type || "due_on_receipt",
      payment_term_days: selectedCustomer?.payment_term_days || 0,
      payment_term_label: selectedCustomer?.payment_term_label || "Due on Receipt",
      payment_term_notes: selectedCustomer?.payment_term_notes || "",
      status: "draft",
    };

    try {
      await adminApi.createInvoice(payload);

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
        notes: "",
        terms: "",
      });
      setLineItems([{ sku: "", description: "", quantity: 1, unit_price: 0, total: 0 }]);
      setDiscount(0);
      setInvoiceDueDate("");
      setShowForm(false);
      load();
    } catch (error) {
      console.error("Failed to create invoice:", error);
      alert(error.response?.data?.detail || "Failed to create invoice");
    }
  };

  const changeStatus = async (invoiceId, status) => {
    await adminApi.updateInvoiceStatus(invoiceId, status);
    load();
  };

  const convertFromOrder = async (e) => {
    e.preventDefault();
    if (!orderId) return;

    try {
      await adminApi.convertOrderToInvoice(orderId, invoiceDueDate || null);
      setOrderId("");
      setInvoiceDueDate("");
      load();
      alert("Invoice created from order successfully");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to convert order to invoice");
    }
  };

  const sendInvoice = async (invoiceId) => {
    try {
      await adminApi.sendInvoiceDocument(invoiceId);
      alert("Invoice email sent (or queued)");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to send invoice");
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(term) ||
      inv.customer_name?.toLowerCase().includes(term) ||
      inv.customer_company?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="invoices-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Receipt className="w-8 h-8 text-[#D4A843]" />
              Invoices
            </h1>
            <p className="text-slate-600 mt-1">Create invoices with automatic due date calculation</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
            data-testid="create-invoice-btn"
          >
            {showForm ? "Cancel" : "Create Invoice"}
          </button>
        </div>

        <div className="grid xl:grid-cols-[520px_1fr] gap-6">
          {/* Left Column - Forms */}
          {showForm && (
            <div className="space-y-5">
              {/* Create Invoice Form */}
              <form onSubmit={createInvoice} className="space-y-5" data-testid="invoice-form">
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
                      <label className="text-xs text-slate-500 mb-1 block">Due Date (auto-calculated if empty)</label>
                      <input
                        className="w-full border border-slate-300 rounded-xl px-4 py-3"
                        type="date"
                        value={invoiceDueDate}
                        onChange={(e) => setInvoiceDueDate(e.target.value)}
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
                  data-testid="save-invoice-btn"
                >
                  Save Invoice
                </button>
              </form>

              {/* Convert Order Form */}
              <form onSubmit={convertFromOrder} className="rounded-2xl border bg-white p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="w-5 h-5 text-[#2D3E50]" />
                  <h2 className="text-lg font-bold">Convert Order to Invoice</h2>
                </div>
                <p className="text-sm text-slate-500">Automatically create an invoice from an existing order with customer payment terms.</p>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Order ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  type="date"
                  placeholder="Due Date (optional)"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50 transition-colors"
                >
                  Convert Existing Order
                </button>
              </form>
            </div>
          )}

          {/* Right Column - Customer Info + Invoices List */}
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
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                data-testid="search-invoices-input"
              />
            </div>

            {/* Invoices List */}
            <div className="rounded-2xl border bg-white p-5">
              <h2 className="text-xl font-bold mb-4">All Invoices</h2>

              {loading ? (
                <p className="text-slate-500">Loading invoices...</p>
              ) : filteredInvoices.length === 0 ? (
                <p className="text-slate-500">No invoices found</p>
              ) : (
                <div className="space-y-4">
                  {filteredInvoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-xl border p-4 hover:shadow-md transition-shadow" data-testid={`invoice-card-${invoice.id}`}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-lg">{invoice.invoice_number}</span>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${statusColors[invoice.status] || "bg-slate-100"}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-slate-600">{invoice.customer_name} • {invoice.customer_company || "—"}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm">
                            <span className="text-slate-700 font-medium">
                              {formatMoney(invoice.total, invoice.currency)}
                            </span>
                            {invoice.due_date && (
                              <span className="text-slate-500">
                                Due: {formatDate(invoice.due_date)}
                              </span>
                            )}
                          </div>
                          {invoice.payment_term_label && (
                            <p className="text-xs text-[#D4A843] mt-1 font-medium">{invoice.payment_term_label}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <select
                            className="border rounded-lg px-3 py-2 text-sm"
                            value={invoice.status}
                            onChange={(e) => changeStatus(invoice.id, e.target.value)}
                          >
                            {invoiceStatuses.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>

                          <a
                            href={adminApi.downloadInvoicePdf(invoice.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </a>

                          <button
                            type="button"
                            onClick={() => sendInvoice(invoice.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#2D3E50] text-white px-3 py-2 text-sm hover:bg-[#3d5166]"
                          >
                            <Send className="w-4 h-4" />
                            Send
                          </button>
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
