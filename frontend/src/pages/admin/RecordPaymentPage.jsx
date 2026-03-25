import React, { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";

export default function RecordPaymentPage() {
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_email: "",
    customer_name: "",
    customer_company: "",
    payment_method: "bank_transfer",
    payment_source: "admin",
    payment_reference: "",
    external_reference: "",
    currency: "TZS",
    amount_received: 0,
    notes: "",
  });

  const loadInvoices = async () => {
    if (!customerEmail) return;
    setLoading(true);
    try {
      const res = await api.get("/api/admin/invoices", {
        params: { customer_email: customerEmail, status: "sent,partially_paid,overdue" },
      });
      setCustomerInvoices(res.data || []);
      setForm((prev) => ({ ...prev, customer_email: customerEmail }));
    } catch (error) {
      console.error("Failed to load invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + Number(v || 0), 0);
  }, [allocations]);

  const savePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/central-payments", {
        ...form,
        amount_received: Number(form.amount_received),
        allocations: customerInvoices
          .filter((inv) => Number(allocations[inv.id] || 0) > 0)
          .map((inv) => ({
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            allocated_amount: Number(allocations[inv.id]),
          })),
      });

      setAllocations({});
      setCustomerInvoices([]);
      setCustomerEmail("");
      setForm({
        customer_email: "",
        customer_name: "",
        customer_company: "",
        payment_method: "bank_transfer",
        payment_source: "admin",
        payment_reference: "",
        external_reference: "",
        currency: "TZS",
        amount_received: 0,
        notes: "",
      });
      alert("Payment recorded successfully");
    } catch (error) {
      console.error("Failed to save payment:", error);
      alert("Failed to record payment");
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-none w-full grid xl:grid-cols-[420px_1fr] gap-8">
        <form onSubmit={savePayment} className="rounded-3xl border bg-white p-6 space-y-4">
          <h1 className="text-3xl font-bold" data-testid="record-payment-title">Record Payment</h1>

          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-xl px-4 py-3"
              placeholder="Customer Email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              data-testid="customer-email-input"
            />
            <button
              type="button"
              onClick={loadInvoices}
              className="rounded-xl border px-5 py-3 font-medium whitespace-nowrap"
              disabled={loading}
              data-testid="load-invoices-btn"
            >
              {loading ? "Loading..." : "Load Invoices"}
            </button>
          </div>

          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Customer Name" 
            value={form.customer_name} 
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })} 
            data-testid="customer-name-input"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Customer Company" 
            value={form.customer_company} 
            onChange={(e) => setForm({ ...form, customer_company: e.target.value })} 
            data-testid="customer-company-input"
          />

          <select 
            className="w-full border rounded-xl px-4 py-3" 
            value={form.payment_method} 
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            data-testid="payment-method-select"
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="manual">Manual</option>
          </select>

          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Payment Reference" 
            value={form.payment_reference} 
            onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} 
            data-testid="payment-reference-input"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="External Reference" 
            value={form.external_reference} 
            onChange={(e) => setForm({ ...form, external_reference: e.target.value })} 
            data-testid="external-reference-input"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            type="number" 
            placeholder="Amount Received" 
            value={form.amount_received} 
            onChange={(e) => setForm({ ...form, amount_received: e.target.value })} 
            data-testid="amount-received-input"
          />

          <textarea 
            className="w-full border rounded-xl px-4 py-3 min-h-[120px]" 
            placeholder="Notes" 
            value={form.notes} 
            onChange={(e) => setForm({ ...form, notes: e.target.value })} 
            data-testid="payment-notes-input"
          />

          <div className="rounded-2xl bg-slate-50 border p-4">
            <div className="text-sm text-slate-500">Allocated Total</div>
            <div className="text-xl font-bold mt-2" data-testid="allocated-total">
              {form.currency} {Number(totalAllocated || 0).toLocaleString()}
            </div>
          </div>

          <button 
            className="w-full rounded-xl bg-[#2D3E50] text-white py-3 font-semibold"
            data-testid="save-payment-btn"
          >
            Save Payment
          </button>
        </form>

        <div className="rounded-3xl border bg-white p-6" data-testid="allocate-invoices-section">
          <h2 className="text-2xl font-bold">Allocate to Invoices</h2>

          <div className="space-y-4 mt-5">
            {customerInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border p-4" data-testid={`invoice-${invoice.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">{invoice.invoice_number}</div>
                    <div className="text-sm text-slate-500 mt-1">
                      Balance: {invoice.currency || "TZS"} {Number(invoice.balance_due || invoice.total || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Status: {invoice.status}
                    </div>
                  </div>

                  <input
                    className="border rounded-xl px-4 py-3 w-[180px]"
                    type="number"
                    placeholder="Allocate amount"
                    value={allocations[invoice.id] || ""}
                    onChange={(e) =>
                      setAllocations({
                        ...allocations,
                        [invoice.id]: e.target.value,
                      })
                    }
                    data-testid={`allocate-${invoice.id}`}
                  />
                </div>
              </div>
            ))}

            {!customerInvoices.length && (
              <div className="text-sm text-slate-500">Load a customer to allocate payments.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
