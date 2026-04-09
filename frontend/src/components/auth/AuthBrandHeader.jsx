import BrandLogo from "../branding/BrandLogo";
import { useBranding } from "../../contexts/BrandingContext";

export default function AuthBrandHeader({ subtitle }) {
  const { brand_name } = useBranding();
  return (
    <div className="mb-6 flex flex-col items-center" data-testid="auth-brand-header">
      <BrandLogo size="lg" />
      <p className="mt-3 text-sm text-gray-500">{subtitle || `Welcome to ${brand_name}`}</p>
    </div>
  );
}
