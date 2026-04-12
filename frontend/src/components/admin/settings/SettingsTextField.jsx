import React from "react";
export default function SettingsTextField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</div>
      <input type="text" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
