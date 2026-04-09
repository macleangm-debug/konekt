import React, { useEffect, useState } from "react";
import { Receipt, TrendingUp, Clock, CheckCircle } from "lucide-react";
import partnerApi from "../../lib/partnerApi";

export default function PartnerSettlementsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await partnerApi.get("/api/partner-portal/settlements");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load settlements:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading settlements...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-red-500">Failed to load settlement data</div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      allocated: "bg-blue-100 text-blue-700",
      accepted: "bg-indigo-100 text-indigo-700",
      in_progress: "bg-amber-100 text-amber-700",
      fulfilled: "bg-green-100 text-green-700",
      issue_reported: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const getSettlementStatusBadge = (status) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700";
      case "pending": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partner-settlements-page">
      <div>
        <h1 className="text-4xl font-bold text-[#20364D]">Settlement Summary</h1>
        <p className="text-slate-600 mt-1">Track your earnings from fulfillment</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-sm text-slate-500">Pending Settlement</div>
          </div>
          <div className="text-3xl font-bold text-[#20364D]">
            TZS {Number(data.total_due || 0).toLocaleString()}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-sm text-slate-500">Total Paid</div>
          </div>
          <div className="text-3xl font-bold text-green-600">
            TZS {Number(data.total_paid || 0).toLocaleString()}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-slate-500">All-Time Earnings</div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            TZS {Number(data.total_all_time || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Settlement Note */}
      <div className="rounded-3xl border bg-amber-50 p-6">
        <h3 className="font-semibold text-amber-800 mb-2">Settlement Information</h3>
        <p className="text-amber-700 text-sm">
          Settlements are processed according to your agreed payment terms. 
          The amounts shown are estimates based on completed fulfillment jobs. 
          Final settlement amounts may vary based on adjustments and returns.
        </p>
      </div>

      {/* Transaction History */}
      <div className="rounded-3xl border bg-white overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Transaction History</h2>
        </div>

        {data.rows?.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Item</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">SKU</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">Qty</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">Job Status</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">Settlement</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Amount</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows?.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 text-sm font-medium">{row.item_name || row.sku}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">{row.sku}</td>
                    <td className="px-6 py-4 text-sm text-center">{row.quantity}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(row.status)}`}>
                        {(row.status || "").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSettlementStatusBadge(row.settlement_status)}`}>
                        {row.settlement_status || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold">
                      TZS {Number(row.settlement_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
