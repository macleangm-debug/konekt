import React, { useState } from "react";
import { FileText, Download, Search } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function StatementPage() {
  const [customerEmail, setCustomerEmail] = useState("");
  const [statement, setStatement] = useState(null);
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStatement = async () => {
    if (!customerEmail) {
      setError("Please enter a customer email");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setStatement(null);
      setAging(null);
      
      const [statementRes, agingRes] = await Promise.all([
        api.get(`/api/admin/statements/customer/${encodeURIComponent(customerEmail)}`),
        api.get(`/api/admin/statements/customer/${encodeURIComponent(customerEmail)}/aging`).catch(() => null),
      ]);
      
      setStatement(statementRes.data);
      if (agingRes) setAging(agingRes.data);
    } catch (err) {
      console.error("Failed to load statement", err);
      setError(err.response?.data?.detail || "No statement data found for this customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="statement-page">
      <div className="max-w-none w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#D4A843]" />
            Statement of Account
          </h1>
          <p className="mt-1 text-slate-600">
            View invoice and payment history for a client account.
          </p>
        </div>

        {/* Search Form */}
        <div className="rounded-2xl border bg-white p-6 flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-sm font-medium text-slate-700 mb-2">Customer Email</label>
            <input
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
              placeholder="Enter customer email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadStatement()}
              data-testid="customer-email-input"
            />
          </div>
          <button
            type="button"
            onClick={loadStatement}
            disabled={loading}
            className="rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold hover:bg-[#3d5166] disabled:opacity-50"
            data-testid="load-statement-btn"
          >
            {loading ? "Loading..." : "Load Statement"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        {statement && (
          <>
            {/* Customer Info & PDF Download */}
            <div className="rounded-2xl border bg-white p-5 flex items-start justify-between">
              <div>
                {(statement.customer_name || statement.customer_company) ? (
                  <>
                    <h2 className="text-lg font-bold">{statement.customer_company || statement.customer_name}</h2>
                    <p className="text-slate-600">{statement.customer_email}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold">{statement.customer_email}</h2>
                    <p className="text-slate-600">Customer Account</p>
                  </>
                )}
              </div>
              <a
                href={`${API_URL}/api/pdf/statements/${encodeURIComponent(statement.customer_email)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#2a4a66] transition-colors shrink-0"
                data-testid="download-statement-pdf"
              >
                <Download className="w-4 h-4" /> Download PDF
              </a>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border bg-white p-5">
                <div className="text-sm text-slate-500">Total Invoiced</div>
                <div className="text-2xl font-bold mt-2">
                  {formatMoney(statement.summary.total_invoiced)}
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <div className="text-sm text-slate-500">Total Paid</div>
                <div className="text-2xl font-bold mt-2 text-green-600">
                  {formatMoney(statement.summary.total_paid)}
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <div className="text-sm text-slate-500">Balance Due</div>
                <div className={`text-2xl font-bold mt-2 ${statement.summary.balance_due > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatMoney(statement.summary.balance_due)}
                </div>
              </div>
            </div>

            {/* Aging Report */}
            {aging && aging.total_outstanding > 0 && (
              <div className="rounded-2xl border bg-white p-5">
                <h2 className="text-lg font-bold mb-4">Aging Summary</h2>
                <div className="grid sm:grid-cols-4 gap-4">
                  {Object.entries(aging.aging).map(([key, bucket]) => (
                    <div key={key} className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-600">{bucket.label}</div>
                      <div className={`text-lg font-bold mt-1 ${bucket.amount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {formatMoney(bucket.amount)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {bucket.invoices?.length || 0} invoice(s)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statement Entries Table */}
            <div className="rounded-2xl border bg-white overflow-hidden">
              <div className="px-5 py-4 border-b bg-slate-50">
                <h2 className="text-lg font-bold">Transaction History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-5 py-4 text-sm font-semibold">Date</th>
                      <th className="px-5 py-4 text-sm font-semibold">Type</th>
                      <th className="px-5 py-4 text-sm font-semibold">Document</th>
                      <th className="px-5 py-4 text-sm font-semibold">Description</th>
                      <th className="px-5 py-4 text-sm font-semibold text-right">Debit</th>
                      <th className="px-5 py-4 text-sm font-semibold text-right">Credit</th>
                      <th className="px-5 py-4 text-sm font-semibold text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.entries.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm">
                          {item.date ? new Date(item.date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            item.entry_type === "invoice" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                          }`}>
                            {item.entry_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-medium">{item.document_number}</td>
                        <td className="px-5 py-4 text-slate-600">{item.description}</td>
                        <td className="px-5 py-4 text-right">
                          {item.debit > 0 ? formatMoney(item.debit) : "—"}
                        </td>
                        <td className="px-5 py-4 text-right text-green-600">
                          {item.credit > 0 ? formatMoney(item.credit) : "—"}
                        </td>
                        <td className={`px-5 py-4 text-right font-medium ${item.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatMoney(item.balance)}
                        </td>
                      </tr>
                    ))}
                    {statement.entries.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generated At */}
            <div className="text-sm text-slate-500 text-right">
              Statement generated: {new Date(statement.generated_at).toLocaleString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
