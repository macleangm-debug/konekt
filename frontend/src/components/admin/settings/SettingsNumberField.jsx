import React from "react";
export default function SettingsNumberField({ label, value, onChange, step = "any", suffix, prefix }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
        <input
          type="number"
          step={step}
          className={`w-full border border-slate-200 rounded-xl py-2.5 text-sm ${prefix ? "pl-12 pr-3" : suffix ? "pl-3 pr-12" : "px-3"}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}
