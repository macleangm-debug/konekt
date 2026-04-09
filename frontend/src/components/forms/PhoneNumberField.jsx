import React from "react";
import CountryAwarePhoneField from "../vendors/CountryAwarePhoneField";

/**
 * PhoneNumberField — Legacy wrapper.
 * Delegates 100% to CountryAwarePhoneField (canonical phone input).
 * All existing usages work without changes.
 */
export default function PhoneNumberField({
  label = "Phone",
  prefix = "+255",
  number = "",
  onPrefixChange,
  onNumberChange,
  required = false,
  testIdPrefix = "phone",
  error,
  disabled = false,
}) {
  return (
    <CountryAwarePhoneField
      prefix={prefix}
      onPrefixChange={(val) => onPrefixChange?.(val)}
      phone={number}
      onPhoneChange={(val) => onNumberChange?.(val)}
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      testIdPrefix={testIdPrefix}
    />
  );
}
