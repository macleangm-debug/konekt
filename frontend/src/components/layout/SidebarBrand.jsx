import BrandLogo from "../branding/BrandLogo";

export default function SidebarBrand({ variant = "default", size = "md" }) {
  return (
    <div className="px-4 py-5 border-b border-gray-100" data-testid="sidebar-brand">
      <BrandLogo size={size} variant={variant} />
    </div>
  );
}
