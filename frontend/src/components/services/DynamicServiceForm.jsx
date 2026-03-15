import React from "react";

function Field({ field, value, onChange }) {
  const commonInputClass = "w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D3E50]/20 focus:border-[#2D3E50]";

  if (field.type === "textarea") {
    return (
      <textarea
        className={`${commonInputClass} min-h-[120px]`}
        value={value || ""}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder || ""}
        data-testid={`field-${field.key}`}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        className={commonInputClass}
        value={value || ""}
        onChange={(e) => onChange(field.key, e.target.value)}
        data-testid={`field-${field.key}`}
      >
        <option value="">Select</option>
        {(field.options || []).map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="space-y-2" data-testid={`field-${field.key}`}>
        {(field.options || []).map((option) => (
          <label
            key={option.value || option}
            className="flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <input
              type="radio"
              name={field.key}
              checked={value === (option.value || option)}
              onChange={() => onChange(field.key, option.value || option)}
              className="w-4 h-4 text-[#2D3E50]"
            />
            <span>{option.label || option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors" data-testid={`field-${field.key}`}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="w-4 h-4 text-[#2D3E50]"
        />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <input
      className={commonInputClass}
      type={field.type || "text"}
      value={value || ""}
      onChange={(e) => onChange(field.key, e.target.value)}
      placeholder={field.placeholder || ""}
      data-testid={`field-${field.key}`}
    />
  );
}

export default function DynamicServiceForm({ schema = [], values = {}, onChange }) {
  return (
    <div className="space-y-5" data-testid="dynamic-service-form">
      {schema.map((field) => (
        <div key={field.key}>
          {field.type !== "checkbox" && (
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {field.label} {field.required ? <span className="text-red-500">*</span> : ""}
            </label>
          )}
          <Field field={field} value={values[field.key]} onChange={onChange} />
          {field.help_text ? (
            <p className="text-xs text-slate-500 mt-2">{field.help_text}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
