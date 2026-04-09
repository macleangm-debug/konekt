import React, { useState, useRef, useEffect } from "react";
import { MobileBottomSheet } from "../shared/MobileBottomSheet";

const COUNTRIES = [
  { code: "TZ", flag: "\u{1F1F9}\u{1F1FF}", prefix: "+255", placeholder: "712345678" },
  { code: "KE", flag: "\u{1F1F0}\u{1F1EA}", prefix: "+254", placeholder: "712345678" },
  { code: "UG", flag: "\u{1F1FA}\u{1F1EC}", prefix: "+256", placeholder: "712345678" },
  { code: "RW", flag: "\u{1F1F7}\u{1F1FC}", prefix: "+250", placeholder: "712345678" },
  { code: "NG", flag: "\u{1F1F3}\u{1F1EC}", prefix: "+234", placeholder: "8012345678" },
  { code: "ZA", flag: "\u{1F1FF}\u{1F1E6}", prefix: "+27", placeholder: "712345678" },
  { code: "CD", flag: "\u{1F1E8}\u{1F1E9}", prefix: "+243", placeholder: "812345678" },
  { code: "ET", flag: "\u{1F1EA}\u{1F1F9}", prefix: "+251", placeholder: "912345678" },
  { code: "GH", flag: "\u{1F1EC}\u{1F1ED}", prefix: "+233", placeholder: "241234567" },
  { code: "MW", flag: "\u{1F1F2}\u{1F1FC}", prefix: "+265", placeholder: "991234567" },
];

function stripLeadingZero(val) {
  if (val && val.startsWith("0")) return val.slice(1);
  return val;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
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
  required = false,
  testIdPrefix = "phone",
}) {
  const selected = COUNTRIES.find(c => c.prefix === prefix) ||
    COUNTRIES.find(c => c.code === countryCode) ||
    COUNTRIES[0];

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isMobile = useIsMobile();

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
    setSheetOpen(false);
  };

  const handlePrefixClick = () => {
    if (disabled) return;
    if (isMobile) {
      setSheetOpen(true);
    } else {
      setDropdownOpen(!dropdownOpen);
    }
  };

  const sheetOptions = COUNTRIES.map(c => ({
    value: c.prefix,
    label: `${c.flag} ${c.code} ${c.prefix}`,
  }));

  return (
    <div data-testid={`${testIdPrefix}-country-aware-phone`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}{required ? " *" : ""}
        </label>
      )}
      <div className="flex gap-0">
        {/* Country prefix selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handlePrefixClick}
            className={`flex items-center gap-1.5 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium hover:bg-slate-100 transition h-[42px] ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${error ? "border-red-300" : ""}`}
            data-testid={`${testIdPrefix}-prefix-select`}
          >
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="text-slate-500 font-semibold text-xs">{selected.code}</span>
            <span className="text-slate-700 font-medium">{selected.prefix}</span>
            <svg className="w-3 h-3 text-slate-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* Desktop dropdown */}
          {!isMobile && dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto" data-testid={`${testIdPrefix}-prefix-dropdown`}>
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 transition text-left ${c.prefix === selected.prefix ? "bg-blue-50 font-semibold" : ""}`}
                  data-testid={`${testIdPrefix}-country-${c.code}`}
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
          required={required}
          className={`flex-1 rounded-r-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/30 focus:border-[#20364D] h-[42px] ${disabled ? "bg-slate-100 opacity-50" : ""} ${error ? "border-red-300 focus:ring-red-200" : ""}`}
          data-testid={`${testIdPrefix}-number-input`}
        />
      </div>

      {/* Helper / Error text */}
      {error ? (
        <p className="mt-1.5 text-xs text-red-500" data-testid={`${testIdPrefix}-phone-error`}>{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-400" data-testid={`${testIdPrefix}-phone-helper`}>Enter number without the leading 0</p>
      )}

      {/* Mobile: MobileBottomSheet for country selection */}
      <MobileBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Select Country Code"
      >
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => selectCountry(c)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${c.prefix === selected.prefix ? "bg-blue-50 font-semibold border border-blue-200" : "hover:bg-slate-50"}`}
              data-testid={`${testIdPrefix}-sheet-country-${c.code}`}
            >
              <span className="text-xl">{c.flag}</span>
              <span className="text-slate-500 font-semibold text-sm w-8">{c.code}</span>
              <span className="text-slate-700 font-medium">{c.prefix}</span>
            </button>
          ))}
        </div>
      </MobileBottomSheet>
    </div>
  );
}
