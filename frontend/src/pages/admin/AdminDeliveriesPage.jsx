import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Truck, MapPin, Phone, Package, Clock, CheckCircle, XCircle } from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  ready_for_pickup: "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS = {
  pending: "Pending",
  ready_for_pickup: "Ready for Pickup",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/deliveries", { params: { status: filter !== "all" ? filter : undefined } });
      setDeliveries(res.data || []);
    } catch (err) {
      console.error("Failed to load deliveries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, [filter]);

  const updateStatus = async (deliveryId, newStatus) => {
    try {
      await api.patch(`/api/admin/deliveries/${deliveryId}/status`, { status: newStatus });
      toast.success("Delivery status updated");
      loadDeliveries();
      setSelectedDelivery(null);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const stats = {
    pending: deliveries.filter((d) => d.status === "pending").length,
    ready_for_pickup: deliveries.filter((d) => d.status === "ready_for_pickup").length,
    in_transit: deliveries.filter((d) => d.status === "in_transit").length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
  };

  return (
    <div className="space-y-8" data-testid="admin-deliveries-page">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Deliveries</div>
        <div className="text-slate-600 mt-2">
          Track and manage all pending deliveries. This page will be used by your Courier Partner.
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
          <div className="text-sm text-yellow-700">Pending</div>
          <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <div className="text-sm text-blue-700">Ready for Pickup</div>
          <div className="text-2xl font-bold text-blue-800">{stats.ready_for_pickup}</div>
        </div>
        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
          <div className="text-sm text-purple-700">In Transit</div>
          <div className="text-2xl font-bold text-purple-800">{stats.in_transit}</div>
        </div>
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
          <div className="text-sm text-green-700">Delivered</div>
          <div className="text-2xl font-bold text-green-800">{stats.delivered}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "ready_for_pickup", "in_transit", "delivered"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === s ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            data-testid={`filter-${s}`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Deliveries List */}
      <div className="rounded-[2rem] border bg-white overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <div className="text-slate-500">No deliveries found</div>
          </div>
        ) : (
          <div className="divide-y">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="p-5 hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelectedDelivery(delivery)}
                data-testid={`delivery-${delivery.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-[#20364D]" />
                      <span className="font-semibold text-[#20364D]">
                        {delivery.order_number || delivery.quote_number || `DEL-${delivery.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[delivery.status]}`}>
                        {STATUS_LABELS[delivery.status]}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {delivery.delivery_address?.street}, {delivery.delivery_address?.city}, {delivery.delivery_address?.region}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{delivery.delivery_address?.contact_phone || delivery.customer_phone || "N/A"}</span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(delivery.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Detail Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="text-xl font-bold text-[#20364D]">Delivery Details</div>
              <button onClick={() => setSelectedDelivery(null)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm text-slate-500">Order/Quote</div>
                <div className="font-medium">{selectedDelivery.order_number || selectedDelivery.quote_number || `DEL-${selectedDelivery.id.slice(0, 8).toUpperCase()}`}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Customer</div>
                <div className="font-medium">{selectedDelivery.customer_name || "N/A"}</div>
                <div className="text-sm text-slate-600">{selectedDelivery.customer_email || ""}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Delivery Address</div>
                <div className="font-medium">
                  {selectedDelivery.delivery_address?.street}<br />
                  {selectedDelivery.delivery_address?.city}, {selectedDelivery.delivery_address?.region}<br />
                  {selectedDelivery.delivery_address?.country}
                </div>
                {selectedDelivery.delivery_address?.landmark && (
                  <div className="text-sm text-slate-600 mt-1">Landmark: {selectedDelivery.delivery_address?.landmark}</div>
                )}
              </div>

              <div>
                <div className="text-sm text-slate-500">Contact Phone</div>
                <div className="font-medium">{selectedDelivery.delivery_address?.contact_phone || selectedDelivery.customer_phone}</div>
              </div>

              {selectedDelivery.delivery_notes && (
                <div>
                  <div className="text-sm text-slate-500">Delivery Notes</div>
                  <div className="text-slate-700">{selectedDelivery.delivery_notes}</div>
                </div>
              )}

              <div>
                <div className="text-sm text-slate-500 mb-2">Current Status</div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[selectedDelivery.status]}`}>
                  {STATUS_LABELS[selectedDelivery.status]}
                </span>
              </div>

              {/* Status Actions */}
              <div className="pt-4 border-t">
                <div className="text-sm text-slate-500 mb-3">Update Status</div>
                <div className="flex flex-wrap gap-2">
                  {selectedDelivery.status === "pending" && (
                    <button
                      onClick={() => updateStatus(selectedDelivery.id, "ready_for_pickup")}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-xl hover:bg-blue-200"
                      data-testid="mark-ready-btn"
                    >
                      <Package className="w-4 h-4" /> Mark Ready for Pickup
                    </button>
                  )}
                  {selectedDelivery.status === "ready_for_pickup" && (
                    <button
                      onClick={() => updateStatus(selectedDelivery.id, "in_transit")}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-xl hover:bg-purple-200"
                      data-testid="mark-transit-btn"
                    >
                      <Truck className="w-4 h-4" /> Mark In Transit
                    </button>
                  )}
                  {selectedDelivery.status === "in_transit" && (
                    <button
                      onClick={() => updateStatus(selectedDelivery.id, "delivered")}
                      className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-xl hover:bg-green-200"
                      data-testid="mark-delivered-btn"
                    >
                      <CheckCircle className="w-4 h-4" /> Mark Delivered
                    </button>
                  )}
                  {selectedDelivery.status !== "cancelled" && selectedDelivery.status !== "delivered" && (
                    <button
                      onClick={() => updateStatus(selectedDelivery.id, "cancelled")}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-xl hover:bg-red-200"
                      data-testid="cancel-delivery-btn"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
