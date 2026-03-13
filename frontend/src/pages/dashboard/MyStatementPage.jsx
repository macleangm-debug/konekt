import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function MyStatementPage() {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/customer/statements/me");
        setStatement(res.data);
      } catch (err) {
        console.error("Failed to load statement:", err);
        setError("Unable to load statement. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">No statement data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-bold" data-testid="statement-title">My Statement</h1>
          <p className="mt-2 text-slate-600">
            View your invoices, payments, and current balance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-3xl border bg-white p-5" data-testid="total-invoiced-card">
            <div className="text-sm text-slate-500">Total Invoiced</div>
            <div className="text-2xl font-bold mt-2">
              TZS {Number(statement.summary?.total_invoiced || 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-3xl border bg-white p-5" data-testid="total-paid-card">
            <div className="text-sm text-slate-500">Total Paid</div>
            <div className="text-2xl font-bold mt-2">
              TZS {Number(statement.summary?.total_paid || 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-3xl border bg-white p-5" data-testid="balance-due-card">
            <div className="text-sm text-slate-500">Balance Due</div>
            <div className="text-2xl font-bold mt-2">
              TZS {Number(statement.summary?.balance_due || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white overflow-hidden" data-testid="statement-table">
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
                {(statement.entries || []).map((item, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="px-5 py-4">
                      {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        item.entry_type === "invoice" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-green-100 text-green-700"
                      }`}>
                        {item.entry_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">{item.document_number}</td>
                    <td className="px-5 py-4">{item.description}</td>
                    <td className="px-5 py-4 text-right">TZS {Number(item.debit || 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">TZS {Number(item.credit || 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-right font-medium">TZS {Number(item.balance || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {!(statement.entries || []).length && (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
