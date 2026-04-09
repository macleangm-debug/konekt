import { useBranding } from "../contexts/BrandingContext";

/**
 * Legacy hook — now delegates to BrandingContext for a single source of truth.
 */
export default function useBrandingSettings() {
  const branding = useBranding();
  return {
    data: {
      company_name: branding.brand_name,
      logo_url: branding.primary_logo_url,
      icon_url: branding.favicon_url || branding.secondary_logo_url,
      company_email: branding.support_email,
      company_phone: branding.support_phone,
      company_address: "",
    },
    loading: branding.loading,
  };
}
