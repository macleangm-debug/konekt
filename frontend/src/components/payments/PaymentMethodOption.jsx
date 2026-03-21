import React from "react";

/**
 * PaymentMethodOption - Reusable payment method display component
 * Shows active/disabled state with appropriate styling
 */
export default function PaymentMethodOption({
  label,
  description,
  active = false,
  disabled = false,
  selected = false,
  onClick,
  "data-testid": testId,
}) {
  const base = "w-full rounded-2xl border px-5 py-4 text-left transition";
  const activeCls = selected
    ? "border-[#20364D] bg-slate-50"
    : "bg-white";
  const disabledCls = disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-sm";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`${base} ${activeCls} ${disabledCls}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-[#20364D]">{label}</div>
          <div className="text-sm text-slate-500 mt-1">{description}</div>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
            active && !disabled
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {active && !disabled ? "Active" : "Not available"}
        </div>
      </div>
    </button>
  );
}
