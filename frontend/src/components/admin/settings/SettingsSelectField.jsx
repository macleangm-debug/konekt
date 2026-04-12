import React from "react";
export default function SettingsSelectField({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</div>
      <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}
