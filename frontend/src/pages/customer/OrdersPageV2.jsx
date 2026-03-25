import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, X, Truck, FileText, Clock } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import FilterBar from "../../components/ui/FilterBar";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

const STATUS_LABELS = {
  pending_payment_confirmation: "Awaiting Payment", processing: "Processing",
  ready_to_fulfill: "Ready to Fulfill", shipped: "Shipped",
  completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLORS = {
  pending_payment_confirmation: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  ready_to_fulfill: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function OrdersPageV2() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setOrders(r.data || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((order) => {
    const ref = `${order.order_number || ""} ${order.id || ""}`.toLowerCase();
    const state = order.current_status || order.status;
    return (!searchValue || ref.includes(searchValue.toLowerCase())) && (!statusFilter || state === statusFilter);
  });

  return (
    <div className="space-y-6" data-testid="orders-page">
      <PageHeader title="My Orders" subtitle="Track fulfillment after payment approval."
        actions={<BrandButton href="/marketplace" variant="primary">New Order</BrandButton>} />

      <FilterBar searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search orders..."
        filters={[{ name: "status", value: statusFilter, onChange: setStatusFilter, placeholder: "All Statuses",
          options: [{ value: "pending_payment_confirmation", label: "Awaiting Payment" }, { value: "processing", label: "Processing" }, { value: "ready_to_fulfill", label: "Ready to Fulfill" }, { value: "shipped", label: "Shipped" }, { value: "completed", label: "Completed" }],
        }]}
      />

      <div className="grid xl:grid-cols-[1fr_400px] gap-6">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" data-testid="orders-table">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Order</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold">Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Loading orders...</td></tr>
                ) : filtered.length ? filtered.map((order) => {
                  const state = order.current_status || order.status || "processing";
                  return (
                    <tr key={order.id || order._id} onClick={() => setSelected(order)}
                      className={`border-t hover:bg-slate-50 cursor-pointer ${selected?.id === (order.id || order._id) ? "bg-[#20364D]/5" : ""}`}
                      data-testid={`order-row-${order.id}`}>
                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{fmtDate(order.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#20364D]">{order.order_number || order.id?.slice(-8)}</div>
                        <div className="text-xs text-slate-500">{(order.items || []).length} item(s)</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 capitalize">{(order.type || "order").replace(/_/g, " ")}</td>
                      <td className="px-4 py-4 font-semibold text-[#20364D]">{money(order.total || order.total_amount)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${order.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {order.payment_status || "paid"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[state] || "bg-slate-100 text-slate-700"}`}>
                          {STATUS_LABELS[state] || state.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <div className="font-semibold text-[#20364D] mb-1">No orders yet</div>
                      <div>Paid orders will appear here automatically.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        {/* Detail Panel (Drawer) */}
        <SurfaceCard data-testid="order-detail-panel">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-[#20364D]">{selected.order_number || selected.id?.slice(-8)}</div>
                  <div className="text-sm text-slate-500">{fmtDate(selected.created_at)}</div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100" data-testid="close-order-detail">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Fulfillment Status</div>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selected.current_status || selected.status] || "bg-slate-100"}`}>
                    {STATUS_LABELS[selected.current_status || selected.status] || (selected.current_status || selected.status || "").replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <div className="text-slate-500">Payment</div>
                  <div className="font-semibold text-[#20364D] capitalize">{selected.payment_status || "paid"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Type</div>
                  <div className="font-semibold text-[#20364D] capitalize">{(selected.type || "order").replace(/_/g, " ")}</div>
                </div>
                <div>
                  <div className="text-slate-500">Total</div>
                  <div className="font-semibold text-[#20364D] text-lg">{money(selected.total || selected.total_amount)}</div>
                </div>
              </div>

              {/* Delivery info */}
              {(selected.delivery_address || selected.delivery_city) && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-1">
                    <Truck className="w-4 h-4" /> Delivery
                  </div>
                  <div className="text-sm text-slate-700">
                    {[selected.delivery_address, selected.delivery_city, selected.delivery_region].filter(Boolean).join(", ")}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <div className="text-sm font-semibold text-slate-500 mb-2">Items ({(selected.items || []).length})</div>
                <div className="space-y-2">
                  {(selected.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-3 py-2">
                      <span>{item.name || item.product_name || "Item"} x{item.quantity || 1}</span>
                      <span className="font-semibold">{money(item.line_total || item.unit_price || item.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order timeline */}
              {selected.events && selected.events.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-500 mb-2">Activity</div>
                  <div className="space-y-2">
                    {selected.events.slice(0, 5).map((ev, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <Clock className="w-3 h-3 text-slate-400 mt-0.5" />
                        <div>
                          <span className="text-slate-700">{(ev.event || "").replace(/_/g, " ")}</span>
                          <span className="text-slate-400 ml-2">{fmtDate(ev.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <div>Select an order to see details</div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
