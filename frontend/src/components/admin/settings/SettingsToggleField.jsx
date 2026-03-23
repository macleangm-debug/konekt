import React from "react";
export default function SettingsToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border px-4 py-3">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-[#20364D] font-medium">{label}</span>
    </label>
  );
}
