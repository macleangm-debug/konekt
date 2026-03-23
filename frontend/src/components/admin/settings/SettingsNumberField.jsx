import React from "react";
export default function SettingsNumberField({ label, value, onChange, step = "any" }) {
  return (
    <label className="block">
      <div className="text-sm text-slate-500 mb-2">{label}</div>
      <input type="number" step={step} className="w-full border rounded-xl px-4 py-3" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
