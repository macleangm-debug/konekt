import React, { useEffect, useState } from "react";
import api from "../../../lib/api";
import { useBranding } from "../../../contexts/BrandingContext";
import { exportCSV, exportPDF, fmtMoney } from "../../../lib/reportExportUtils";
import {
  Package, TrendingUp, TrendingDown, AlertTriangle,
  FileText, Download, Calendar, CheckCircle, XCircle,
  BarChart3, Truck, Star, ShoppingCart, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

const CLASS_COLORS = { Fast: "#10B981", Moderate: "#3B82F6", Slow: "#F59E0B", Dead: "#EF4444" };
const CLASS_BADGE = {
  fast: "bg-green-100 text-green-700",
  moderate: "bg-blue-100 text-blue-700",
  slow: "bg-amber-100 text-amber-700",
  dead: "bg-red-100 text-red-700",
};
const TREND_ICON = {
  increasing: <ArrowUpRight className="w-3 h-3 text-green-500" />,
  decreasing: <ArrowDownRight className="w-3 h-3 text-red-500" />,
  stable: <Minus className="w-3 h-3 text-slate-400" />,
};

export default function InventoryIntelligencePage() {
  const branding = useBranding();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(180);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    setLoading(true);
    api.get(`/api/admin/reports/inventory-intelligence?days=${days}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  const handlePDF = () => {
    if (!data) return;
    const k = data.kpis || {};
    const headers = tab === "procurement"
      ? ["Product", "Classification", "Units Sold", "Revenue", "Last Sold", "Trend"]
      : ["Product", "Units Sold", "Revenue", "Orders", "Last Sold", "Status", "Trend"];
    const rows = (tab === "procurement" ? data.procurement?.review_remove : data.products)
      ?.slice(0, 50)
      .map((p) => [
        p.product_name, p.classification?.toUpperCase() || "", p.units_sold,
        fmtMoney(p.revenue), p.last_sold || "Never", p.trend || ""
      ]) || [];
    exportPDF({
      title: tab === "procurement" ? "Procurement Insights" : "Inventory & Product Intelligence",
      subtitle: `Last ${days} days`,
      branding,
      kpis: [
        { label: "Total Products", value: String(k.total_products || 0) },
        { label: "Units Sold", value: String(k.total_units_sold || 0) },
        { label: "Fast", value: String(k.fast_products || 0) },
        { label: "Dead", value: String(k.dead_products || 0) },
      ],
      tableHeaders: headers,
      tableRows: rows,
      filename: `inventory-${tab}-${days}d`,
    });
  };

  const handleCSV = () => {
    if (!data) return;
    exportCSV(
      `inventory-products-${days}d`,
      ["Product", "Units Sold", "Revenue", "Orders", "Last Sold", "Days Inactive", "Classification", "Trend"],
      (data.products || []).map((p) => [
        p.product_name, p.units_sold, p.revenue, p.order_count, p.last_sold,
        p.days_inactive ?? "N/A", p.classification, p.trend
      ])
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64" data-testid="inv-loading"><div className="animate-pulse text-slate-400 text-sm">Loading inventory data...</div></div>;

  const k = data?.kpis || {};
  const products = data?.products || [];
  const top10 = data?.charts?.top_10_revenue || [];
  const classDist = data?.charts?.classification_distribution || [];
  const salesTrend = data?.charts?.sales_trend || [];
  const procurement = data?.procurement || {};

  const fastProducts = products.filter((p) => p.classification === "fast");
  const slowDead = products.filter((p) => p.classification === "slow" || p.classification === "dead");

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "fast", label: `Fast (${k.fast_products || 0})` },
    { key: "slowdead", label: `Slow/Dead (${(k.slow_products || 0) + (k.dead_products || 0)})` },
    { key: "procurement", label: "Procurement" },
  ];

  return (
    <div className="space-y-6" data-testid="inventory-intelligence-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20364D]" data-testid="inv-title">Inventory & Product Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">Product performance, stock health, and procurement insights</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700" data-testid="inv-days-filter">
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days</option>
            </select>
          </div>
          <button onClick={handlePDF} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="inv-export-pdf"><FileText className="w-3.5 h-3.5" /> PDF</button>
          <button onClick={handleCSV} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="inv-export-csv"><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3" data-testid="inv-kpi-row">
        <KpiCard icon={Package} label="Total Products" value={k.total_products || 0} color="bg-slate-50 text-slate-600" />
        <KpiCard icon={ShoppingCart} label="Units Sold" value={k.total_units_sold || 0} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={TrendingUp} label="Revenue" value={fmtMoney(k.total_product_revenue)} color="bg-green-50 text-green-600" />
        <KpiCard icon={Star} label="Top Product" value={k.top_product || "—"} color="bg-amber-50 text-amber-600" small />
        <KpiCard icon={CheckCircle} label="Fast" value={k.fast_products || 0} color="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={AlertTriangle} label="Slow" value={k.slow_products || 0} color="bg-orange-50 text-orange-600" />
        <KpiCard icon={XCircle} label="Dead" value={k.dead_products || 0} color="bg-red-50 text-red-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit" data-testid="inv-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${tab === t.key ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500 hover:text-slate-700"}`} data-testid={`inv-tab-${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Top Products Bar Chart */}
            <div className="md:col-span-2 bg-white border rounded-2xl p-5" data-testid="inv-top-products-chart">
              <h3 className="font-semibold text-[#20364D] text-sm mb-4">Top 10 Products by Revenue</h3>
              {top10.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={top10} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                    <YAxis type="category" dataKey="product" tick={{ fontSize: 10, fill: "#94a3b8" }} width={130} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v, name) => [name === "revenue" ? fmtMoney(v) : v, name === "revenue" ? "Revenue" : "Units"]} />
                    <Bar dataKey="revenue" fill="#20364D" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No data</div>}
            </div>

            {/* Classification Pie */}
            <div className="bg-white border rounded-2xl p-5" data-testid="inv-classification-chart">
              <h3 className="font-semibold text-[#20364D] text-sm mb-4">Product Health</h3>
              {classDist.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={classDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30}>
                        {classDist.map((d) => <Cell key={d.name} fill={CLASS_COLORS[d.name] || "#94a3b8"} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {classDist.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLASS_COLORS[d.name] }} />
                        <span className="text-slate-600 flex-1">{d.name}</span>
                        <span className="font-bold text-slate-700">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data</div>}
            </div>
          </div>

          {/* Sales Trend */}
          <div className="bg-white border rounded-2xl p-5" data-testid="inv-sales-trend">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Product Sales Trend</h3>
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="units" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} name="Units Sold" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No data</div>}
          </div>
        </div>
      )}

      {/* ── FAST PRODUCTS TAB ── */}
      {tab === "fast" && (
        <div className="bg-white border rounded-2xl p-5" data-testid="inv-fast-table">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Fast-Moving Products</h3>
          <ProductTable products={fastProducts} />
        </div>
      )}

      {/* ── SLOW/DEAD TAB ── */}
      {tab === "slowdead" && (
        <div className="bg-white border rounded-2xl p-5" data-testid="inv-slowdead-table">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Slow & Dead Stock</h3>
          <ProductTable products={slowDead} showInactive />
        </div>
      )}

      {/* ── PROCUREMENT TAB ── */}
      {tab === "procurement" && (
        <div className="space-y-4">
          {/* Restock Recommendations */}
          <div className="bg-white border rounded-2xl p-5" data-testid="inv-restock">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <h3 className="font-semibold text-[#20364D] text-sm">Restock Recommendations</h3>
            </div>
            {procurement.restock_recommendations?.length > 0 ? (
              <div className="space-y-2">
                {procurement.restock_recommendations.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border-l-2 border-green-400">
                    <div>
                      <p className="text-sm font-medium text-[#20364D]">{p.product_name}</p>
                      <p className="text-xs text-slate-500">{p.units_sold} units &middot; {fmtMoney(p.revenue)} revenue</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs font-semibold text-green-700">Increasing demand</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-6">No restock recommendations — all fast products have stable demand</p>}
          </div>

          {/* Review / Remove */}
          <div className="bg-white border rounded-2xl p-5" data-testid="inv-review-remove">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-[#20364D] text-sm">Review / Remove</h3>
              {procurement.review_remove?.length > 0 && (
                <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">{procurement.review_remove.length}</span>
              )}
            </div>
            {procurement.review_remove?.length > 0 ? (
              <ProductTable products={procurement.review_remove} showInactive />
            ) : <p className="text-sm text-slate-400 text-center py-6">No products flagged for review</p>}
          </div>

          {/* Vendor Performance */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-2xl p-5" data-testid="inv-top-vendors">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold text-[#20364D] text-sm">Top Vendors</h3>
              </div>
              {procurement.top_vendors?.length > 0 ? (
                <div className="space-y-2">
                  {procurement.top_vendors.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border-b border-slate-50">
                      <div>
                        <p className="text-sm font-medium text-[#20364D]">{v.vendor_name}</p>
                        <p className="text-xs text-slate-500">{v.products} products &middot; {v.fast} fast</p>
                      </div>
                      <span className="text-sm font-bold text-green-600">{fmtMoney(v.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400 text-center py-6">No vendor data available</p>}
            </div>

            <div className="bg-white border rounded-2xl p-5" data-testid="inv-weak-vendors">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-[#20364D] text-sm">Underperforming Vendors</h3>
              </div>
              {procurement.weak_vendors?.length > 0 ? (
                <div className="space-y-2">
                  {procurement.weak_vendors.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border-b border-slate-50">
                      <div>
                        <p className="text-sm font-medium text-[#20364D]">{v.vendor_name}</p>
                        <p className="text-xs text-slate-500">{v.products} products &middot; {v.dead} dead &middot; {v.slow} slow</p>
                      </div>
                      <span className="text-xs font-bold text-red-600">{v.dead} dead</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400 text-center py-6">No underperforming vendors</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared Components ── */

function KpiCard({ icon: Icon, label, value, color, small }) {
  return (
    <div className="rounded-xl border bg-white p-4 flex flex-col gap-1">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className={`font-bold text-[#20364D] ${small ? "text-sm truncate" : "text-lg"}`}>{value}</p>
    </div>
  );
}

function ProductTable({ products, showInactive }) {
  if (!products || products.length === 0) return <p className="text-sm text-slate-400 text-center py-8">No products in this category</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Product</th>
            <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Units</th>
            <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue</th>
            <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Orders</th>
            <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Sold</th>
            {showInactive && <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Inactive</th>}
            <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
            <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trend</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition">
              <td className="py-2.5 px-2 font-medium text-[#20364D] truncate max-w-[180px]">{p.product_name}</td>
              <td className="py-2.5 px-2 text-center text-slate-700 font-semibold">{p.units_sold}</td>
              <td className="py-2.5 px-2 text-right text-slate-600">{fmtMoney(p.revenue)}</td>
              <td className="py-2.5 px-2 text-center text-slate-500">{p.order_count}</td>
              <td className="py-2.5 px-2 text-center text-xs text-slate-500">{p.last_sold}</td>
              {showInactive && <td className="py-2.5 px-2 text-center text-xs text-slate-500">{p.days_inactive != null ? `${p.days_inactive}d` : "—"}</td>}
              <td className="py-2.5 px-2 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${CLASS_BADGE[p.classification] || "bg-slate-100 text-slate-600"}`}>
                  {p.classification?.toUpperCase()}
                </span>
              </td>
              <td className="py-2.5 px-2 text-center">{TREND_ICON[p.trend] || TREND_ICON.stable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
