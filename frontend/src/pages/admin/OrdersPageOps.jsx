import React, { useEffect, useState } from "react";
import { Package, Search, ArrowRight, ClipboardList, Boxes, Factory, FileText } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const orderStatuses = [
  "pending",
  "confirmed",
  "awaiting_payment",
  "in_review",
  "approved",
  "in_production",
  "quality_check",
  "ready_for_dispatch",
  "in_transit",
  "delivered",
  "cancelled",
];

const statusColors = {
  pending: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  awaiting_payment: "bg-yellow-100 text-yellow-700",
  in_review: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  in_production: "bg-purple-100 text-purple-700",
  quality_check: "bg-indigo-100 text-indigo-700",
  ready_for_dispatch: "bg-teal-100 text-teal-700",
  in_transit: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function OrdersPageOps() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [statusNote, setStatusNote] = useState("");
  const [reserveForm, setReserveForm] = useState({ sku: "", quantity: 1 });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    department: "",
    due_date: "",
    priority: "medium",
  });
  const [productionForm, setProductionForm] = useState({
    production_type: "printing",
    assigned_to: "",
    priority: "medium",
    due_date: "",
    notes: "",
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getOrders(params);
      setOrders(res.data);
      if (selectedOrder) {
        const refreshed = res.data.find((o) => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch (error) {
      console.error("Failed to load orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  const changeStatus = async (orderId, status) => {
    try {
      await adminApi.updateOrderStatus(orderId, status, statusNote || null);
      setStatusNote("");
      loadOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(error.response?.data?.detail || "Failed to update status");
    }
  };

  const reserveInventory = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !reserveForm.sku) return;
    try {
      await adminApi.reserveInventory({
        order_id: selectedOrder.id,
        items: [{ sku: reserveForm.sku, quantity: Number(reserveForm.quantity) }],
      });
      setReserveForm({ sku: "", quantity: 1 });
      loadOrders();
      alert("Inventory reserved successfully!");
    } catch (error) {
      console.error("Failed to reserve:", error);
      alert(error.response?.data?.detail || "Failed to reserve inventory");
    }
  };

  const assignTask = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !taskForm.title) return;
    try {
      await adminApi.assignOrderTask({
        order_id: selectedOrder.id,
        title: taskForm.title,
        description: taskForm.description || null,
        assigned_to: taskForm.assigned_to || null,
        department: taskForm.department || null,
        due_date: taskForm.due_date || null,
        priority: taskForm.priority,
      });
      setTaskForm({
        title: "",
        description: "",
        assigned_to: "",
        department: "",
        due_date: "",
        priority: "medium",
      });
      alert("Task assigned successfully!");
    } catch (error) {
      console.error("Failed to assign task:", error);
      alert(error.response?.data?.detail || "Failed to assign task");
    }
  };

  const sendToProduction = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await adminApi.sendOrderToProduction({
        order_id: selectedOrder.id,
        order_number: selectedOrder.order_number || selectedOrder.id,
        customer_name: selectedOrder.customer_name || "Customer",
        production_type: productionForm.production_type,
        assigned_to: productionForm.assigned_to || null,
        priority: productionForm.priority,
        due_date: productionForm.due_date || null,
        notes: productionForm.notes || null,
        status: "queued",
      });
      setProductionForm({
        production_type: "printing",
        assigned_to: "",
        priority: "medium",
        due_date: "",
        notes: "",
      });
      loadOrders();
      alert("Order sent to production!");
    } catch (error) {
      console.error("Failed to send to production:", error);
      alert(error.response?.data?.detail || "Failed to send to production");
    }
  };

  const convertToInvoice = async (orderId) => {
    if (!window.confirm("Create invoice from this order?")) return;
    try {
      await adminApi.convertOrderToInvoice(orderId, null);
      alert("Invoice created from order!");
    } catch (error) {
      console.error("Failed to convert:", error);
      alert(error.response?.data?.detail || "Failed to create invoice");
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(term) ||
      order.customer_name?.toLowerCase().includes(term) ||
      order.customer_email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="orders-ops-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8 text-[#D4A843]" />
            Order Operations
          </h1>
          <p className="text-slate-600 mt-1">
            Manage orders, reserve inventory, assign tasks, and send to production
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              data-testid="search-orders-input"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            data-testid="filter-order-status"
          >
            <option value="">All Statuses</option>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        <div className="grid xl:grid-cols-[1fr_430px] gap-6">
          {/* Orders List */}
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold mb-4">Orders ({filteredOrders.length})</h2>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              {loading ? (
                <p className="text-slate-500 py-8 text-center">Loading orders...</p>
              ) : filteredOrders.length === 0 ? (
                <p className="text-slate-500 py-8 text-center">No orders found</p>
              ) : (
                filteredOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left rounded-xl border p-4 transition hover:shadow-md ${
                      selectedOrder?.id === order.id
                        ? "border-[#D4A843] bg-[#D4A843]/5 shadow-md"
                        : "bg-white hover:bg-slate-50"
                    }`}
                    data-testid={`order-card-${order.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {order.order_number || `Order ${order.id?.slice(-6)}`}
                        </div>
                        <div className="text-sm text-slate-600 mt-1 truncate">
                          {order.customer_name || "Unknown customer"}
                        </div>
                        <div className="text-sm font-medium text-green-600 mt-1">
                          {order.currency || "TZS"} {(order.total || 0).toLocaleString()}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                        statusColors[order.status || order.current_status] || "bg-slate-100"
                      }`}>
                        {(order.status || order.current_status || "pending").replace("_", " ")}
                      </span>
                    </div>
                    {order.inventory_reserved && (
                      <div className="mt-2 text-xs text-purple-600 flex items-center gap-1">
                        <Boxes className="w-3 h-3" /> Inventory Reserved
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Actions Panel */}
          <div className="space-y-4">
            {selectedOrder ? (
              <>
                {/* Order Info & Status */}
                <div className="rounded-2xl border bg-white p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#2D3E50]" />
                    Order Actions
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedOrder.order_number || selectedOrder.id}
                  </p>

                  <div className="mt-4 space-y-3">
                    <textarea
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                      placeholder="Status note (optional)"
                      rows={2}
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                    <select
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      value={selectedOrder.status || selectedOrder.current_status || "pending"}
                      onChange={(e) => changeStatus(selectedOrder.id, e.target.value)}
                      data-testid="order-status-select"
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>{status.replace("_", " ")}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => convertToInvoice(selectedOrder.id)}
                      className="w-full rounded-xl bg-[#D4A843] text-slate-900 py-3 font-semibold hover:bg-[#c49936] transition flex items-center justify-center gap-2"
                      data-testid="convert-to-invoice-btn"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Convert to Invoice
                    </button>
                  </div>
                </div>

                {/* Reserve Inventory */}
                <form onSubmit={reserveInventory} className="rounded-2xl border bg-white p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-[#2D3E50]" />
                    Reserve Inventory
                  </h3>
                  <div className="mt-4 space-y-3">
                    <input
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="SKU"
                      value={reserveForm.sku}
                      onChange={(e) => setReserveForm({ ...reserveForm, sku: e.target.value })}
                      data-testid="reserve-sku-input"
                    />
                    <input
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      type="number"
                      min="1"
                      placeholder="Quantity"
                      value={reserveForm.quantity}
                      onChange={(e) => setReserveForm({ ...reserveForm, quantity: e.target.value })}
                      data-testid="reserve-qty-input"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[#2D3E50] text-white py-3 font-semibold hover:bg-[#3d5166] transition"
                      data-testid="reserve-btn"
                    >
                      Reserve Stock
                    </button>
                  </div>
                </form>

                {/* Assign Task */}
                <form onSubmit={assignTask} className="rounded-2xl border bg-white p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#2D3E50]" />
                    Assign Task
                  </h3>
                  <div className="mt-4 space-y-3">
                    <input
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="Task title *"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      required
                    />
                    <textarea
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="Description"
                      rows={2}
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="border border-slate-300 rounded-xl px-4 py-3"
                        placeholder="Assigned to"
                        value={taskForm.assigned_to}
                        onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                      />
                      <input
                        className="border border-slate-300 rounded-xl px-4 py-3"
                        placeholder="Department"
                        value={taskForm.department}
                        onChange={(e) => setTaskForm({ ...taskForm, department: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="border border-slate-300 rounded-xl px-4 py-3"
                        type="datetime-local"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                      />
                      <select
                        className="border border-slate-300 rounded-xl px-4 py-3"
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[#2D3E50] text-white py-3 font-semibold hover:bg-[#3d5166] transition"
                    >
                      Assign Task
                    </button>
                  </div>
                </form>

                {/* Send to Production */}
                <form onSubmit={sendToProduction} className="rounded-2xl border bg-white p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Factory className="w-5 h-5 text-[#2D3E50]" />
                    Send to Production
                  </h3>
                  <div className="mt-4 space-y-3">
                    <input
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="Production type (e.g., printing, embroidery)"
                      value={productionForm.production_type}
                      onChange={(e) => setProductionForm({ ...productionForm, production_type: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="border border-slate-300 rounded-xl px-4 py-3"
                        placeholder="Assigned to"
                        value={productionForm.assigned_to}
                        onChange={(e) => setProductionForm({ ...productionForm, assigned_to: e.target.value })}
                      />
                      <select
                        className="border border-slate-300 rounded-xl px-4 py-3"
                        value={productionForm.priority}
                        onChange={(e) => setProductionForm({ ...productionForm, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <input
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      type="datetime-local"
                      value={productionForm.due_date}
                      onChange={(e) => setProductionForm({ ...productionForm, due_date: e.target.value })}
                    />
                    <textarea
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="Production notes"
                      rows={2}
                      value={productionForm.notes}
                      onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })}
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[#D4A843] text-slate-900 py-3 font-semibold hover:bg-[#c49936] transition"
                      data-testid="send-to-production-btn"
                    >
                      Move to Production Queue
                    </button>
                  </div>
                </form>

                {/* Status History */}
                {selectedOrder.status_history?.length > 0 && (
                  <div className="rounded-2xl border bg-white p-5">
                    <h3 className="text-lg font-bold">Status History</h3>
                    <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                      {[...selectedOrder.status_history].reverse().map((item, idx) => (
                        <div key={idx} className="rounded-xl bg-slate-50 border p-3">
                          <div className="font-medium text-sm">{item.status?.replace("_", " ")}</div>
                          {item.note && (
                            <div className="text-xs text-slate-600 mt-1">{item.note}</div>
                          )}
                          <div className="text-xs text-slate-400 mt-1">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
                Select an order to manage actions
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
