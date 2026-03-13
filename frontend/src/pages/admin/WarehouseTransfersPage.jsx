import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function WarehouseTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    variant_id: "",
    from_warehouse: "",
    to_warehouse: "",
    quantity: 0,
  });

  const load = async () => {
    try {
      const [transfersRes, variantsRes, warehousesRes] = await Promise.all([
        api.get("/api/admin/warehouse-transfers"),
        api.get("/api/admin/inventory-variants?limit=500"),
        api.get("/api/admin/warehouses?limit=100"),
      ]);
      setTransfers(transfersRes.data || []);
      setVariants(variantsRes.data?.variants || variantsRes.data || []);
      setWarehouses(warehousesRes.data?.warehouses || warehousesRes.data || []);
    } catch (error) {
      console.error("Failed to load transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/warehouse-transfers", form);
      setForm({
        variant_id: "",
        from_warehouse: "",
        to_warehouse: "",
        quantity: 0,
      });
      load();
    } catch (error) {
      console.error("Failed to create transfer:", error);
      alert(error.response?.data?.detail || "Failed to create transfer");
    }
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
      <div className="max-w-none w-full grid xl:grid-cols-[420px_1fr] gap-8">
        <form onSubmit={save} className="rounded-3xl border bg-white p-6 space-y-4" data-testid="transfer-form">
          <h1 className="text-3xl font-bold">Warehouse Transfers</h1>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Variant</label>
            <select
              className="w-full border rounded-xl px-4 py-3"
              value={form.variant_id}
              onChange={(e) => setForm({ ...form, variant_id: e.target.value })}
              data-testid="variant-select"
            >
              <option value="">-- Select Variant --</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku} - {v.product_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Warehouse</label>
            <select
              className="w-full border rounded-xl px-4 py-3"
              value={form.from_warehouse}
              onChange={(e) => setForm({ ...form, from_warehouse: e.target.value })}
              data-testid="from-warehouse-select"
            >
              <option value="">-- Select Source --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Warehouse</label>
            <select
              className="w-full border rounded-xl px-4 py-3"
              value={form.to_warehouse}
              onChange={(e) => setForm({ ...form, to_warehouse: e.target.value })}
              data-testid="to-warehouse-select"
            >
              <option value="">-- Select Destination --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
            <input
              className="w-full border rounded-xl px-4 py-3"
              type="number"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              data-testid="quantity-input"
            />
          </div>

          <button 
            className="w-full rounded-xl bg-[#2D3E50] text-white py-3 font-semibold"
            data-testid="transfer-stock-btn"
          >
            Transfer Stock
          </button>
        </form>

        <div className="rounded-3xl border bg-white p-6" data-testid="transfer-history">
          <h2 className="text-2xl font-bold">Transfer History</h2>
          <div className="space-y-4 mt-5">
            {transfers.map((item) => (
              <div key={item.id} className="rounded-2xl border p-4" data-testid={`transfer-${item.id}`}>
                <div className="font-semibold">{item.sku}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {item.from_warehouse} &rarr; {item.to_warehouse}
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Quantity: {item.quantity}
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                </div>
              </div>
            ))}
            {!transfers.length && (
              <div className="text-sm text-slate-500">No transfers yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
