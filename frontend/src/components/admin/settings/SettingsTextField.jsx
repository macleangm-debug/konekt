import React from "react";
export default function SettingsTextField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-sm text-slate-500 mb-2">{label}</div>
      <input type="text" className="w-full border rounded-xl px-4 py-3" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
