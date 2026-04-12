import React from "react";

/**
 * GeneratedStampBuilder — Stamp configuration component.
 * Company name, city, country, TIN, BRN are AUTO-PULLED from Business Profile.
 * User only configures: shape, color, phrase, and which fields to show.
 */
export default function GeneratedStampBuilder({ value, onChange, svgPreview, businessProfile }) {
  const v = value || {};
  const bp = businessProfile || {};
  const update = (key, val) => onChange?.({ ...v, [key]: val });

  const colorMap = { blue: "#1a365d", navy: "#1a365d", red: "#7f1d1d", black: "#0f172a" };
  const strokeColor = colorMap[v.stamp_color || "blue"] || "#1a365d";

  // Auto-derived values from Business Profile
  const companyName = bp.legal_name || bp.brand_name || v.stamp_text_primary || "Company";
  const cityCountry = [bp.business_address, bp.city, bp.country].filter(Boolean).join(", ") || v.stamp_text_secondary || "";
  const regNumber = bp.vat_number || v.stamp_registration_number || "";
  const taxNumber = bp.tax_id || v.stamp_tax_number || "";

  return (
    <div className="space-y-4" data-testid="generated-stamp-builder">
      {/* Configuration — shape, color, phrase */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Stamp Shape</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white" value={v.stamp_shape || "circle"}
            onChange={(e) => update("stamp_shape", e.target.value)} data-testid="stamp-shape-select">
            <option value="circle">Circle</option>
            <option value="square">Square</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Stamp Color</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white" value={v.stamp_color || "blue"}
            onChange={(e) => update("stamp_color", e.target.value)} data-testid="stamp-color-select">
            <option value="blue">Navy (Default)</option>
            <option value="black">Black</option>
            <option value="red">Dark Red</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Stamp Phrase</label>
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={v.stamp_phrase || ""}
            placeholder="Official Company Stamp" onChange={(e) => update("stamp_phrase", e.target.value)} data-testid="stamp-phrase-input" />
        </div>
      </div>

      {/* Auto-pulled fields (read-only display) */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-3">Auto-Pulled from Business Profile</div>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[11px] text-slate-400 block">Company Name</span>
            <span className="font-medium text-[#20364D]">{companyName || "—"}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Location</span>
            <span className="font-medium text-[#20364D]">{cityCountry || "—"}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Registration (BRN)</span>
            <span className="font-medium text-[#20364D]">{regNumber || "—"}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Tax Number (TIN)</span>
            <span className="font-medium text-[#20364D]">{taxNumber || "—"}</span>
          </div>
        </div>
        <p className="text-[10px] text-blue-500 mt-2">These values come from your Business Profile. Edit them in the Profile tab.</p>
      </div>

      {/* Field visibility toggles */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { key: "stamp_show_company", label: "Show Company Name", defaultVal: true },
          { key: "stamp_show_location", label: "Show Location", defaultVal: true },
          { key: "stamp_show_reg", label: "Show Registration", defaultVal: false },
          { key: "stamp_show_tin", label: "Show TIN", defaultVal: false },
        ].map((field) => (
          <label key={field.key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={v[field.key] !== undefined ? v[field.key] : field.defaultVal}
              onChange={(e) => update(field.key, e.target.checked)}
              className="rounded border-slate-300" data-testid={`toggle-${field.key}`} />
            <span className="text-sm text-slate-700">{field.label}</span>
          </label>
        ))}
      </div>

      {/* Stamp Preview */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Stamp Preview</div>
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-6" data-testid="stamp-svg-preview-area">
          {svgPreview ? (
            <div className="w-44 h-44 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svgPreview }} />
          ) : (
            <div className={`w-44 h-44 border-[3px] flex flex-col items-center justify-center p-3 text-center ${v.stamp_shape === "square" ? "rounded-lg" : "rounded-full"}`}
              style={{ borderColor: strokeColor, color: strokeColor }} data-testid="stamp-preview-circle">
              <div className="text-[10px] font-bold leading-tight">{(v.stamp_show_company !== false) ? companyName : ""}</div>
              {(v.stamp_show_location !== false) && <div className="mt-1 text-[8px]">{cityCountry}</div>}
              {v.stamp_show_reg && regNumber && <div className="mt-0.5 text-[7px]">{regNumber}</div>}
              {v.stamp_show_tin && taxNumber && <div className="mt-0.5 text-[7px]">TIN: {taxNumber}</div>}
              <div className="mt-1 text-[7px] italic">{v.stamp_phrase || "Official Company Stamp"}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
