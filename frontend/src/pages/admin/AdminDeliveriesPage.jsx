import React, { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import FilterBar from "../../components/admin/shared/FilterBar";
import EmptyState from "../../components/admin/shared/EmptyState";
import CustomerLinkCell from "@/components/customers/CustomerLinkCell";
import {
  Truck, MapPin, Phone, Package, Clock, CheckCircle, XCircle,
  Search, X, Calendar, User,
} from "lucide-react";

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

function StatCard({ label, value, icon: Icon, accent, onClick, active }) {
  const colors = {
    slate: { border: "border-slate-200", iconBg: "bg-slate-100", text: "text-slate-600" },
    amber: { border: "border-amber-200", iconBg: "bg-amber-100", text: "text-amber-700" },
    blue: { border: "border-blue-200", iconBg: "bg-blue-100", text: "text-blue-700" },
    violet: { border: "border-violet-200", iconBg: "bg-violet-100", text: "text-violet-700" },
    emerald: { border: "border-emerald-200", iconBg: "bg-emerald-100", text: "text-emerald-700" },
    red: { border: "border-red-200", iconBg: "bg-red-100", text: "text-red-700" },
  };
  const c = colors[accent] || colors.slate;
  return (
    <button
      onClick={onClick}
      data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, "-")}`}
      className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${c.border} ${active ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.iconBg}`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#20364D]">{value ?? 0}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </button>
  );
}

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/deliveries", { params: { status: filter !== "all" ? filter : undefined } });
      setDeliveries(res.data || []);
    } catch {
      setDeliveries([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  const updateStatus = async (deliveryId, newStatus) => {
    try {
      await api.patch(`/api/admin/deliveries/${deliveryId}/status`, { status: newStatus });
      toast.success("Delivery status updated");
      loadDeliveries();
      setSelectedDelivery(null);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter((d) => d.status === "pending").length,
    ready_for_pickup: deliveries.filter((d) => d.status === "ready_for_pickup").length,
    in_transit: deliveries.filter((d) => d.status === "in_transit").length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
  };

  const setFilterSafe = (f) => setFilter(prev => prev === f ? "all" : f);

  // Apply search
  const filteredDeliveries = deliveries.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.order_number || "").toLowerCase().includes(q) ||
      (d.customer_name || "").toLowerCase().includes(q) ||
      (d.delivery_address?.city || "").toLowerCase().includes(q) ||
      (d.delivery_address?.street || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4" data-testid="admin-deliveries-page">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={Truck} accent="slate" onClick={() => setFilter("all")} active={filter === "all"} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" onClick={() => setFilterSafe("pending")} active={filter === "pending"} />
        <StatCard label="Ready" value={stats.ready_for_pickup} icon={Package} accent="blue" onClick={() => setFilterSafe("ready_for_pickup")} active={filter === "ready_for_pickup"} />
        <StatCard label="In Transit" value={stats.in_transit} icon={Truck} accent="violet" onClick={() => setFilterSafe("in_transit")} active={filter === "in_transit"} />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle} accent="emerald" onClick={() => setFilterSafe("delivered")} active={filter === "delivered"} />
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#20364D]">Deliveries</h1>
            <p className="mt-0.5 text-sm text-slate-500">{filteredDeliveries.length} delivery record{filteredDeliveries.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <FilterBar>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="delivery-search"
              type="text"
              placeholder="Search by order#, customer, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
        </FilterBar>

        <div className="overflow-x-auto">
          <table className="w-full" data-testid="deliveries-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ref / Order #</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Destination</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Handler</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Target Date</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Loading deliveries...</td></tr>
              ) : filteredDeliveries.length === 0 ? (
                <tr><td colSpan={7} className="py-0"><EmptyState icon={Truck} title="No deliveries found" subtitle="Deliveries appear after orders are dispatched." /></td></tr>
              ) : (
                filteredDeliveries.map((d) => (
                  <tr
                    key={d.id}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${selectedDelivery?.id === d.id ? "bg-blue-50/50" : ""}`}
                    onClick={() => setSelectedDelivery(d)}
                    data-testid={`delivery-row-${d.id}`}
                  >
                    <td className="px-4 py-3.5 text-xs text-slate-500">{fmtDate(d.created_at)}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-[#20364D]">
                      {d.order_number || d.quote_number || `DEL-${(d.id || "").slice(0, 8).toUpperCase()}`}
                    </td>
                    <td className="px-4 py-3.5">
                      <CustomerLinkCell customerId={d.customer_id} customerName={d.customer_name} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 hidden md:table-cell max-w-[200px] truncate">
                      {d.delivery_address ? `${d.delivery_address.city || ""}, ${d.delivery_address.region || ""}`.replace(/^, |, $/, "") : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 hidden lg:table-cell">
                      {d.assigned_handler || d.assigned_sales_name || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 hidden lg:table-cell">
                      {fmtDate(d.internal_target_date || d.vendor_promised_date)}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={d.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="delivery-drawer-overlay">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setSelectedDelivery(null)} />
          <div className="relative flex w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <button
              onClick={() => setSelectedDelivery(null)}
              data-testid="close-delivery-drawer"
              className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-200 px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Delivery Details</p>
              <h2 className="mt-1 text-xl font-extrabold text-[#20364D]">
                {selectedDelivery.order_number || selectedDelivery.quote_number || `DEL-${(selectedDelivery.id || "").slice(0, 8).toUpperCase()}`}
              </h2>
              <div className="mt-2">
                <StatusBadge status={selectedDelivery.status} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Customer */}
              <section className="rounded-xl border border-slate-200 p-4 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</h3>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-[#20364D]">{selectedDelivery.customer_name || "N/A"}</span>
                </div>
                {selectedDelivery.customer_email && (
                  <div className="text-sm text-slate-600">{selectedDelivery.customer_email}</div>
                )}
              </section>

              {/* Address */}
              <section className="rounded-xl border border-slate-200 p-4 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Delivery Address</h3>
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
                  <div>
                    {selectedDelivery.delivery_address?.street && <div>{selectedDelivery.delivery_address.street}</div>}
                    <div>{selectedDelivery.delivery_address?.city}, {selectedDelivery.delivery_address?.region}</div>
                    {selectedDelivery.delivery_address?.country && <div>{selectedDelivery.delivery_address.country}</div>}
                    {selectedDelivery.delivery_address?.landmark && (
                      <div className="text-xs text-slate-400 mt-1">Landmark: {selectedDelivery.delivery_address.landmark}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {selectedDelivery.delivery_address?.contact_phone || selectedDelivery.customer_phone || "N/A"}
                </div>
              </section>

              {/* Timeline Info */}
              <section className="rounded-xl border border-slate-200 p-4 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Timeline</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Created</div>
                    <div className="font-medium text-[#20364D]">{fmtDate(selectedDelivery.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Target Date</div>
                    <div className="font-medium text-[#20364D]">{fmtDate(selectedDelivery.internal_target_date || selectedDelivery.vendor_promised_date)}</div>
                  </div>
                  {selectedDelivery.assigned_handler && (
                    <div>
                      <div className="text-xs text-slate-400">Handler</div>
                      <div className="font-medium text-[#20364D]">{selectedDelivery.assigned_handler}</div>
                    </div>
                  )}
                </div>
              </section>

              {/* Delivery Notes */}
              {selectedDelivery.delivery_notes && (
                <section className="rounded-xl border border-slate-200 p-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</h3>
                  <p className="mt-2 text-sm text-slate-700">{selectedDelivery.delivery_notes}</p>
                </section>
              )}

              {/* Status Actions */}
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDelivery.status === "pending" && (
                    <button
                      onClick={() => updateStatus(selectedDelivery.id, "ready_for_pickup")}
                      className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      data-testid="mark-ready-btn"
                    >
                      <Package className="h-4 w-4" /> Ready for Pickup
                    </button>
                  )}
                  {selectedDelivery.status === "ready_for_pickup" && (
                    <button
                      onClick={() => updateStatus(selectedDelivery.id, "in_transit")}
                      className="flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                      data-testid="mark-transit-btn"
                    >
                      <Truck className="h-4 w-4" /> In Transit
                    </button>
                  )}
                  {selectedDelivery.status === "in_transit" && (
                    <button
                      onClick={() => updateStatus(selectedDelivery.id, "delivered")}
                      className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      data-testid="mark-delivered-btn"
                    >
                      <CheckCircle className="h-4 w-4" /> Delivered
                    </button>
                  )}
                  {selectedDelivery.status !== "cancelled" && selectedDelivery.status !== "delivered" && (
                    <button
                      onClick={() => updateStatus(selectedDelivery.id, "cancelled")}
                      className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
                      data-testid="cancel-delivery-btn"
                    >
                      <XCircle className="h-4 w-4" /> Cancel
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
