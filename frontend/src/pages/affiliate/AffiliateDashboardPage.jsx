import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function AffiliateDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestForm, setRequestForm] = useState({
    requested_amount: 0,
    notes: "",
  });

  const load = async () => {
    try {
      const res = await api.get("/api/affiliate-self/dashboard");
      setData(res.data);
    } catch (error) {
      console.error("Failed to load affiliate dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requestPayout = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/affiliate-self/payout-request", {
        requested_amount: Number(requestForm.requested_amount),
        notes: requestForm.notes,
      });
      setRequestForm({ requested_amount: 0, notes: "" });
      load();
    } catch (error) {
      console.error("Failed to request payout:", error);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Affiliate profile not found. Please apply to become an affiliate.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-bold" data-testid="affiliate-dashboard-title">Affiliate Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Track your partner performance, commissions, and payouts.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          <div className="rounded-3xl border bg-white p-5" data-testid="promo-code-card">
            <div className="text-sm text-slate-500">Promo Code</div>
            <div className="text-xl font-bold mt-2">{data.affiliate_code || "-"}</div>
          </div>
          <div className="rounded-3xl border bg-white p-5" data-testid="sales-count-card">
            <div className="text-sm text-slate-500">Sales Count</div>
            <div className="text-xl font-bold mt-2">{data.stats?.sales_count || 0}</div>
          </div>
          <div className="rounded-3xl border bg-white p-5" data-testid="total-commission-card">
            <div className="text-sm text-slate-500">Total Commission</div>
            <div className="text-xl font-bold mt-2">TZS {Number(data.stats?.total_commission || 0).toLocaleString()}</div>
          </div>
          <div className="rounded-3xl border bg-white p-5" data-testid="approved-commission-card">
            <div className="text-sm text-slate-500">Approved</div>
            <div className="text-xl font-bold mt-2">TZS {Number(data.stats?.approved_commission || 0).toLocaleString()}</div>
          </div>
          <div className="rounded-3xl border bg-white p-5" data-testid="paid-commission-card">
            <div className="text-sm text-slate-500">Paid</div>
            <div className="text-xl font-bold mt-2">TZS {Number(data.stats?.paid_commission || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="grid xl:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-6" data-testid="commissions-section">
              <h2 className="text-2xl font-bold">Commissions</h2>
              <div className="space-y-4 mt-5">
                {(data.commissions || []).map((item) => (
                  <div key={item.id} className="rounded-2xl border p-4" data-testid={`commission-${item.id}`}>
                    <div className="font-medium">{item.order_number}</div>
                    <div className="text-sm text-slate-500 mt-1">{item.customer_email}</div>
                    <div className="text-sm text-slate-600 mt-2">
                      Order Total: TZS {Number(item.order_total || 0).toLocaleString()} &bull; Commission: TZS {Number(item.commission_amount || 0).toLocaleString()}
                    </div>
                    <div className="mt-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        item.status === "paid" 
                          ? "bg-green-100 text-green-700" 
                          : item.status === "approved" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
                {!(data.commissions || []).length && (
                  <div className="text-sm text-slate-500">No commissions yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-6" data-testid="payouts-section">
              <h2 className="text-2xl font-bold">Payout History</h2>
              <div className="space-y-4 mt-5">
                {(data.payouts || []).map((item) => (
                  <div key={item.id} className="rounded-2xl border p-4" data-testid={`payout-${item.id}`}>
                    <div className="font-medium">TZS {Number(item.requested_amount || 0).toLocaleString()}</div>
                    <div className="text-sm text-slate-500 mt-1">{item.status}</div>
                  </div>
                ))}
                {!(data.payouts || []).length && (
                  <div className="text-sm text-slate-500">No payouts yet.</div>
                )}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border bg-white p-6 h-fit" data-testid="payout-request-form">
            <h2 className="text-2xl font-bold">Request Payout</h2>
            <form onSubmit={requestPayout} className="space-y-4 mt-5">
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                placeholder="Requested Amount"
                value={requestForm.requested_amount}
                onChange={(e) => setRequestForm({ ...requestForm, requested_amount: e.target.value })}
                data-testid="payout-amount-input"
              />
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[100px]"
                placeholder="Notes"
                value={requestForm.notes}
                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                data-testid="payout-notes-input"
              />
              <button 
                className="w-full rounded-xl bg-[#2D3E50] text-white py-3 font-semibold"
                data-testid="submit-payout-btn"
              >
                Submit Request
              </button>
            </form>

            <div className="rounded-2xl bg-slate-50 border p-4 mt-6">
              <div className="text-sm text-slate-500">Tracking Link</div>
              <div className="text-sm font-medium mt-2 break-all">
                {window.location.origin}/a/{data.affiliate_code}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
