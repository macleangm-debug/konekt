export function getStoredCountryCode() {
  return localStorage.getItem("customer_country_code") || "";
}

export function getStoredRegion() {
  return localStorage.getItem("customer_region") || "";
}

export function getStoredCurrency() {
  return localStorage.getItem("customer_currency") || "";
}

export function saveCountryPreference({ countryCode, region, currency }) {
  if (countryCode) localStorage.setItem("customer_country_code", countryCode);
  if (region) localStorage.setItem("customer_region", region);
  if (currency) localStorage.setItem("customer_currency", currency);
}

export function clearCountryPreference() {
  localStorage.removeItem("customer_country_code");
  localStorage.removeItem("customer_region");
  localStorage.removeItem("customer_currency");
}
