import React from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

/**
 * DynamicFormRenderer - Renders a form based on JSON template
 * 
 * Template structure:
 * {
 *   sections: [{ key, title, description }],
 *   fields: [{
 *     key, label, type, section_key, required, placeholder, options, ...
 *   }]
 * }
 */
export default function DynamicFormRenderer({ 
  template, 
  values, 
  onChange, 
  errors = {},
  disabled = false 
}) {
  if (!template || (!template.sections?.length && !template.fields?.length)) {
    return null;
  }

  const sections = template.sections || [];
  const fields = template.fields || [];

  // Group fields by section
  const fieldsBySection = {};
  const unsectionedFields = [];
  
  fields.forEach((field) => {
    if (field.section_key) {
      if (!fieldsBySection[field.section_key]) {
        fieldsBySection[field.section_key] = [];
      }
      fieldsBySection[field.section_key].push(field);
    } else {
      unsectionedFields.push(field);
    }
  });

  const handleFieldChange = (fieldKey, value) => {
    onChange({ ...values, [fieldKey]: value });
  };

  const renderField = (field) => {
    const value = values[field.key] ?? "";
    const error = errors[field.key];
    const fieldId = `field-${field.key}`;

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium text-[#20364D]">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type={field.type === "phone" ? "tel" : field.type}
              placeholder={field.placeholder || ""}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={disabled}
              data-testid={`form-field-${field.key}`}
              className={error ? "border-red-500" : ""}
            />
            {field.help_text && (
              <p className="text-xs text-slate-500">{field.help_text}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium text-[#20364D]">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              placeholder={field.placeholder || ""}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={disabled}
              rows={field.rows || 4}
              data-testid={`form-field-${field.key}`}
              className={error ? "border-red-500" : ""}
            />
            {field.help_text && (
              <p className="text-xs text-slate-500">{field.help_text}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "select":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium text-[#20364D]">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleFieldChange(field.key, val)}
              disabled={disabled}
            >
              <SelectTrigger 
                id={fieldId} 
                data-testid={`form-field-${field.key}`}
                className={error ? "border-red-500" : ""}
              >
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((option) => (
                  <SelectItem 
                    key={option.value || option} 
                    value={option.value || option}
                  >
                    {option.label || option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.help_text && (
              <p className="text-xs text-slate-500">{field.help_text}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.key} className="flex items-start space-x-3 py-2">
            <Checkbox
              id={fieldId}
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(field.key, checked)}
              disabled={disabled}
              data-testid={`form-field-${field.key}`}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor={fieldId} className="text-sm font-medium text-[#20364D] cursor-pointer">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.help_text && (
                <p className="text-xs text-slate-500">{field.help_text}</p>
              )}
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        );

      case "multi_select":
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium text-[#20364D]">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(field.options || []).map((option) => {
                const optValue = option.value || option;
                const optLabel = option.label || option;
                const isChecked = selectedValues.includes(optValue);
                return (
                  <div key={optValue} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${fieldId}-${optValue}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...selectedValues, optValue]
                          : selectedValues.filter(v => v !== optValue);
                        handleFieldChange(field.key, newValues);
                      }}
                      disabled={disabled}
                    />
                    <Label 
                      htmlFor={`${fieldId}-${optValue}`}
                      className="text-sm text-slate-600 cursor-pointer"
                    >
                      {optLabel}
                    </Label>
                  </div>
                );
              })}
            </div>
            {field.help_text && (
              <p className="text-xs text-slate-500">{field.help_text}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "date":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium text-[#20364D]">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={disabled}
              data-testid={`form-field-${field.key}`}
              className={error ? "border-red-500" : ""}
            />
            {field.help_text && (
              <p className="text-xs text-slate-500">{field.help_text}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "file":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium text-[#20364D]">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="file"
              onChange={(e) => handleFieldChange(field.key, e.target.files?.[0] || null)}
              disabled={disabled}
              data-testid={`form-field-${field.key}`}
              accept={field.accept || "*"}
              className={error ? "border-red-500" : ""}
            />
            {field.help_text && (
              <p className="text-xs text-slate-500">{field.help_text}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium text-[#20364D]">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="text"
              placeholder={field.placeholder || ""}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={disabled}
              data-testid={`form-field-${field.key}`}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );
    }
  };

  return (
    <div className="space-y-8" data-testid="dynamic-form">
      {/* Render sections with their fields */}
      {sections.map((section) => {
        const sectionFields = fieldsBySection[section.key] || [];
        if (sectionFields.length === 0) return null;

        return (
          <div key={section.key} className="space-y-4" data-testid={`form-section-${section.key}`}>
            <div>
              <h3 className="text-lg font-semibold text-[#20364D]">{section.title}</h3>
              {section.description && (
                <p className="text-sm text-slate-500 mt-1">{section.description}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {sectionFields.map(renderField)}
            </div>
          </div>
        );
      })}

      {/* Render unsectioned fields */}
      {unsectionedFields.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {unsectionedFields.map(renderField)}
        </div>
      )}
    </div>
  );
}
