import React from "react";

export default function DynamicBriefForm({
  service,
  formData,
  setFormData,
  selectedAddons,
  setSelectedAddons,
}) {
  const updateField = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleAddon = (code) => {
    setSelectedAddons((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const renderField = (field) => {
    const value = formData[field.key] ?? (field.field_type === "boolean" ? false : "");

    if (field.field_type === "textarea") {
      return (
        <textarea
          className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[120px] focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
          placeholder={field.placeholder || field.label}
          value={value}
          onChange={(e) => updateField(field.key, e.target.value)}
          data-testid={`brief-field-${field.key}`}
        />
      );
    }

    if (field.field_type === "select") {
      return (
        <select
          className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
          value={value}
          onChange={(e) => updateField(field.key, e.target.value)}
          data-testid={`brief-field-${field.key}`}
        >
          <option value="">Select {field.label}</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.field_type === "multi_select") {
      return (
        <div className="grid md:grid-cols-2 gap-2" data-testid={`brief-field-${field.key}`}>
          {(field.options || []).map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={Array.isArray(value) ? value.includes(opt) : false}
                onChange={(e) => {
                  const current = Array.isArray(value) ? value : [];
                  if (e.target.checked) {
                    updateField(field.key, [...current, opt]);
                  } else {
                    updateField(field.key, current.filter((x) => x !== opt));
                  }
                }}
                className="w-4 h-4 accent-[#D4A843]"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (field.field_type === "boolean") {
      return (
        <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-white hover:bg-slate-50 cursor-pointer transition-colors" data-testid={`brief-field-${field.key}`}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => updateField(field.key, e.target.checked)}
            className="w-4 h-4 accent-[#D4A843]"
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.field_type === "number") {
      return (
        <input
          type="number"
          className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
          placeholder={field.placeholder || field.label}
          value={value}
          onChange={(e) => updateField(field.key, Number(e.target.value))}
          data-testid={`brief-field-${field.key}`}
        />
      );
    }

    // Default: text input
    return (
      <input
        type="text"
        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
        placeholder={field.placeholder || field.label}
        value={value}
        onChange={(e) => updateField(field.key, e.target.value)}
        data-testid={`brief-field-${field.key}`}
      />
    );
  };

  return (
    <div className="space-y-6" data-testid="dynamic-brief-form">
      {/* Brief Fields Section */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold text-[#2D3E50]">Brief Details</h2>
        <p className="text-slate-500 mt-1">Tell us about your project requirements</p>
        
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {(service?.brief_fields || []).map((field) => (
            <div
              key={field.key}
              className={field.field_type === "textarea" || field.field_type === "multi_select" ? "md:col-span-2" : ""}
            >
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {renderField(field)}
              {field.help_text && (
                <div className="text-xs text-slate-500 mt-2">{field.help_text}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add-Ons Section */}
      {!!(service?.addons || []).length && (
        <div className="rounded-3xl border bg-white p-6" data-testid="addons-section">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Optional Add-Ons</h2>
          <p className="text-slate-500 mt-1">Enhance your project with these extras</p>
          
          <div className="space-y-3 mt-6">
            {(service.addons || []).map((addon) => (
              <label
                key={addon.code}
                className={`flex items-start gap-4 rounded-2xl border p-4 cursor-pointer transition-all ${
                  selectedAddons.includes(addon.code) 
                    ? "border-[#D4A843] bg-[#D4A843]/5" 
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
                data-testid={`addon-${addon.code}`}
              >
                <input
                  type="checkbox"
                  checked={selectedAddons.includes(addon.code)}
                  onChange={() => toggleAddon(addon.code)}
                  className="mt-1 w-5 h-5 accent-[#D4A843]"
                />
                <div className="flex-1">
                  <div className="font-semibold text-[#2D3E50]">{addon.label}</div>
                  {addon.description && (
                    <div className="text-sm text-slate-500 mt-1">{addon.description}</div>
                  )}
                </div>
                <div className="font-bold text-[#D4A843]">
                  {service.currency || "TZS"} {Number(addon.price || 0).toLocaleString()}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
