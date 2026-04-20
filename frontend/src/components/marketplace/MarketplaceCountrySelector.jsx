import React, { useState, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import api from "@/lib/api";

const COUNTRIES = [
  { code: "TZ", name: "Tanzania", flag: "\u{1F1F9}\u{1F1FF}", currency: "TZS", live: true },
  { code: "KE", name: "Kenya", flag: "\u{1F1F0}\u{1F1EA}", currency: "KES", live: false },
  { code: "UG", name: "Uganda", flag: "\u{1F1FA}\u{1F1EC}", currency: "UGX", live: false },
];

export default function MarketplaceCountrySelector({ activeCountry, onCountryChange }) {
  const [open, setOpen] = useState(false);
  const active = COUNTRIES.find(c => c.code === activeCountry) || COUNTRIES[0];

  return (
    <div className="relative" data-testid="marketplace-country-selector">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-[#D4A843]/50 hover:bg-[#D4A843]/5 transition"
      >
        <span className="text-lg">{active.flag}</span>
        <span>{active.name}</span>
        <span className="text-[10px] text-slate-400">({active.currency})</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-lg py-1.5 min-w-[200px] z-50" data-testid="country-dropdown">
            {COUNTRIES.map(c => (
              <button
                key={c.code}
                onClick={() => { onCountryChange(c.code); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-slate-50 transition ${c.code === activeCountry ? "bg-slate-50 font-semibold" : ""}`}
                data-testid={`country-option-${c.code}`}
              >
                <span className="text-lg">{c.flag}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{c.name}</span>
                    {!c.live && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Coming Soon</span>}
                  </div>
                  <div className="text-[10px] text-slate-400">{c.currency}</div>
                </div>
                {c.code === activeCountry && <span className="text-emerald-500 text-xs font-bold">Active</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
