import React from "react";

const DEFAULT_PREFIXES = ["+255", "+254", "+256", "+27", "+44", "+1"];

export default function PhoneNumberField({
  label = "Phone",
  prefix = "+255",
  number = "",
  onPrefixChange,
  onNumberChange,
  prefixes = DEFAULT_PREFIXES,
  required = false,
  testIdPrefix = "phone",
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      <div className="flex gap-2">
        <select
          value={prefix}
          onChange={(e) => onPrefixChange?.(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-3 bg-white min-w-[110px]"
          data-testid={`${testIdPrefix}-prefix`}
        >
          {prefixes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={number}
          onChange={(e) => onNumberChange?.(e.target.value.replace(/[^\d]/g, ""))}
          className="flex-1 border border-slate-300 rounded-xl px-4 py-3"
          placeholder="712 345 678"
          required={required}
          data-testid={`${testIdPrefix}-number`}
        />
      </div>
    </div>
  );
}
