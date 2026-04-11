/**
 * Attribution Helper
 * Persist and retrieve affiliate attribution from URL/localStorage
 */

export function getStoredAffiliateCode() {
  if (typeof window === 'undefined') return "";
  return localStorage.getItem("affiliate_code") || "";
}

export function persistAffiliateCode(code) {
  if (!code || typeof window === 'undefined') return;
  localStorage.setItem("affiliate_code", code);
}

export function clearStoredAffiliateCode() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem("affiliate_code");
}

export function getAffiliateCodeFromUrl() {
  if (typeof window === 'undefined') return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("aff") || params.get("affiliate") || params.get("ref") || params.get("partner") || "";
}

export function bootstrapAffiliateAttribution() {
  const fromUrl = getAffiliateCodeFromUrl();
  if (fromUrl) {
    persistAffiliateCode(fromUrl);
    return fromUrl;
  }
  return getStoredAffiliateCode();
}

export function getStoredCampaign() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem("applied_campaign");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function persistCampaign(campaign) {
  if (!campaign || typeof window === 'undefined') return;
  localStorage.setItem("applied_campaign", JSON.stringify(campaign));
}

export function clearStoredCampaign() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem("applied_campaign");
}
