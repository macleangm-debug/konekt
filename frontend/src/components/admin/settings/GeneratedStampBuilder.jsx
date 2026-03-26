import React from "react";

export default function GeneratedStampBuilder({ value, onChange }) {
  const v = value || {};
  const update = (key, val) => onChange?.({ ...v, [key]: val });

  const colorMap = { blue: "#1a4b8c", red: "#b91c1c", black: "#1e293b" };
  const strokeColor = colorMap[v.stamp_color || "blue"] || "#1a4b8c";

  return (
    <div className="space-y-4" data-testid="generated-stamp-builder">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Stamp Shape</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            value={v.stamp_shape || "circle"}
            onChange={(e) => update("stamp_shape", e.target.value)}
            data-testid="stamp-shape-select"
          >
            <option value="circle">Circle</option>
            <option value="square">Square</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Stamp Color</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            value={v.stamp_color || "blue"}
            onChange={(e) => update("stamp_color", e.target.value)}
            data-testid="stamp-color-select"
          >
            <option value="blue">Blue</option>
            <option value="red">Red</option>
            <option value="black">Black</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Stamp Phrase</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={v.stamp_phrase || ""}
            placeholder="Official Company Stamp"
            onChange={(e) => update("stamp_phrase", e.target.value)}
            data-testid="stamp-phrase-input"
          />
        </div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Company Legal Name<span className="text-red-500">*</span></label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={v.stamp_text_primary || ""}
            onChange={(e) => update("stamp_text_primary", e.target.value)}
            data-testid="stamp-primary-input"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">City / Country</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={v.stamp_text_secondary || ""}
            onChange={(e) => update("stamp_text_secondary", e.target.value)}
            data-testid="stamp-secondary-input"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Registration Number</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={v.stamp_registration_number || ""}
            onChange={(e) => update("stamp_registration_number", e.target.value)}
            data-testid="stamp-reg-input"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">TIN / Tax Number</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={v.stamp_tax_number || ""}
            onChange={(e) => update("stamp_tax_number", e.target.value)}
            data-testid="stamp-tin-input"
          />
        </div>
      </div>

      {/* CSS Preview */}
      <div>
        <div className="text-xs text-slate-500 mb-2 font-medium">Quick Preview</div>
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 p-6">
          {(v.stamp_shape || "circle") === "square" ? (
            <div
              className="flex h-36 w-36 flex-col items-center justify-center border-[3px] p-3 text-center"
              style={{ borderColor: strokeColor, color: strokeColor }}
              data-testid="stamp-preview-square"
            >
              <div className="text-[11px] font-bold leading-tight">{v.stamp_text_primary || "Konekt Limited"}</div>
              <div className="mt-1.5 text-[9px]">{v.stamp_registration_number || "REG-123456"}</div>
              <div className="text-[9px]">{v.stamp_tax_number || "TIN 123-456-789"}</div>
              <div className="mt-1.5 text-[9px]">{v.stamp_text_secondary || "Dar es Salaam, Tanzania"}</div>
              <div className="mt-1.5 text-[8px] font-semibold">{v.stamp_phrase || "Official Company Stamp"}</div>
            </div>
          ) : (
            <div
              className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-[3px] p-4 text-center"
              style={{ borderColor: strokeColor, color: strokeColor }}
              data-testid="stamp-preview-circle"
            >
              <div className="text-[9px] leading-tight">{v.stamp_text_primary || "Konekt Limited"} &bull; {v.stamp_text_secondary || "Dar es Salaam, Tanzania"}</div>
              <div className="mt-2 text-[9px] font-semibold">{v.stamp_phrase || "Official Company Stamp"}</div>
              <div className="mt-2 text-[8px]">{v.stamp_registration_number || "REG-123456"}</div>
              <div className="text-[8px]">{v.stamp_tax_number || "TIN 123-456-789"}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
