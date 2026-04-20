import React, { useState, useEffect } from "react";
import { BarChart3, Download, Globe, TrendingUp, Users, FileText, DollarSign } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const fmtMoney = (v) => `TZS ${Number(v || 0).toLocaleString()}`;
const PERIODS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
];

export default function AdminReportsPage() {
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/admin/reports/summary?period=${period}`)
      .then(res => setReport(res.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [period]);

  const exportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `konekt-report-${period}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  return (
    <div className="space-y-6" data-testid="admin-reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#D4A843]" /> Business Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">Revenue, profit, and operational metrics by country</p>
        </div>
        <button onClick={exportJSON} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#20364D] text-white text-sm font-semibold hover:bg-[#1a2d40] transition" data-testid="export-report-btn">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2" data-testid="period-selector">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${period === p.key ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading report...</div>
      ) : !report ? (
        <div className="text-center py-12 text-slate-400">Failed to load report</div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="totals-row">
            <KpiBox label="Revenue" value={fmtMoney(report.totals.revenue)} icon={DollarSign} color="text-emerald-600" />
            <KpiBox label="Profit" value={fmtMoney(report.totals.profit)} icon={TrendingUp} color="text-[#D4A843]" />
            <KpiBox label="Orders" value={report.totals.orders} icon={FileText} color="text-blue-600" />
            <KpiBox label="Quotes" value={report.totals.quotes} icon={FileText} color="text-purple-600" />
            <KpiBox label="Invoices" value={report.totals.invoices} icon={FileText} color="text-amber-600" />
            <KpiBox label="New Customers" value={report.totals.new_customers} icon={Users} color="text-teal-600" />
          </div>

          {/* Country Breakdown */}
          <div className="rounded-2xl border bg-white overflow-hidden" data-testid="country-breakdown">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-[#20364D]">Country Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Country</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">Revenue</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">Profit</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">Margin</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">Orders</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">Quotes</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">New Custs</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.countries).map(([code, data]) => {
                    const FLAGS = { TZ: "\u{1F1F9}\u{1F1FF}", KE: "\u{1F1F0}\u{1F1EA}", UG: "\u{1F1FA}\u{1F1EC}" };
                    return (
                      <tr key={code} className="border-b last:border-b-0 hover:bg-slate-50" data-testid={`country-row-${code}`}>
                        <td className="px-5 py-3 font-medium">{FLAGS[code] || ""} {code}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-600">{fmtMoney(data.revenue)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-[#D4A843]">{fmtMoney(data.profit)}</td>
                        <td className="px-5 py-3 text-right">{data.margin_pct}%</td>
                        <td className="px-5 py-3 text-right">{data.orders}</td>
                        <td className="px-5 py-3 text-right">{data.quotes}</td>
                        <td className="px-5 py-3 text-right">{data.new_customers}</td>
                        <td className="px-5 py-3 text-right text-red-500">{fmtMoney(data.outstanding)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiBox({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border bg-white p-4 card-lift">
      <Icon className={`w-4 h-4 ${color} mb-1.5`} />
      <div className="text-lg font-bold text-[#20364D]">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div>
    </div>
  );
}
