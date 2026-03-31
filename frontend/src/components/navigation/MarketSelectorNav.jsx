import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MARKET_AVAILABILITY, FLAGS } from "../../config/marketAvailability";
import { ChevronDown, Check, Clock } from "lucide-react";

export default function MarketSelectorNav({ currentMarketCode = "TZ" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = useMemo(
    () => MARKET_AVAILABILITY.find((m) => m.code === currentMarketCode) || MARKET_AVAILABILITY[0],
    [currentMarketCode]
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const active = MARKET_AVAILABILITY.filter((m) => m.status === "active");
  const comingSoon = MARKET_AVAILABILITY.filter((m) => m.status === "coming_soon");

  return (
    <div className="relative" ref={ref} data-testid="market-selector-nav">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium hover:bg-slate-50 transition"
        data-testid="market-selector-btn"
      >
        <span className="text-base">{FLAGS[current.code] || ""}</span>
        <span className="hidden sm:inline">{current.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border bg-white shadow-xl" data-testid="market-dropdown">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-[#20364D]">Select market</h3>
          </div>

          <div className="p-3 space-y-3">
            {/* Active */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">Available</div>
              {active.map((market) => (
                <button
                  key={market.code}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 hover:bg-green-50 transition text-left"
                  onClick={() => { setOpen(false); navigate(market.route); }}
                  data-testid={`market-option-${market.code}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{FLAGS[market.code]}</span>
                    <span className="font-medium text-sm">{market.name}</span>
                  </span>
                  <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Shop
                  </span>
                </button>
              ))}
            </div>

            {/* Coming Soon */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">Coming Soon</div>
              {comingSoon.map((market) => (
                <button
                  key={market.code}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 hover:bg-amber-50 transition text-left"
                  onClick={() => { setOpen(false); navigate(market.route); }}
                  data-testid={`market-option-${market.code}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{FLAGS[market.code]}</span>
                    <span className="font-medium text-sm text-slate-600">{market.name}</span>
                  </span>
                  <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Waitlist
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
