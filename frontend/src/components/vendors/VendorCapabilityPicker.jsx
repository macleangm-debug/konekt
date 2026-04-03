import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Check } from "lucide-react";

export default function VendorCapabilityPicker({ selected = [], onChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/taxonomy")
      .then((res) => {
        const data = res.data;
        const cats = Array.isArray(data) ? data : data.categories || data.items || [];
        setCategories(cats.filter((c) => c.parent_id == null || !c.parent_id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading categories...</div>;
  if (categories.length === 0) return <div className="text-sm text-slate-400">No taxonomy categories found.</div>;

  return (
    <div data-testid="vendor-capability-picker">
      <label className="block text-sm font-medium text-slate-700 mb-2">Capabilities / Categories</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const isSelected = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                isSelected
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              data-testid={`capability-${cat.id}`}
            >
              {isSelected && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
              <span className="truncate">{cat.name || cat.label}</span>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="mt-1.5 text-xs text-slate-400">{selected.length} selected</p>
      )}
    </div>
  );
}
