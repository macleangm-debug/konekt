import React from "react";
import AFRICAN_PHONE_PREFIXES from "../../config/africanPhonePrefixes";

export default function PhoneNumberField({
  label = "Phone",
  prefix = "+255",
  number = "",
  onPrefixChange,
  onNumberChange,
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
          className="border border-slate-300 rounded-xl px-3 py-3 bg-white min-w-[120px] text-sm"
          data-testid={`${testIdPrefix}-prefix`}
        >
          {AFRICAN_PHONE_PREFIXES.map((item) => (
            <option key={item.code} value={item.prefix}>
              {item.label}
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
