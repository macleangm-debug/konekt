import React, { useEffect, useState } from "react";
import { CreditCard, Search, Plus, Filter } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";

const paymentMethods = ["bank_transfer", "mobile_money", "cash", "cheque", "card", "manual"];
const paymentSources = ["admin", "web", "invoice", "bank_transfer", "kwikpay"];

export default function CentralPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("");

  const [form, setForm] = useState({
    customer_email: "",
    customer_name: "",
    customer_company: "",
    payment_method: "bank_transfer",
    payment_source: "admin",
    payment_reference: "",
    external_reference: "",
    currency: "TZS",
    amount_received: "",
    notes: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMethod) params.append("payment_method", filterMethod);
      
      const res = await api.get(`/api/admin/central-payments?${params.toString()}`);
      setPayments(res.data || []);
    } catch (error) {
      console.error("Failed to load payments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterMethod]);

  const createPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/central-payments", {
        ...form,
        amount_received: parseFloat(form.amount_received) || 0,
        allocations: [],
      });
      setShowForm(false);
      setForm({
        customer_email: "",
        customer_name: "",
        customer_company: "",
        payment_method: "bank_transfer",
        payment_source: "admin",
        payment_reference: "",
        external_reference: "",
        currency: "TZS",
        amount_received: "",
        notes: "",
      });
      load();
    } catch (error) {
      console.error("Failed to create payment", error);
      alert(error.response?.data?.detail || "Failed to create payment");
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.customer_email?.toLowerCase().includes(term) ||
      p.customer_name?.toLowerCase().includes(term) ||
      p.customer_company?.toLowerCase().includes(term) ||
      p.payment_reference?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="central-payments-page">
      <div className="max-w-none w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-[#D4A843]" />
              Payments
            </h1>
            <p className="mt-1 text-slate-600">
              Central payment management for invoice payments, web payments, bank transfers, and manual receipts.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
            data-testid="record-payment-btn"
          >
            <Plus className="w-5 h-5" />
            {showForm ? "Cancel" : "Record Payment"}
          </button>
        </div>

        {/* Create Payment Form */}
        {showForm && (
          <form onSubmit={createPayment} className="rounded-2xl border bg-white p-6 space-y-4" data-testid="payment-form">
            <h2 className="text-lg font-bold">Record Manual Payment</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Customer Email *"
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                required
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Customer Name"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Company"
                value={form.customer_company}
                onChange={(e) => setForm({ ...form, customer_company: e.target.value })}
              />
              <select
                className="border border-slate-300 rounded-xl px-4 py-3"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Payment Reference"
                value={form.payment_reference}
                onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Amount Received *"
                type="number"
                step="0.01"
                value={form.amount_received}
                onChange={(e) => setForm({ ...form, amount_received: e.target.value })}
                required
              />
            </div>

            <textarea
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
              placeholder="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <button
              type="submit"
              className="bg-[#D4A843] text-[#2D3E50] px-6 py-3 rounded-xl font-semibold hover:bg-[#c49933]"
            >
              Record Payment
            </button>
          </form>
        )}

        {/* Filters and Search */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300"
              data-testid="search-payments-input"
            />
          </div>

          <select
            className="border border-slate-300 rounded-xl px-4 py-3 bg-white"
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
          >
            <option value="">All methods</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <div className="ml-auto flex rounded-xl border overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-4 py-3 text-sm font-medium ${viewMode === "table" ? "bg-[#2D3E50] text-white" : ""}`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-4 py-3 text-sm font-medium ${viewMode === "cards" ? "bg-[#2D3E50] text-white" : ""}`}
            >
              Cards
            </button>
          </div>
        </div>

        {/* Payments Display */}
        {viewMode === "table" ? (
          <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-5 py-4 text-sm font-semibold">Reference</th>
                    <th className="px-5 py-4 text-sm font-semibold">Client</th>
                    <th className="px-5 py-4 text-sm font-semibold">Method</th>
                    <th className="px-5 py-4 text-sm font-semibold">Amount</th>
                    <th className="px-5 py-4 text-sm font-semibold">Unallocated</th>
                    <th className="px-5 py-4 text-sm font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">No payments found</td>
                    </tr>
                  ) : (
                    filteredPayments.map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-5 py-4 font-medium">{item.payment_reference || item.id?.slice(0, 8)}</td>
                        <td className="px-5 py-4">
                          <div>{item.customer_company || item.customer_name}</div>
                          <div className="text-sm text-slate-500">{item.customer_email}</div>
                        </td>
                        <td className="px-5 py-4 capitalize">{item.payment_method?.replace(/_/g, " ")}</td>
                        <td className="px-5 py-4 font-semibold">{formatMoney(item.amount_received, item.currency)}</td>
                        <td className="px-5 py-4">
                          {item.unallocated_amount > 0 ? (
                            <span className="text-amber-600">{formatMoney(item.unallocated_amount, item.currency)}</span>
                          ) : (
                            <span className="text-green-600">Fully allocated</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.payment_date ? new Date(item.payment_date).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-10 text-slate-500">Loading...</div>
            ) : filteredPayments.length === 0 ? (
              <div className="col-span-full text-center py-10 text-slate-500">No payments found</div>
            ) : (
              filteredPayments.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-5">
                  <div className="font-semibold">{item.payment_reference || item.id?.slice(0, 8)}</div>
                  <div className="text-sm text-slate-500 mt-1">{item.customer_company || item.customer_email}</div>
                  <div className="text-sm text-slate-600 mt-3 capitalize">{item.payment_method?.replace(/_/g, " ")}</div>
                  <div className="text-xl font-bold mt-3">{formatMoney(item.amount_received, item.currency)}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Unallocated: {formatMoney(item.unallocated_amount, item.currency)}
                  </div>
                  <div className="text-sm text-slate-400 mt-3">
                    {item.payment_date ? new Date(item.payment_date).toLocaleDateString() : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
