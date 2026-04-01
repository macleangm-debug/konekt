import React from "react";

/**
 * StandardSummaryCardsRow — Konekt standard stat/summary card row.
 *
 * Props:
 *  - cards: Array<{ label, value, icon: LucideIcon, accent, onClick?, active? }>
 *  - columns?: number (default auto-detects from card count, max 6)
 *
 * Accent colors: slate, emerald, red, blue, amber, violet, rose, teal
 */
const ACCENT_MAP = {
  slate:   { border: "border-slate-200",   iconBg: "bg-slate-100",   text: "text-slate-600" },
  emerald: { border: "border-emerald-200", iconBg: "bg-emerald-100", text: "text-emerald-700" },
  red:     { border: "border-red-200",     iconBg: "bg-red-100",     text: "text-red-700" },
  blue:    { border: "border-blue-200",    iconBg: "bg-blue-100",    text: "text-blue-700" },
  amber:   { border: "border-amber-200",   iconBg: "bg-amber-100",  text: "text-amber-700" },
  violet:  { border: "border-violet-200",  iconBg: "bg-violet-100", text: "text-violet-700" },
  rose:    { border: "border-rose-200",    iconBg: "bg-rose-100",   text: "text-rose-700" },
  teal:    { border: "border-teal-200",    iconBg: "bg-teal-100",   text: "text-teal-700" },
};

export default function StandardSummaryCardsRow({ cards = [], columns }) {
  const cols = columns || Math.min(cards.length, 6);
  const gridClass = cols <= 2 ? "grid-cols-2" :
    cols === 3 ? "grid-cols-2 sm:grid-cols-3" :
    cols === 4 ? "grid-cols-2 sm:grid-cols-4" :
    cols === 5 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" :
    "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";

  return (
    <div className={`grid gap-3 ${gridClass}`} data-testid="summary-cards-row">
      {cards.map((card) => {
        const c = ACCENT_MAP[card.accent] || ACCENT_MAP.slate;
        const Icon = card.icon;
        return (
          <button
            key={card.label}
            onClick={card.onClick}
            data-testid={`stat-card-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${c.border} ${card.active ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
          >
            {Icon && (
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.iconBg}`}>
                <Icon className={`h-5 w-5 ${c.text}`} />
              </div>
            )}
            <div>
              <div className="text-2xl font-extrabold text-[#20364D]">{card.value ?? 0}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{card.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
