import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import ALL_COUNTRIES from "@/data/countries";

function stripLeadingZero(val) {
  if (val && val.startsWith("0")) return val.slice(1);
  return val;
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const c = () => setM(window.innerWidth < 768);
    c();
    window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);
  return m;
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
  const selected = ALL_COUNTRIES.find(c => c.dial === prefix) ||
    ALL_COUNTRIES.find(c => c.iso2 === countryCode) ||
    ALL_COUNTRIES[0];

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (sheetOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  useEffect(() => {
    if (dropdownOpen && searchRef.current) searchRef.current.focus();
  }, [dropdownOpen]);

  const filtered = useMemo(() => {
    if (!search) return ALL_COUNTRIES;
    const s = search.toLowerCase();
    return ALL_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.dial.includes(s) ||
      c.iso2.toLowerCase().includes(s)
    );
  }, [search]);

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    onPhoneChange(stripLeadingZero(raw));
  };

  const selectCountry = (c) => {
    onPrefixChange(c.dial);
    setDropdownOpen(false);
    setSheetOpen(false);
    setSearch("");
    setHighlightIdx(-1);
  };

  const handlePrefixClick = () => {
    if (disabled) return;
    setSearch("");
    setHighlightIdx(-1);
    if (isMobile) setSheetOpen(true);
    else setDropdownOpen(!dropdownOpen);
  };

  const handleKeyDown = (e) => {
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0 && highlightIdx < filtered.length) {
      e.preventDefault();
      selectCountry(filtered[highlightIdx]);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  return (
    <div data-testid={`${testIdPrefix}-country-aware-phone`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label}{required ? " *" : ""}
        </label>
      )}
      <div className="flex gap-0">
        {/* Country prefix selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handlePrefixClick}
            className={`flex items-center gap-1.5 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium hover:bg-slate-100 transition h-9 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${error ? "border-red-300" : ""}`}
            data-testid={`${testIdPrefix}-prefix-select`}
          >
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="text-slate-700 font-medium text-xs">{selected.dial}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Desktop dropdown with search */}
          {!isMobile && dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 flex flex-col max-h-72" onKeyDown={handleKeyDown} data-testid={`${testIdPrefix}-prefix-dropdown`}>
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setHighlightIdx(0); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search country..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#20364D]/30"
                    data-testid={`${testIdPrefix}-country-search`}
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-400 text-center">No matches</div>
                ) : filtered.map((c, i) => (
                  <button
                    key={c.iso2}
                    type="button"
                    onClick={() => selectCountry(c)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition text-left ${c.dial === selected.dial && c.iso2 === selected.iso2 ? "bg-blue-50 font-semibold" : ""} ${i === highlightIdx ? "bg-slate-100" : ""}`}
                    data-testid={`${testIdPrefix}-country-${c.iso2}`}
                  >
                    <span className="text-sm">{c.flag}</span>
                    <span className="text-slate-700 flex-1 truncate">{c.name}</span>
                    <span className="text-slate-400 font-mono">{c.dial}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Number input */}
        <input
          type="tel"
          inputMode="numeric"
          value={phone || ""}
          onChange={handlePhoneChange}
          placeholder={selected.ph}
          disabled={disabled}
          required={required}
          className={`flex-1 rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/30 focus:border-[#20364D] h-9 ${disabled ? "bg-slate-100 opacity-50" : ""} ${error ? "border-red-300 focus:ring-red-200" : ""}`}
          data-testid={`${testIdPrefix}-number-input`}
        />
      </div>

      {error ? (
        <p className="mt-1 text-[10px] text-red-500" data-testid={`${testIdPrefix}-phone-error`}>{error}</p>
      ) : (
        <p className="mt-1 text-[10px] text-slate-400">Enter number without leading 0</p>
      )}

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[61]" data-testid={`${testIdPrefix}-mobile-sheet`}>
            <div className="bg-white rounded-t-2xl shadow-xl max-h-[75vh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <h3 className="text-base font-semibold text-[#20364D]">Select Country</h3>
                <button type="button" onClick={() => setSheetOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {/* Sticky search */}
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#20364D]/30"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 py-1">
                {filtered.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-400 text-center">No matches</div>
                ) : filtered.map(c => (
                  <button
                    key={c.iso2}
                    type="button"
                    onClick={() => selectCountry(c)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition ${c.dial === selected.dial && c.iso2 === selected.iso2 ? "bg-blue-50 font-semibold" : "hover:bg-slate-50"}`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="text-slate-700 flex-1">{c.name}</span>
                    <span className="text-slate-400 font-mono text-sm">{c.dial}</span>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100">
                <button type="button" onClick={() => setSheetOpen(false)} className="w-full py-3 rounded-xl bg-[#20364D] text-white font-semibold text-sm">Done</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
