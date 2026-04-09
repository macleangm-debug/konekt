import React, { useState, useRef, useEffect } from "react";

const COUNTRIES = [
  { code: "TZ", flag: "🇹🇿", prefix: "+255", placeholder: "712345678" },
  { code: "KE", flag: "🇰🇪", prefix: "+254", placeholder: "712345678" },
  { code: "UG", flag: "🇺🇬", prefix: "+256", placeholder: "712345678" },
  { code: "RW", flag: "🇷🇼", prefix: "+250", placeholder: "712345678" },
  { code: "NG", flag: "🇳🇬", prefix: "+234", placeholder: "8012345678" },
  { code: "ZA", flag: "🇿🇦", prefix: "+27", placeholder: "712345678" },
  { code: "CD", flag: "🇨🇩", prefix: "+243", placeholder: "812345678" },
  { code: "ET", flag: "🇪🇹", prefix: "+251", placeholder: "912345678" },
  { code: "GH", flag: "🇬🇭", prefix: "+233", placeholder: "241234567" },
  { code: "MW", flag: "🇲🇼", prefix: "+265", placeholder: "991234567" },
];

function stripLeadingZero(val) {
  if (val && val.startsWith("0")) return val.slice(1);
  return val;
}

export default function CountryAwarePhoneField({
  prefix,
  onPrefixChange,
  phone,
  onPhoneChange,
  countryCode,
  label = "Phone Number",
  error,
  disabled = false,
}) {
  const selected = COUNTRIES.find(c => c.prefix === prefix) ||
    COUNTRIES.find(c => c.code === countryCode) ||
    COUNTRIES[0];

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    onPhoneChange(stripLeadingZero(raw));
  };

  const selectCountry = (c) => {
    onPrefixChange(c.prefix);
    setDropdownOpen(false);
  };

  return (
    <div data-testid="country-aware-phone">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="flex gap-0">
        {/* Country prefix selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-1.5 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium hover:bg-slate-100 transition h-[42px] ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${error ? "border-red-300" : ""}`}
            data-testid="phone-prefix-select"
          >
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="text-slate-500 font-semibold text-xs">{selected.code}</span>
            <span className="text-slate-700 font-medium">{selected.prefix}</span>
            <svg className="w-3 h-3 text-slate-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto" data-testid="phone-prefix-dropdown">
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 transition text-left ${c.prefix === selected.prefix ? "bg-blue-50 font-semibold" : ""}`}
                  data-testid={`phone-country-${c.code}`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="text-slate-500 font-semibold text-xs w-6">{c.code}</span>
                  <span className="text-slate-700">{c.prefix}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Number input */}
        <input
          type="tel"
          inputMode="numeric"
          value={phone || ""}
          onChange={handlePhoneChange}
          placeholder={selected.placeholder}
          disabled={disabled}
          className={`flex-1 rounded-r-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/30 focus:border-[#20364D] h-[42px] ${disabled ? "bg-slate-100 opacity-50" : ""} ${error ? "border-red-300 focus:ring-red-200" : ""}`}
          data-testid="phone-number-input"
        />
      </div>

      {/* Helper text */}
      {error ? (
        <p className="mt-1.5 text-xs text-red-500" data-testid="phone-error">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-400" data-testid="phone-helper">Enter number without the leading 0</p>
      )}
    </div>
  );
}
