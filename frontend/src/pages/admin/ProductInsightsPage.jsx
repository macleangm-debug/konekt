import React, { useEffect, useState } from "react";
import { Loader2, TrendingUp, DollarSign, Package, RefreshCcw, Building2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ProductInsightsPage() {
  const [fastMoving, setFastMoving] = useState([]);
  const [topRevenue, setTopRevenue] = useState([]);
  const [highMargin, setHighMargin] = useState([]);
  const [repeatOrders, setRepeatOrders] = useState([]);
  const [inHouseOpportunity, setInHouseOpportunity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fast-moving");

  const token = localStorage.getItem("admin_token");

  const loadData = async () => {
    try {
      const [fastRes, revenueRes, marginRes, repeatRes, opportunityRes] = await Promise.all([
        fetch(`${API}/api/admin/product-insights/fast-moving`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/product-insights/top-revenue`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/product-insights/high-margin`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/product-insights/repeat-orders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/product-insights/in-house-opportunity`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (fastRes.ok) setFastMoving(await fastRes.json());
      if (revenueRes.ok) setTopRevenue(await revenueRes.json());
      if (marginRes.ok) setHighMargin(await marginRes.json());
      if (repeatRes.ok) setRepeatOrders(await repeatRes.json());
      if (opportunityRes.ok) setInHouseOpportunity(await opportunityRes.json());
    } catch (error) {
      console.error(error);
      toast.error("Failed to load product insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const tabs = [
    { key: "fast-moving", label: "Fast Moving", icon: TrendingUp },
    { key: "top-revenue", label: "Top Revenue", icon: DollarSign },
    { key: "high-margin", label: "High Margin", icon: Package },
    { key: "repeat-orders", label: "Repeat Orders", icon: RefreshCcw },
    { key: "in-house", label: "In-House Opportunity", icon: Building2 },
  ];

  return (
    <div className="p-6" data-testid="product-insights-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Product Insights</h1>
        <p className="text-slate-500">Analyze product performance, margins, and opportunities.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp className="w-4 h-4" />
            Fast Moving SKUs
          </div>
          <div className="text-3xl font-bold mt-1">{fastMoving.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <DollarSign className="w-4 h-4" />
            Total Revenue (Top 50)
          </div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            TZS {topRevenue.reduce((s, p) => s + (p.revenue || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Package className="w-4 h-4" />
            High Margin Products
          </div>
          <div className="text-3xl font-bold mt-1 text-blue-600">{highMargin.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Building2 className="w-4 h-4" />
            In-House Candidates
          </div>
          <div className="text-3xl font-bold mt-1 text-purple-600">{inHouseOpportunity.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(key)}
          >
            <Icon className="w-4 h-4 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* Fast Moving Tab */}
      {activeTab === "fast-moving" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Fast Moving Products (by Quantity)</h2>
          </div>
          {fastMoving.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No order data available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rank</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Qty Sold</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Orders</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {fastMoving.slice(0, 20).map((product, idx) => (
                    <tr key={product.sku || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          idx < 3 ? "bg-[#D4A843]" : "bg-slate-300"
                        }`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 font-medium">{product.name || "-"}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{product.total_qty?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{product.total_orders}</td>
                      <td className="px-4 py-3 text-right">TZS {product.revenue?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Top Revenue Tab */}
      {activeTab === "top-revenue" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Top Revenue Products</h2>
          </div>
          {topRevenue.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No revenue data available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rank</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Orders</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {topRevenue.slice(0, 20).map((product, idx) => (
                    <tr key={product.sku || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          idx < 3 ? "bg-green-500" : "bg-slate-300"
                        }`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 font-medium">{product.name || "-"}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">TZS {product.revenue?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{product.orders}</td>
                      <td className="px-4 py-3 text-right">{product.quantity?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* High Margin Tab */}
      {activeTab === "high-margin" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">High Margin Products</h2>
          </div>
          {highMargin.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No margin data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Partner Cost</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Customer Price</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Margin</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {highMargin.slice(0, 20).map((product, idx) => (
                    <tr key={product.id || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 font-medium">{product.name || "-"}</td>
                      <td className="px-4 py-3 text-right">TZS {product.base_partner_price?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">TZS {product.customer_price?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-green-600">TZS {product.margin?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${
                          product.margin_percent >= 30 ? "text-green-600" : 
                          product.margin_percent >= 15 ? "text-amber-600" : "text-slate-600"
                        }`}>
                          {product.margin_percent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Repeat Orders Tab */}
      {activeTab === "repeat-orders" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Products with Highest Repeat Order Rates</h2>
          </div>
          {repeatOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <RefreshCcw className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No repeat order data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rank</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Unique Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {repeatOrders.slice(0, 20).map((product, idx) => (
                    <tr key={product.sku || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          idx < 3 ? "bg-purple-500" : "bg-slate-300"
                        }`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 font-medium">{product.name || "-"}</td>
                      <td className="px-4 py-3 text-right font-bold text-purple-600">{product.unique_customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* In-House Opportunity Tab */}
      {activeTab === "in-house" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">In-House Production Candidates</h2>
            <p className="text-xs text-slate-500 mt-1">Products with high volume suitable for in-house manufacturing</p>
          </div>
          {inHouseOpportunity.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No opportunity data available (need 3+ orders)</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Orders</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Total Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Opportunity Score</th>
                  </tr>
                </thead>
                <tbody>
                  {inHouseOpportunity.slice(0, 20).map((product, idx) => (
                    <tr key={product.sku || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 font-medium">{product.name || "-"}</td>
                      <td className="px-4 py-3 text-right">{product.total_orders}</td>
                      <td className="px-4 py-3 text-right">{product.total_quantity?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">TZS {product.revenue?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          product.opportunity_score >= 7 ? "bg-green-100 text-green-700" :
                          product.opportunity_score >= 4 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {product.opportunity_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
