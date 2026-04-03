import React from "react";

const COUNTRIES = [
  { code: "TZ", name: "Tanzania", prefix: "+255", currency: "TZS" },
  { code: "KE", name: "Kenya", prefix: "+254", currency: "KES" },
  { code: "UG", name: "Uganda", prefix: "+256", currency: "UGX" },
  { code: "RW", name: "Rwanda", prefix: "+250", currency: "RWF" },
  { code: "NG", name: "Nigeria", prefix: "+234", currency: "NGN" },
  { code: "ZA", name: "South Africa", prefix: "+27", currency: "ZAR" },
];

export default function CountrySelectorField({ value, onChange }) {
  return (
    <div data-testid="country-selector">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">Country / Market</label>
      <select
        value={value || "TZ"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        data-testid="country-select"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.prefix}) — {c.currency}
          </option>
        ))}
      </select>
    </div>
  );
}

export { COUNTRIES };
