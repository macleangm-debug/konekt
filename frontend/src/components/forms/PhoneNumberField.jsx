import React, { useState } from "react";
import AFRICAN_PHONE_PREFIXES from "../../config/africanPhonePrefixes";
import BottomSheetSelect from "../mobile/BottomSheetSelect";

export default function PhoneNumberField({
  label = "Phone",
  prefix = "+255",
  number = "",
  onPrefixChange,
  onNumberChange,
  required = false,
  testIdPrefix = "phone",
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const prefixOptions = AFRICAN_PHONE_PREFIXES.map((item) => ({
    value: item.prefix,
    label: item.label,
  }));

  const currentLabel =
    AFRICAN_PHONE_PREFIXES.find((p) => p.prefix === prefix)?.label || prefix;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required ? " *" : ""}
        </label>
      )}
      <div className="flex gap-2">
        {/* Desktop: native select */}
        <select
          value={prefix}
          onChange={(e) => onPrefixChange?.(e.target.value)}
          className="hidden md:block border border-slate-300 rounded-xl px-3 py-3 bg-white min-w-[120px] text-sm"
          data-testid={`${testIdPrefix}-prefix`}
        >
          {AFRICAN_PHONE_PREFIXES.map((item) => (
            <option key={item.code} value={item.prefix}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Mobile: bottom sheet trigger */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="md:hidden border border-slate-300 rounded-xl px-3 py-3 bg-white min-w-[120px] text-sm text-left"
          data-testid={`${testIdPrefix}-prefix-mobile`}
        >
          {currentLabel}
        </button>

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

      {/* Mobile bottom sheet for country prefix */}
      <BottomSheetSelect
        isOpen={sheetOpen}
        title="Select Country Code"
        options={prefixOptions}
        selectedValue={prefix}
        onSelect={(val) => onPrefixChange?.(val)}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
