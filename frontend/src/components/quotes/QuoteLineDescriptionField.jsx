import React from "react";

/**
 * QuoteLineDescriptionField — Inline editable description for quote line items.
 * Auto-expands textarea. Saves on blur.
 *
 * Props:
 *  - value: string
 *  - onChange: (newValue: string) => void
 *  - placeholder?: string
 *  - readOnly?: boolean
 */
export default function QuoteLineDescriptionField({ value, onChange, placeholder = "Add line-item description or notes...", readOnly = false }) {
  if (readOnly) {
    return value ? (
      <p className="text-sm text-slate-600 whitespace-pre-wrap" data-testid="quote-line-description-readonly">{value}</p>
    ) : null;
  }

  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none resize-none focus:border-blue-400 transition-colors placeholder:text-slate-400"
      data-testid="quote-line-description-input"
      style={{ minHeight: "36px" }}
      onInput={(e) => {
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
      }}
    />
  );
}
