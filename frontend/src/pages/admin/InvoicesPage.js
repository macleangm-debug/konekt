import React, { useEffect, useState } from "react";
import { FileText, Plus, Search, DollarSign, Calendar, Mail, Building2, Download, ArrowRight } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const invoiceStatuses = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  partially_paid: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(null);

  // Convert from order form
  const [orderId, setOrderId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_company: "",
    currency: "TZS",
    line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    due_date: "",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "bank_transfer",
    reference: "",
    notes: "",
  });

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getInvoices(params);
      setInvoices(res.data);
    } catch (error) {
      console.error("Failed to load invoices", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [filterStatus]);

  const updateLineItem = (index, field, value) => {
    const newItems = [...form.line_items];
    newItems[index][field] = value;
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + form.tax - form.discount;
    setForm({ ...form, line_items: newItems, subtotal, total });
  };

  const addLineItem = () => {
    setForm({
      ...form,
      line_items: [...form.line_items, { description: "", quantity: 1, unit_price: 0, total: 0 }],
    });
  };

  const removeLineItem = (index) => {
    if (form.line_items.length === 1) return;
    const newItems = form.line_items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + form.tax - form.discount;
    setForm({ ...form, line_items: newItems, subtotal, total });
  };

  const createInvoice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        line_items: form.line_items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        })),
        subtotal: Number(form.subtotal),
        tax: Number(form.tax),
        discount: Number(form.discount),
        total: Number(form.total),
      };
      if (payload.due_date) {
        payload.due_date = new Date(payload.due_date).toISOString();
      } else {
        delete payload.due_date;
      }
      await adminApi.createInvoice(payload);
      setForm({
        customer_name: "",
        customer_email: "",
        customer_company: "",
        currency: "TZS",
        line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        due_date: "",
        notes: "",
      });
      setShowForm(false);
      loadInvoices();
    } catch (error) {
      console.error("Failed to create invoice", error);
      alert(error.response?.data?.detail || "Failed to create invoice");
    }
  };

  const convertFromOrder = async (e) => {
    e.preventDefault();
    if (!orderId) return;
    try {
      await adminApi.convertOrderToInvoice(orderId, dueDate || null);
      setOrderId("");
      setDueDate("");
      setShowConvertForm(false);
      loadInvoices();
      alert("Invoice created from order!");
    } catch (error) {
      console.error("Failed to convert:", error);
      alert(error.response?.data?.detail || "Failed to create invoice from order");
    }
  };

  const changeStatus = async (invoiceId, status) => {
    try {
      await adminApi.updateInvoiceStatus(invoiceId, status);
      loadInvoices();
    } catch (error) {
      console.error("Failed to update invoice status", error);
    }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    try {
      await adminApi.addPayment(showPaymentModal, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });
      setPaymentForm({ amount: 0, method: "bank_transfer", reference: "", notes: "" });
      setShowPaymentModal(null);
      loadInvoices();
    } catch (error) {
      console.error("Failed to add payment", error);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(term) ||
      inv.customer_name?.toLowerCase().includes(term) ||
      inv.customer_email?.toLowerCase().includes(term)
    );
  });

  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.total || 0), 0);
  const pendingAmount = invoices.filter((i) => ["sent", "partially_paid", "overdue"].includes(i.status)).reduce((sum, i) => sum + ((i.total || 0) - (i.amount_paid || 0)), 0);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="invoices-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#D4A843]" />
              Invoices
            </h1>
            <p className="text-slate-600 mt-1">Manage customer invoices with PDF export</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowConvertForm(!showConvertForm); setShowForm(false); }}
              className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              From Order
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowConvertForm(false); }}
              className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
              data-testid="create-invoice-btn"
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-white border p-4">
            <p className="text-sm text-slate-500">Total Invoices</p>
            <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-600">Paid Revenue</p>
            <p className="text-2xl font-bold text-green-700">TZS {totalRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-600">Pending Amount</p>
            <p className="text-2xl font-bold text-yellow-700">TZS {pendingAmount.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">Overdue</p>
            <p className="text-2xl font-bold text-red-700">{invoices.filter((i) => i.status === "overdue").length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            data-testid="filter-invoice-status"
          >
            <option value="">All Statuses</option>
            {invoiceStatuses.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Convert from Order Form */}
        {showConvertForm && (
          <div className="rounded-2xl border bg-white p-6 mb-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Create Invoice from Order</h2>
            <form onSubmit={convertFromOrder} className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Order ID</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Enter Order ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="bg-[#2D3E50] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3d5166]"
              >
                Create Invoice
              </button>
              <button
                type="button"
                onClick={() => setShowConvertForm(false)}
                className="border border-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Create Invoice Form */}
        {showForm && (
          <div className="rounded-2xl border bg-white p-6 mb-6 shadow-lg" data-testid="invoice-form">
            <h2 className="text-xl font-bold mb-4">Create New Invoice</h2>
            <form onSubmit={createInvoice} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <input
                  className="border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Customer name *"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  required
                  data-testid="invoice-customer-name"
                />
                <input
                  className="border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Customer email *"
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  required
                  data-testid="invoice-customer-email"
                />
                <input
                  className="border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Company"
                  value={form.customer_company}
                  onChange={(e) => setForm({ ...form, customer_company: e.target.value })}
                  data-testid="invoice-customer-company"
                />
              </div>

              {/* Line Items */}
              <div className="border rounded-xl p-4">
                <h3 className="font-semibold mb-3">Line Items</h3>
                {form.line_items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <input
                      className="col-span-5 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                      data-testid={`line-item-desc-${idx}`}
                    />
                    <input
                      className="col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm text-right"
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))}
                      data-testid={`line-item-qty-${idx}`}
                    />
                    <input
                      className="col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm text-right"
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(idx, "unit_price", Number(e.target.value))}
                      data-testid={`line-item-price-${idx}`}
                    />
                    <div className="col-span-2 text-right font-semibold text-sm">
                      TZS {item.total.toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="col-span-1 text-red-500 hover:text-red-700 text-sm"
                    >
                      X
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-sm text-[#D4A843] font-medium mt-2"
                >
                  + Add Line Item
                </button>
              </div>

              {/* Totals */}
              <div className="grid md:grid-cols-4 gap-4">
                <input
                  className="border border-slate-300 rounded-xl px-4 py-3"
                  type="number"
                  placeholder="Tax"
                  value={form.tax}
                  onChange={(e) => {
                    const tax = Number(e.target.value);
                    setForm({ ...form, tax, total: form.subtotal + tax - form.discount });
                  }}
                  data-testid="invoice-tax"
                />
                <input
                  className="border border-slate-300 rounded-xl px-4 py-3"
                  type="number"
                  placeholder="Discount"
                  value={form.discount}
                  onChange={(e) => {
                    const discount = Number(e.target.value);
                    setForm({ ...form, discount, total: form.subtotal + form.tax - discount });
                  }}
                  data-testid="invoice-discount"
                />
                <input
                  className="border border-slate-300 rounded-xl px-4 py-3"
                  type="date"
                  placeholder="Due date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  data-testid="invoice-due-date"
                />
                <div className="bg-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold">TZS {form.total.toLocaleString()}</span>
                </div>
              </div>

              <textarea
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                data-testid="invoice-notes"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-[#2D3E50] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
                  data-testid="save-invoice-btn"
                >
                  Create Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Invoices Table */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Invoice #</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Customer</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Due Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Loading invoices...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors" data-testid={`invoice-row-${inv.id}`}>
                      <td className="px-6 py-4">
                        <span className="font-mono font-semibold text-[#2D3E50]">{inv.invoice_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{inv.customer_name}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {inv.customer_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-slate-900">
                          TZS {(inv.total || 0).toLocaleString()}
                        </div>
                        {inv.amount_paid > 0 && (
                          <p className="text-xs text-green-600">
                            Paid: TZS {(inv.amount_paid || 0).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {inv.due_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {inv.due_date.slice(0, 10)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={inv.status}
                          onChange={(e) => changeStatus(inv.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${
                            statusColors[inv.status] || "bg-slate-100"
                          }`}
                          data-testid={`invoice-status-${inv.id}`}
                        >
                          {invoiceStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={adminApi.downloadInvoicePdf(inv.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 border rounded-lg px-2.5 py-1.5 text-sm hover:bg-slate-50"
                            data-testid={`download-invoice-${inv.id}`}
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </a>
                          <button
                            onClick={() => setShowPaymentModal(inv.id)}
                            className="text-sm text-[#D4A843] hover:underline font-medium px-2"
                            data-testid={`add-payment-${inv.id}`}
                          >
                            + Payment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md" data-testid="payment-modal">
              <h3 className="text-xl font-bold mb-4">Add Payment</h3>
              <form onSubmit={addPayment} className="space-y-4">
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  type="number"
                  placeholder="Amount *"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                  data-testid="payment-amount"
                />
                <select
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  data-testid="payment-method"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Reference number"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  data-testid="payment-reference"
                />
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Notes"
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-[#2D3E50] text-white py-3 rounded-xl font-semibold"
                    data-testid="submit-payment-btn"
                  >
                    Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(null)}
                    className="flex-1 border border-slate-300 py-3 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
