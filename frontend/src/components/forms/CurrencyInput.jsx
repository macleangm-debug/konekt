import React from "react";
import { normalizeMoneyInput, formatMoneyTZS } from "../../lib/formatters";

export default function CurrencyInput({
  label = "Budget Estimate",
  value,
  onChange,
  required = false,
  currencyLabel = "TZS",
  testId = "currency-input",
}) {
  const safeValue = value === null || value === undefined ? "" : String(value);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      <div className="flex border border-slate-300 rounded-xl overflow-hidden bg-white">
        <span className="bg-slate-50 px-4 py-3 text-slate-500 text-sm border-r border-slate-300 flex items-center">
          {currencyLabel}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={safeValue}
          onChange={(e) => onChange?.(normalizeMoneyInput(e.target.value))}
          className="flex-1 px-4 py-3 outline-none"
          placeholder="500,000"
          required={required}
          data-testid={testId}
        />
        {safeValue ? (
          <span className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap flex items-center">
            {formatMoneyTZS(safeValue)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
