import React from "react";
import { Package, Megaphone, Wrench, Layers } from "lucide-react";

const ROLES = [
  {
    key: "products",
    label: "Products",
    description: "Supplies physical products to the marketplace",
    icon: Package,
    marketplace: true,
  },
  {
    key: "promotional_materials",
    label: "Promotional Materials",
    description: "Supplies branded/promo items to the marketplace",
    icon: Megaphone,
    marketplace: true,
  },
  {
    key: "services",
    label: "Services",
    description: "Receives task assignments only (no marketplace upload)",
    icon: Wrench,
    marketplace: false,
  },
  {
    key: "multi",
    label: "Full Capability",
    description: "Products + promo + services (marketplace + tasks)",
    icon: Layers,
    marketplace: true,
  },
];

export default function VendorRoleSelector({ value, onChange }) {
  return (
    <div data-testid="vendor-role-selector">
      <label className="block text-sm font-medium text-slate-700 mb-2">Vendor Type</label>
      <div className="grid grid-cols-2 gap-3">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isSelected = value === role.key;
          return (
            <button
              key={role.key}
              type="button"
              onClick={() => onChange(role.key)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-200"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
              data-testid={`role-option-${role.key}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`h-4 w-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                <span className={`text-sm font-semibold ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                  {role.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{role.description}</p>
              <div className="mt-2">
                {role.marketplace ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Marketplace access
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    Task-only
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
