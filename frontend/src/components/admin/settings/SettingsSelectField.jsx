import React from "react";
export default function SettingsSelectField({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <div className="text-sm text-slate-500 mb-2">{label}</div>
      <select className="w-full border rounded-xl px-4 py-3" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}
