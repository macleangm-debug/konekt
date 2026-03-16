import React, { useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import partnerApi from "../../lib/partnerApi";

export default function PartnerStockTablePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});

  const load = async () => {
    try {
      const res = await partnerApi.get("/api/partner-portal/stock-table");
      setItems(res.data || []);
      setChanges({});
    } catch (err) {
      console.error("Failed to load stock table:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (itemId, field, value) => {
    setChanges((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        id: itemId,
        [field]: value,
      },
    }));
  };

  const getValue = (item, field) => {
    if (changes[item.id] && changes[item.id][field] !== undefined) {
      return changes[item.id][field];
    }
    return item[field];
  };

  const saveChanges = async () => {
    const updates = Object.values(changes);
    if (updates.length === 0) {
      alert("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const res = await partnerApi.post("/api/partner-portal/stock-table/bulk-update", { updates });
      alert(`Updated ${res.data.updated} items`);
      load();
    } catch (err) {
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(changes).length > 0;

  const getStatusColor = (status) => {
    switch (status) {
      case "in_stock": return "bg-green-100 text-green-700";
      case "low_stock": return "bg-amber-100 text-amber-700";
      case "out_of_stock": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partner-stock-table-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#20364D]">Stock Table</h1>
          <p className="text-slate-600 mt-1">Quick view and update your Konekt allocations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-white transition"
            data-testid="refresh-stock-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={saveChanges}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition ${
              hasChanges
                ? "bg-[#20364D] text-white hover:bg-[#2a4a68]"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
            data-testid="save-stock-btn"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm">
          You have {Object.keys(changes).length} unsaved change(s)
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading stock data...</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 text-center">
          <p className="text-slate-500">No catalog items found. Add items in the Catalog page first.</p>
        </div>
      ) : (
        <div className="rounded-3xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">SKU</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Category</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Base Price</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Konekt Qty</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Lead Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className={changes[item.id] ? "bg-amber-50/50" : ""}>
                    <td className="px-6 py-4 text-sm font-mono">{item.sku}</td>
                    <td className="px-6 py-4 text-sm font-medium">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{item.category || "-"}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        className="w-28 text-right border rounded-lg px-3 py-2 text-sm"
                        value={getValue(item, "base_partner_price")}
                        onChange={(e) => handleChange(item.id, "base_partner_price", e.target.value)}
                        data-testid={`stock-price-${item.id}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        className="w-24 text-right border rounded-lg px-3 py-2 text-sm"
                        value={getValue(item, "partner_available_qty")}
                        onChange={(e) => handleChange(item.id, "partner_available_qty", e.target.value)}
                        data-testid={`stock-qty-${item.id}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className={`w-32 rounded-lg px-3 py-2 text-sm ${getStatusColor(getValue(item, "partner_status"))}`}
                        value={getValue(item, "partner_status")}
                        onChange={(e) => handleChange(item.id, "partner_status", e.target.value)}
                        data-testid={`stock-status-${item.id}`}
                      >
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        className="w-20 text-center border rounded-lg px-3 py-2 text-sm"
                        value={getValue(item, "lead_time_days")}
                        onChange={(e) => handleChange(item.id, "lead_time_days", e.target.value)}
                        data-testid={`stock-leadtime-${item.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
