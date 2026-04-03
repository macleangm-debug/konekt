import React from "react";

const PREFIXES = [
  { code: "TZ", prefix: "+255" },
  { code: "KE", prefix: "+254" },
  { code: "UG", prefix: "+256" },
  { code: "RW", prefix: "+250" },
  { code: "NG", prefix: "+234" },
  { code: "ZA", prefix: "+27" },
];

export default function CountryAwarePhoneField({ prefix, onPrefixChange, phone, onPhoneChange, countryCode }) {
  const selectedPrefix = prefix || PREFIXES.find((p) => p.code === countryCode)?.prefix || "+255";

  return (
    <div data-testid="country-aware-phone">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
      <div className="flex gap-2">
        <select
          value={selectedPrefix}
          onChange={(e) => onPrefixChange(e.target.value)}
          className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="phone-prefix-select"
        >
          {PREFIXES.map((p) => (
            <option key={p.code} value={p.prefix}>{p.prefix}</option>
          ))}
        </select>
        <input
          type="tel"
          value={phone || ""}
          onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, ""))}
          placeholder="7XX XXX XXX"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="phone-number-input"
        />
      </div>
    </div>
  );
}
