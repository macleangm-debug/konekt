import BrandLogo from "../branding/BrandLogo";

export default function AuthBrandHeader({ subtitle = "Welcome to Konekt" }) {
  return (
    <div className="mb-6 flex flex-col items-center" data-testid="auth-brand-header">
      <BrandLogo size="lg" />
      <p className="mt-3 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
