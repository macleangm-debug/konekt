import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { DollarSign, TrendingUp, Wallet, ArrowUpRight } from "lucide-react";

export default function AffiliateDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [requesting, setRequesting] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/api/affiliate/me");
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requestPayout = async () => {
    if (!payoutAmount || Number(payoutAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    try {
      setRequesting(true);
      await api.post("/api/affiliate/me/payout-request", {
        amount: Number(payoutAmount),
      });
      setPayoutAmount("");
      load();
      alert("Payout request submitted successfully");
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to submit payout request");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded mb-4"></div>
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-3xl border bg-white p-10 text-center">
          <p className="text-slate-500">Affiliate profile not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="affiliate-dashboard-page">
      <div className="text-left">
        <h1 className="text-4xl font-bold text-[#2D3E50]">Affiliate Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Track partner commissions, balances, and payout requests.
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-3xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Total Earned</div>
              <div className="text-2xl font-bold mt-1">TZS {Number(data.summary.total_earned || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Approved</div>
              <div className="text-2xl font-bold mt-1">TZS {Number(data.summary.total_approved || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Paid Out</div>
              <div className="text-2xl font-bold mt-1">TZS {Number(data.summary.total_paid || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Payable Balance</div>
              <div className="text-2xl font-bold mt-1">TZS {Number(data.summary.payable_balance || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Identity */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold text-[#2D3E50]">Partner Identity</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Promo Code</div>
            <div className="text-lg font-bold mt-1">{data.profile.promo_code || "-"}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Commission Rate</div>
            <div className="text-lg font-bold mt-1">{data.profile.commission_rate || 0}%</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Status</div>
            <div className="text-lg font-bold mt-1 capitalize">{data.profile.status || "-"}</div>
          </div>
        </div>
        {data.profile.referral_link && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50">
            <div className="text-sm text-slate-500">Referral Link</div>
            <div className="text-slate-700 mt-1 break-all">{data.profile.referral_link}</div>
          </div>
        )}
      </div>

      {/* Request Payout */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold text-[#2D3E50]">Request Payout</h2>
        <p className="text-slate-600 mt-2">
          Request a payout from your approved commission balance.
        </p>
        <div className="flex gap-3 mt-4">
          <input
            className="flex-1 border rounded-xl px-4 py-3"
            placeholder="Amount (TZS)"
            type="number"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
          />
          <button
            onClick={requestPayout}
            disabled={requesting}
            className="rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold hover:bg-[#1e2d3d] disabled:opacity-50"
          >
            {requesting ? "Submitting..." : "Request"}
          </button>
        </div>
      </div>

      {/* Commission History */}
      {(data.commissions || []).length > 0 && (
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Commission History</h2>
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-sm font-semibold">Source</th>
                  <th className="px-4 py-3 text-sm font-semibold">Sale Amount</th>
                  <th className="px-4 py-3 text-sm font-semibold">Commission</th>
                  <th className="px-4 py-3 text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3">{c.source_document || "-"}</td>
                    <td className="px-4 py-3">TZS {Number(c.sale_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">TZS {Number(c.commission_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{c.status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Requests */}
      {(data.payout_requests || []).length > 0 && (
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Payout Requests</h2>
          <div className="space-y-3 mt-4">
            {data.payout_requests.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div>
                  <div className="font-semibold">TZS {Number(p.amount || 0).toLocaleString()}</div>
                  <div className="text-sm text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  p.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                  p.status === "pending" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
