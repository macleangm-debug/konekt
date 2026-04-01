import React, { useEffect, useState, useMemo } from "react";
import { Truck, Plus, Check, Package, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "../../lib/api";
import StandardSummaryCardsRow from "@/components/lists/StandardSummaryCardsRow";

export default function DeliveryNotesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    source_type: "order",
    source_id: "",
    delivered_by: "",
    delivered_to: "",
    delivery_address: "",
    vehicle_info: "",
    remarks: "",
    line_items_json: "[]",
  });

  const load = async () => {
    try {
      const res = await api.get("/api/admin/delivery-notes");
      setItems(res.data || []);
    } catch (error) {
      console.error("Failed to load delivery notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createNote = async () => {
    try {
      let lineItems = [];
      try {
        lineItems = JSON.parse(form.line_items_json || "[]");
      } catch {
        alert("Invalid JSON for line items");
        return;
      }

      await api.post("/api/admin/delivery-notes", {
        source_type: form.source_type,
        source_id: form.source_id || null,
        delivered_by: form.delivered_by,
        delivered_to: form.delivered_to,
        delivery_address: form.delivery_address,
        vehicle_info: form.vehicle_info,
        remarks: form.remarks,
        line_items: lineItems,
      });
      setShowForm(false);
      setForm({
        source_type: "order",
        source_id: "",
        delivered_by: "",
        delivered_to: "",
        delivery_address: "",
        vehicle_info: "",
        remarks: "",
        line_items_json: "[]",
      });
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to create delivery note");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "issued": return "bg-blue-100 text-blue-700";
      case "in_transit": return "bg-amber-100 text-amber-700";
      case "delivered": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const deliveryStats = useMemo(() => {
    const total = items.length;
    const issued = items.filter(i => i.status === "issued").length;
    const inTransit = items.filter(i => i.status === "in_transit").length;
    const delivered = items.filter(i => i.status === "delivered").length;
    const cancelled = items.filter(i => i.status === "cancelled").length;
    return { total, issued, inTransit, delivered, cancelled };
  }, [items]);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="delivery-notes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Delivery Notes</h1>
          <p className="mt-0.5 text-sm text-slate-500">Dispatch stock for orders and invoices</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c] transition-colors"
          data-testid="create-delivery-note-btn"
        >
          <Plus className="w-5 h-5" />
          Create Delivery Note
        </button>
      </div>

      {/* Stat Cards */}
      <StandardSummaryCardsRow
        columns={5}
        cards={[
          { label: "Total", value: deliveryStats.total, icon: Truck, accent: "slate" },
          { label: "Issued", value: deliveryStats.issued, icon: Package, accent: "blue" },
          { label: "In Transit", value: deliveryStats.inTransit, icon: Clock, accent: "amber" },
          { label: "Delivered", value: deliveryStats.delivered, icon: CheckCircle, accent: "emerald" },
          { label: "Cancelled", value: deliveryStats.cancelled, icon: XCircle, accent: "red" },
        ]}
      />

      {showForm && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="delivery-note-form">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Create Delivery Note</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Type</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.source_type}
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                data-testid="source-type-select"
              >
                <option value="order">Order</option>
                <option value="invoice">Invoice</option>
                <option value="direct">Direct (No Source)</option>
              </select>
            </div>

            {form.source_type !== "direct" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source ID</label>
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Order or Invoice ID"
                  value={form.source_id}
                  onChange={(e) => setForm({ ...form, source_id: e.target.value })}
                  data-testid="source-id-input"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivered By</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Staff email or name"
                value={form.delivered_by}
                onChange={(e) => setForm({ ...form, delivered_by: e.target.value })}
                data-testid="delivered-by-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivered To</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Recipient name"
                value={form.delivered_to}
                onChange={(e) => setForm({ ...form, delivered_to: e.target.value })}
                data-testid="delivered-to-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Delivery address"
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Info</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Vehicle number / driver"
                value={form.vehicle_info}
                onChange={(e) => setForm({ ...form, vehicle_info: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Line Items (JSON) - Leave empty to use source document items
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] font-mono text-sm"
              placeholder='[{"sku":"SKU-001","quantity":2,"item_type":"product"}]'
              value={form.line_items_json}
              onChange={(e) => setForm({ ...form, line_items_json: e.target.value })}
              data-testid="line-items-textarea"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Additional notes"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={createNote}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
              data-testid="submit-delivery-note-btn"
            >
              <Check className="w-5 h-5" />
              Create Delivery Note
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
        <div className="text-center py-10 text-slate-500">No delivery notes yet</div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-6" data-testid={`delivery-note-${item.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{item.note_number}</div>
                    <div className="text-sm text-slate-500">{item.source_type?.toUpperCase()}</div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Customer</div>
                  <div className="font-medium">{item.customer_name || "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Delivered To</div>
                  <div className="font-medium">{item.delivered_to || "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Delivered By</div>
                  <div className="font-medium">{item.delivered_by || "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Items</div>
                  <div className="font-medium">{item.line_items?.length || 0} items</div>
                </div>
              </div>

              {item.remarks && (
                <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                  {item.remarks}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
