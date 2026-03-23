import React from "react";

export default function PartnerSpecificServicesField({ value = "", onChange }) {
  return (
    <label className="block" data-testid="specific-services-field">
      <div className="text-sm text-slate-500 mb-2">Specific Services</div>
      <textarea
        className="w-full min-h-[120px] border rounded-xl px-4 py-3"
        placeholder="Example: Garment Printing, T-Shirt Printing, Hoodie Printing"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="specific-services-textarea"
      />
      <div className="text-xs text-slate-500 mt-2">Use comma-separated values.</div>
    </label>
  );
}
