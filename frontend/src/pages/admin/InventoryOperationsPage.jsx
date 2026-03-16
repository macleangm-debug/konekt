import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Truck, FileInput, Factory, ShoppingCart, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import api from "../../lib/api";

export default function InventoryOperationsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/api/admin/inventory-ops-dashboard");
      setDashboard(res.data);
    } catch (error) {
      console.error("Failed to load inventory dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dashboard) {
    return <div className="p-10 text-slate-500">Failed to load inventory operations data.</div>;
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="inventory-operations-page">
      <div>
        <h1 className="text-4xl font-bold text-[#2D3E50]">Inventory Operations</h1>
        <p className="mt-2 text-slate-600">
          One workspace for stock receiving, dispatch, procurement, and alerts.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Low Stock"
          value={dashboard.low_stock_items}
          color={dashboard.low_stock_items > 0 ? "red" : "green"}
          href="/admin/inventory-ops-dashboard/low-stock"
        />
        <MetricCard
          icon={<Truck className="w-5 h-5" />}
          label="Delivery Notes"
          value={dashboard.pending_delivery_notes}
          href="/admin/delivery-notes"
        />
        <MetricCard
          icon={<FileInput className="w-5 h-5" />}
          label="Goods Receipts"
          value={dashboard.pending_goods_receipts}
          href="/admin/goods-receiving"
        />
        <MetricCard
          icon={<Factory className="w-5 h-5" />}
          label="Open POs"
          value={dashboard.open_purchase_orders}
          href="/admin/procurement/purchase-orders"
        />
        <MetricCard
          icon={<ShoppingCart className="w-5 h-5" />}
          label="Reserved Orders"
          value={dashboard.reserved_orders}
          href="/admin/orders"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <SmallMetric label="Total Products" value={dashboard.total_items} />
        <SmallMetric label="Raw Materials" value={dashboard.total_raw_materials} />
        <SmallMetric label="Suppliers" value={dashboard.total_suppliers} />
        <SmallMetric label="Movements Today" value={dashboard.movements_today} />
      </div>

      {/* Action Panels */}
      <div className="grid xl:grid-cols-2 gap-6">
        <ActionPanel
          title="Dispatch & Fulfillment"
          icon={<Truck className="w-6 h-6" />}
          items={[
            { label: "Create Delivery Note", href: "/admin/delivery-notes", description: "Dispatch stock for orders" },
            { label: "View Reserved Orders", href: "/admin/orders", description: "Orders with stock reserved" },
            { label: "Stock Ledger", href: "/admin/inventory", description: "View all inventory items" },
            { label: "Stock Movements", href: "/admin/inventory/movements", description: "Track all movements" },
          ]}
        />

        <ActionPanel
          title="Receiving & Procurement"
          icon={<Package className="w-6 h-6" />}
          items={[
            { label: "Receive Stock", href: "/admin/goods-receiving", description: "Record incoming goods" },
            { label: "Suppliers", href: "/admin/suppliers", description: "Manage supplier master" },
            { label: "Purchase Orders", href: "/admin/procurement/purchase-orders", description: "Create and manage POs" },
            { label: "Warehouse Transfers", href: "/admin/inventory/transfers", description: "Inter-warehouse movements" },
          ]}
        />
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color = "default", href }) {
  const colorMap = {
    red: "bg-red-50 text-red-600 border-red-200",
    green: "bg-green-50 text-green-600 border-green-200",
    default: "bg-white border-slate-200",
  };

  return (
    <Link
      to={href || "#"}
      className={`rounded-3xl border p-5 hover:shadow-md transition-shadow ${colorMap[color]}`}
      data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center gap-3 mb-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </Link>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function ActionPanel({ title, icon, items }) {
  return (
    <div className="rounded-3xl border bg-white p-6" data-testid={`action-panel-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-[#2D3E50] text-white flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-[#2D3E50]">{title}</h2>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-4 hover:bg-slate-100 transition-colors group"
            data-testid={`action-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div>
              <div className="font-semibold text-[#2D3E50]">{item.label}</div>
              <div className="text-sm text-slate-500">{item.description}</div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#D4A843] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
