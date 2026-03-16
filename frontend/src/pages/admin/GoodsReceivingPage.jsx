import React, { useEffect, useState } from "react";
import { FileInput, Plus, Check } from "lucide-react";
import api from "../../lib/api";

export default function GoodsReceivingPage() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    supplier_name: "",
    purchase_order_id: "",
    warehouse_id: "",
    warehouse_name: "",
    received_by: "",
    note: "",
    items_json: "[]",
  });

  const load = async () => {
    try {
      const [receiptsRes, suppliersRes] = await Promise.all([
        api.get("/api/admin/goods-receiving"),
        api.get("/api/admin/suppliers"),
      ]);
      setItems(receiptsRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const receive = async () => {
    try {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(form.items_json || "[]");
      } catch {
        alert("Invalid JSON for items");
        return;
      }

      if (parsedItems.length === 0) {
        alert("Please add at least one item");
        return;
      }

      await api.post("/api/admin/goods-receiving", {
        supplier_id: form.supplier_id || null,
        supplier_name: form.supplier_name,
        purchase_order_id: form.purchase_order_id || null,
        warehouse_id: form.warehouse_id,
        warehouse_name: form.warehouse_name,
        received_by: form.received_by,
        note: form.note,
        items: parsedItems,
      });
      setShowForm(false);
      setForm({
        supplier_id: "",
        supplier_name: "",
        purchase_order_id: "",
        warehouse_id: "",
        warehouse_name: "",
        received_by: "",
        note: "",
        items_json: "[]",
      });
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to create goods receipt");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "received": return "bg-blue-100 text-blue-700";
      case "inspected": return "bg-amber-100 text-amber-700";
      case "accepted": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="goods-receiving-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Goods Receiving</h1>
          <p className="mt-2 text-slate-600">Record incoming stock from suppliers</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c] transition-colors"
          data-testid="receive-stock-btn"
        >
          <Plus className="w-5 h-5" />
          Receive Stock
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="goods-receipt-form">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Receive Stock</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.supplier_id}
                onChange={(e) => {
                  const supplier = suppliers.find(s => s.id === e.target.value);
                  setForm({
                    ...form,
                    supplier_id: e.target.value,
                    supplier_name: supplier?.name || "",
                  });
                }}
                data-testid="supplier-select"
              >
                <option value="">Select supplier (optional)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Or Supplier Name</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Enter supplier name"
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Order ID</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Link to PO (optional)"
                value={form.purchase_order_id}
                onChange={(e) => setForm({ ...form, purchase_order_id: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Received By</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Staff email or name"
                value={form.received_by}
                onChange={(e) => setForm({ ...form, received_by: e.target.value })}
                data-testid="received-by-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse ID</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Warehouse ID"
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse Name</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Warehouse name"
                value={form.warehouse_name}
                onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Items (JSON)</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[120px] font-mono text-sm"
              placeholder='[{"sku":"SKU-001","quantity":20,"item_type":"product"}]'
              value={form.items_json}
              onChange={(e) => setForm({ ...form, items_json: e.target.value })}
              data-testid="items-json-textarea"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Additional notes"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={receive}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
              data-testid="submit-receipt-btn"
            >
              <Check className="w-5 h-5" />
              Record Receipt
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 rounded-xl border font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-slate-500">No goods receipts yet</div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-6" data-testid={`goods-receipt-${item.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                    <FileInput className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{item.receipt_number}</div>
                    <div className="text-sm text-slate-500">{item.supplier_name || "No supplier"}</div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Warehouse</div>
                  <div className="font-medium">{item.warehouse_name || "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Received By</div>
                  <div className="font-medium">{item.received_by || "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Items</div>
                  <div className="font-medium">{item.items?.length || 0} items</div>
                </div>
                <div>
                  <div className="text-slate-500">Date</div>
                  <div className="font-medium">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                  </div>
                </div>
              </div>

              {item.note && (
                <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                  {item.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
