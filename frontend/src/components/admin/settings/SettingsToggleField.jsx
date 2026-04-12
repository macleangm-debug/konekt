import React from "react";
export default function SettingsToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-slate-300" />
      <span className="text-sm text-[#20364D] font-medium">{label}</span>
    </label>
  );
}
