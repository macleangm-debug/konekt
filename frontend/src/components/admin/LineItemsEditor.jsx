import React from "react";
import { Plus, Trash2, Package } from "lucide-react";

export default function LineItemsEditor({
  items,
  setItems,
  onFetchPricing,
  currency = "TZS",
}) {
  const updateLine = (index, key, value) => {
    const next = [...items];
    next[index][key] = value;

    const qty = Number(next[index].quantity || 0);
    const unit = Number(next[index].unit_price || 0);
    next[index].total = qty * unit;

    setItems(next);
  };

  const addLine = () => {
    setItems([
      ...items,
      {
        sku: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        total: 0,
      },
    ]);
  };

  const removeLine = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-2xl border bg-white p-5" data-testid="line-items-editor">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[#2D3E50]" />
          <h3 className="text-lg font-semibold">Line Items</h3>
        </div>
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
          data-testid="add-line-item-btn"
        >
          <Plus className="w-4 h-4" />
          Add Line
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-200 p-4 bg-slate-50" data-testid={`line-item-${index}`}>
            <div className="grid lg:grid-cols-[120px_1fr_100px_130px_130px_auto] gap-3 items-end">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">SKU</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
                  placeholder="SKU"
                  value={item.sku || ""}
                  onChange={(e) => updateLine(index, "sku", e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value && onFetchPricing) onFetchPricing(index, e.target.value);
                  }}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Description</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
                  placeholder="Product or service description"
                  value={item.description || ""}
                  onChange={(e) => updateLine(index, "description", e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Qty</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm text-center"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={item.quantity}
                  onChange={(e) => updateLine(index, "quantity", Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Unit Price</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm text-right"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={item.unit_price}
                  onChange={(e) => updateLine(index, "unit_price", Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Total</label>
                <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-100 text-sm text-right font-medium">
                  {currency} {Number(item.total || 0).toLocaleString()}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  disabled={items.length === 1}
                  className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  data-testid={`remove-line-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
