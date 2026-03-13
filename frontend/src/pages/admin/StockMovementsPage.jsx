import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skuFilter, setSkuFilter] = useState("");

  const load = async () => {
    try {
      const params = skuFilter ? { sku: skuFilter } : {};
      const res = await api.get("/api/admin/stock-movements", { params });
      setMovements(res.data || []);
    } catch (error) {
      console.error("Failed to load movements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-none w-full space-y-6">
        <div className="text-left">
          <h1 className="text-4xl font-bold" data-testid="stock-movements-title">Stock Movements</h1>
          <p className="mt-2 text-slate-600">
            View transfer, allocation, and stock activity history.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 max-w-md">
          <input
            className="flex-1 border rounded-xl px-4 py-3"
            placeholder="Filter by SKU"
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            data-testid="sku-filter-input"
          />
          <button 
            type="submit"
            className="rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-medium"
            data-testid="search-btn"
          >
            Search
          </button>
          <button 
            type="button"
            onClick={() => { setSkuFilter(""); load(); }}
            className="rounded-xl border px-5 py-3 font-medium"
            data-testid="clear-btn"
          >
            Clear
          </button>
        </form>

        <div className="rounded-3xl border bg-white overflow-hidden" data-testid="movements-table">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold">Date</th>
                  <th className="px-5 py-4 text-sm font-semibold">Type</th>
                  <th className="px-5 py-4 text-sm font-semibold">SKU</th>
                  <th className="px-5 py-4 text-sm font-semibold">Warehouse</th>
                  <th className="px-5 py-4 text-sm font-semibold text-right">Quantity</th>
                  <th className="px-5 py-4 text-sm font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0" data-testid={`movement-${item.id}`}>
                    <td className="px-5 py-4">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        item.movement_type === "transfer_in" ? "bg-green-100 text-green-700" :
                        item.movement_type === "transfer_out" ? "bg-orange-100 text-orange-700" :
                        item.movement_type === "reserve" ? "bg-blue-100 text-blue-700" :
                        item.movement_type === "deduct" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {item.movement_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium">{item.sku}</td>
                    <td className="px-5 py-4">{item.warehouse || "-"}</td>
                    <td className={`px-5 py-4 text-right font-medium ${
                      item.quantity > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {item.quantity > 0 ? "+" : ""}{item.quantity}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{item.reference_type}</td>
                  </tr>
                ))}
                {!movements.length && (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-slate-500">
                      No stock movements found
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
