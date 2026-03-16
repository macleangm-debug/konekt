import React, { useEffect, useState } from "react";
import { FileText, Plus, Check, Clock, CheckCircle } from "lucide-react";
import api from "../../lib/api";

export default function PurchaseOrdersPage() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    warehouse_id: "",
    warehouse_name: "",
    delivery_address: "",
    payment_terms: "",
    notes: "",
    created_by: "",
    items_json: "[]",
  });

  const load = async () => {
    try {
      const [posRes, suppliersRes] = await Promise.all([
        api.get("/api/admin/procurement/purchase-orders"),
        api.get("/api/admin/suppliers"),
      ]);
      setItems(posRes.data || []);
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

  const save = async () => {
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

      if (!form.supplier_id) {
        alert("Please select a supplier");
        return;
      }

      await api.post("/api/admin/procurement/purchase-orders", {
        supplier_id: form.supplier_id,
        expected_delivery_date: form.expected_delivery_date,
        warehouse_id: form.warehouse_id,
        warehouse_name: form.warehouse_name,
        delivery_address: form.delivery_address,
        payment_terms: form.payment_terms,
        notes: form.notes,
        created_by: form.created_by,
        items: parsedItems,
      });
      setShowForm(false);
      setForm({
        supplier_id: "",
        expected_delivery_date: "",
        warehouse_id: "",
        warehouse_name: "",
        delivery_address: "",
        payment_terms: "",
        notes: "",
        created_by: "",
        items_json: "[]",
      });
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to create purchase order");
    }
  };

  const updateStatus = async (poId, status) => {
    try {
      await api.patch(`/api/admin/procurement/purchase-orders/${poId}/status`, { status });
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to update status");
    }
  };

  const approvePO = async (poId) => {
    try {
      await api.post(`/api/admin/procurement/purchase-orders/${poId}/approve`, {
        approved_by: "admin@konekt.co.tz",
      });
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to approve PO");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-slate-100 text-slate-700";
      case "ordered": return "bg-blue-100 text-blue-700";
      case "partially_received": return "bg-amber-100 text-amber-700";
      case "received": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="purchase-orders-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Purchase Orders</h1>
          <p className="mt-2 text-slate-600">Manage procurement from suppliers</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c] transition-colors"
          data-testid="create-po-btn"
        >
          <Plus className="w-5 h-5" />
          Create Purchase Order
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="po-form">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Create Purchase Order</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.supplier_id}
                onChange={(e) => {
                  const supplier = suppliers.find(s => s.id === e.target.value);
                  setForm({
                    ...form,
                    supplier_id: e.target.value,
                    payment_terms: supplier?.payment_terms || form.payment_terms,
                  });
                }}
                data-testid="po-supplier-select"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
              <input
                type="date"
                className="w-full border rounded-xl px-4 py-3"
                value={form.expected_delivery_date}
                onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse ID</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Destination warehouse ID"
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse Name</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Destination warehouse name"
                value={form.warehouse_name}
                onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="e.g., Net 30"
                value={form.payment_terms}
                onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Created By</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Your email"
                value={form.created_by}
                onChange={(e) => setForm({ ...form, created_by: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Delivery address"
              value={form.delivery_address}
              onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Items (JSON) *</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[120px] font-mono text-sm"
              placeholder='[{"sku":"SKU-001","quantity":100,"unit_cost":5000,"total_cost":500000}]'
              value={form.items_json}
              onChange={(e) => setForm({ ...form, items_json: e.target.value })}
              data-testid="po-items-textarea"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Additional notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
              data-testid="submit-po-btn"
            >
              <Check className="w-5 h-5" />
              Create Purchase Order
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
        <div className="text-center py-10 text-slate-500">No purchase orders yet</div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-6" data-testid={`po-${item.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{item.po_number}</div>
                    <div className="text-sm text-slate-500">{item.supplier_name || "Unknown supplier"}</div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status?.replace("_", " ")}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Total Cost</div>
                  <div className="font-bold text-lg">TZS {Number(item.total_cost || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500">Items</div>
                  <div className="font-medium">{item.items?.length || 0} items ({item.total_qty || 0} units)</div>
                </div>
                <div>
                  <div className="text-slate-500">Expected Delivery</div>
                  <div className="font-medium">
                    {item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString() : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Warehouse</div>
                  <div className="font-medium">{item.warehouse_name || "-"}</div>
                </div>
              </div>

              {/* Actions based on status */}
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                {item.status === "draft" && (
                  <>
                    <button
                      onClick={() => approvePO(item.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Order
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, "cancelled")}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {item.status === "ordered" && (
                  <button
                    onClick={() => updateStatus(item.id, "partially_received")}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200"
                  >
                    <Clock className="w-4 h-4" />
                    Mark Partial Receipt
                  </button>
                )}
                {(item.status === "ordered" || item.status === "partially_received") && (
                  <button
                    onClick={() => updateStatus(item.id, "received")}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Fully Received
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
