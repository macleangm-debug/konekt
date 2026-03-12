import React, { useEffect, useState } from "react";
import { Package, Plus, AlertTriangle, ArrowUpDown, Search } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [itemForm, setItemForm] = useState({
    product_slug: "",
    product_title: "",
    sku: "",
    category: "",
    branch: "",
    quantity_on_hand: 0,
    reorder_level: 5,
    unit_cost: 0,
    location: "",
  });

  const [movementForm, setMovementForm] = useState({
    sku: "",
    movement_type: "in",
    quantity: 0,
    note: "",
  });

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getInventoryItems({ low_stock: showLowStockOnly });
      setItems(res.data);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const res = await adminApi.getStockMovements({ limit: 20 });
      setMovements(res.data);
    } catch (error) {
      console.error("Failed to load movements", error);
    }
  };

  useEffect(() => {
    loadItems();
    loadMovements();
  }, [showLowStockOnly]);

  const saveItem = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createInventoryItem({
        ...itemForm,
        quantity_on_hand: Number(itemForm.quantity_on_hand),
        reorder_level: Number(itemForm.reorder_level),
        unit_cost: Number(itemForm.unit_cost),
      });
      setItemForm({
        product_slug: "",
        product_title: "",
        sku: "",
        category: "",
        branch: "",
        quantity_on_hand: 0,
        reorder_level: 5,
        unit_cost: 0,
        location: "",
      });
      setShowItemForm(false);
      loadItems();
    } catch (error) {
      console.error("Failed to create item", error);
      alert(error.response?.data?.detail || "Failed to create item");
    }
  };

  const saveMovement = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createStockMovement({
        ...movementForm,
        quantity: Number(movementForm.quantity),
      });
      setMovementForm({
        sku: "",
        movement_type: "in",
        quantity: 0,
        note: "",
      });
      setShowMovementForm(false);
      loadItems();
      loadMovements();
    } catch (error) {
      console.error("Failed to create movement", error);
      alert(error.response?.data?.detail || "Failed to create movement");
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.product_title?.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term)
    );
  });

  const lowStockCount = items.filter(i => i.quantity_on_hand <= i.reorder_level).length;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="inventory-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="w-8 h-8 text-[#D4A843]" />
              Inventory Management
            </h1>
            <p className="text-slate-600 mt-1">Track stock levels and movements</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowMovementForm(!showMovementForm)}
              className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-all"
              data-testid="stock-movement-btn"
            >
              <ArrowUpDown className="w-4 h-4" />
              Stock Movement
            </button>
            <button
              onClick={() => setShowItemForm(!showItemForm)}
              className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
              data-testid="add-inventory-btn"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 flex items-center gap-3" data-testid="low-stock-alert">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800">
              <strong>{lowStockCount}</strong> item(s) are below reorder level
            </span>
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className="ml-auto text-sm font-medium text-amber-700 hover:underline"
              data-testid="toggle-low-stock-btn"
            >
              {showLowStockOnly ? "Show all" : "Show low stock only"}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              data-testid="search-inventory-input"
            />
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          {/* Forms */}
          <div className="xl:col-span-1 space-y-6">
            {/* Add Item Form */}
            {showItemForm && (
              <form onSubmit={saveItem} className="rounded-2xl border bg-white p-6 space-y-4">
                <h2 className="text-xl font-bold">Add Inventory Item</h2>
                <input className="w-full border border-slate-300 rounded-xl px-4 py-3" placeholder="Product title *" value={itemForm.product_title} onChange={(e) => setItemForm({ ...itemForm, product_title: e.target.value })} required />
                <input className="w-full border border-slate-300 rounded-xl px-4 py-3" placeholder="SKU *" value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} required />
                <input className="w-full border border-slate-300 rounded-xl px-4 py-3" placeholder="Product slug" value={itemForm.product_slug} onChange={(e) => setItemForm({ ...itemForm, product_slug: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="Category" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} />
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="Branch" value={itemForm.branch} onChange={(e) => setItemForm({ ...itemForm, branch: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="border border-slate-300 rounded-xl px-4 py-3" type="number" placeholder="Quantity" value={itemForm.quantity_on_hand} onChange={(e) => setItemForm({ ...itemForm, quantity_on_hand: e.target.value })} />
                  <input className="border border-slate-300 rounded-xl px-4 py-3" type="number" placeholder="Reorder level" value={itemForm.reorder_level} onChange={(e) => setItemForm({ ...itemForm, reorder_level: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="border border-slate-300 rounded-xl px-4 py-3" type="number" placeholder="Unit cost" value={itemForm.unit_cost} onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })} />
                  <input className="border border-slate-300 rounded-xl px-4 py-3" placeholder="Location" value={itemForm.location} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} />
                </div>
                <button className="w-full rounded-xl bg-[#2D3E50] text-white py-3 font-semibold">Save Item</button>
              </form>
            )}

            {/* Stock Movement Form */}
            {showMovementForm && (
              <form onSubmit={saveMovement} className="rounded-2xl border bg-white p-6 space-y-4">
                <h2 className="text-xl font-bold">Stock Movement</h2>
                <input className="w-full border border-slate-300 rounded-xl px-4 py-3" placeholder="SKU *" value={movementForm.sku} onChange={(e) => setMovementForm({ ...movementForm, sku: e.target.value })} required />
                <select className="w-full border border-slate-300 rounded-xl px-4 py-3" value={movementForm.movement_type} onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                  <option value="adjustment">Adjustment</option>
                </select>
                <input className="w-full border border-slate-300 rounded-xl px-4 py-3" type="number" placeholder="Quantity *" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} required />
                <textarea className="w-full border border-slate-300 rounded-xl px-4 py-3" placeholder="Note" rows={3} value={movementForm.note} onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })} />
                <button className="w-full rounded-xl bg-[#D4A843] text-slate-900 py-3 font-semibold">Apply Movement</button>
              </form>
            )}

            {/* Recent Movements */}
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="font-semibold text-lg mb-4">Recent Movements</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {movements.slice(0, 10).map((mov, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm border-b pb-2">
                    <div>
                      <span className="font-medium">{mov.sku}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                        mov.movement_type === "in" ? "bg-green-100 text-green-700" :
                        mov.movement_type === "out" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {mov.movement_type}
                      </span>
                    </div>
                    <span className="font-semibold">{mov.quantity}</span>
                  </div>
                ))}
                {movements.length === 0 && (
                  <p className="text-slate-500 text-sm">No recent movements</p>
                )}
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="xl:col-span-2 rounded-2xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">SKU</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Product</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Category</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Qty</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Reorder</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading inventory...</td></tr>
                  ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No items found</td></tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isLow = item.quantity_on_hand <= item.reorder_level;
                      return (
                        <tr key={item.id} className={`hover:bg-slate-50 ${isLow ? "bg-amber-50" : ""}`}>
                          <td className="px-6 py-4 font-mono text-sm">{item.sku}</td>
                          <td className="px-6 py-4">
                            <p className="font-medium">{item.product_title}</p>
                            <p className="text-xs text-slate-500">{item.location}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{item.category}</td>
                          <td className={`px-6 py-4 text-right font-semibold ${isLow ? "text-red-600" : ""}`}>
                            {item.quantity_on_hand}
                            {isLow && <AlertTriangle className="w-4 h-4 inline ml-1" />}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">{item.reorder_level}</td>
                          <td className="px-6 py-4 text-right">TZS {(item.unit_cost || 0).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
