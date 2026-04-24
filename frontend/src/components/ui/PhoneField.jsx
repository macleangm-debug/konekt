import React, { useState, useRef, useEffect } from "react";
import { COUNTRIES } from "../../constants/countries";
import { ChevronDown, X, Search } from "lucide-react";

/**
 * PhoneField — country-prefix input with a bottom-sheet selector on mobile
 * and a popover-style dropdown on desktop. Swap the raw <Input /> phone
 * placeholders across the app with this to get a uniform UX.
 *
 * Value model: the outer form owns both `prefix` and `phone` strings.
 * The component is dumb — it just calls `onPrefixChange` / `onPhoneChange`.
 */
const COUNTRY_FLAGS = {
  TZ: "🇹🇿", KE: "🇰🇪", UG: "🇺🇬", RW: "🇷🇼", BI: "🇧🇮", ZA: "🇿🇦",
  NG: "🇳🇬", GH: "🇬🇭", US: "🇺🇸", GB: "🇬🇧", AE: "🇦🇪",
};

export default function PhoneField({
  prefix = "+255",
  phone = "",
  onPrefixChange,
  onPhoneChange,
  placeholder = "7XX XXX XXX",
  required = false,
  label,
  testId = "phone-field",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popoverRef = useRef(null);

  const current = COUNTRIES.find((c) => c.dialCode === prefix) || COUNTRIES[0];

  // Close the desktop popover on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : COUNTRIES;

  const pick = (country) => {
    onPrefixChange?.(country.dialCode);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div
        className="flex items-stretch border border-slate-200 rounded-xl focus-within:border-[#20364D] focus-within:ring-2 focus-within:ring-[#20364D]/15 bg-white overflow-hidden"
        data-testid={testId}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2.5 border-r border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors text-sm font-medium text-slate-800"
          data-testid={`${testId}-prefix-trigger`}
          aria-label={`Country code: ${current.name}`}
        >
          <span className="text-base leading-none">{COUNTRY_FLAGS[current.code] || "🌐"}</span>
          <span className="font-semibold tabular-nums">{current.dialCode}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={phone}
          onChange={(e) => onPhoneChange?.(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder:text-slate-400"
          data-testid={`${testId}-input`}
        />
      </div>

      {/* Desktop popover */}
      {open && (
        <div
          ref={popoverRef}
          className="hidden md:block absolute z-50 top-full left-0 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code"
                className="flex-1 text-sm bg-transparent outline-none"
                autoFocus
                data-testid={`${testId}-search`}
              />
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" data-testid={`${testId}-list`}>
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                    c.dialCode === prefix ? "bg-slate-50 font-semibold" : ""
                  }`}
                  data-testid={`${testId}-option-${c.code}`}
                >
                  <span className="text-base">{COUNTRY_FLAGS[c.code] || "🌐"}</span>
                  <span className="flex-1 text-left text-slate-800">{c.name}</span>
                  <span className="text-slate-500 tabular-nums">{c.dialCode}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-400">
                No countries match "{search}"
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end" data-testid={`${testId}-bottomsheet`}>
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close country selector"
          />
          <div className="relative w-full max-h-[80vh] rounded-t-3xl bg-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0f172a]">Select country</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country"
                  className="flex-1 text-sm bg-transparent outline-none"
                  autoFocus
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto py-2">
              {filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm border-b border-slate-50 active:bg-slate-100 ${
                      c.dialCode === prefix ? "bg-amber-50/60 font-semibold" : ""
                    }`}
                  >
                    <span className="text-xl leading-none">{COUNTRY_FLAGS[c.code] || "🌐"}</span>
                    <span className="flex-1 text-left text-slate-800">{c.name}</span>
                    <span className="text-slate-500 tabular-nums">{c.dialCode}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-slate-400">
                  No countries match "{search}"
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
