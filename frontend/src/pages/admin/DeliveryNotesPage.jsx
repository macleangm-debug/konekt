import React, { useEffect, useState, useMemo } from "react";
import { Truck, Plus, Check, Package, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import api from "../../lib/api";
import StandardSummaryCardsRow from "@/components/lists/StandardSummaryCardsRow";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

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
      ) : (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left" data-testid="delivery-notes-table">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Document #</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Client</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Truck className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      <h3 className="text-base font-semibold text-slate-700">No data available yet</h3>
                      <p className="text-sm text-slate-500 mt-1">Data will appear once activity is recorded</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50" data-testid={`dn-row-${item.id}`}>
                      <td className="px-5 py-3.5 font-semibold text-sm text-[#20364D]">{item.note_number}</td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium">{item.customer_name || item.delivered_to || "—"}</div>
                        <div className="text-xs text-slate-500">{item.delivery_address ? item.delivery_address.substring(0, 40) : ""}</div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {item.line_items?.length || 0} item{(item.line_items?.length || 0) !== 1 ? "s" : ""}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${getStatusColor(item.status)}`}>
                          {(item.status || "issued").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`${API_URL}/api/pdf/delivery-notes/${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#20364D] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#2a4a66] transition-colors"
                          data-testid={`download-dn-pdf-${item.id}`}
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
