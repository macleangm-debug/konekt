export default function BrandLogo({
  variant = "default",
  size = "md",
  showWordmark = false,
  className = "",
}) {
  const sizeMap = {
    xs: "h-6",
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
    xl: "h-20",
  };

  const logoSrc =
    variant === "light"
      ? "/branding/konekt-logo-white.png"
      : "/branding/konekt-logo-full.png";

  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="brand-logo">
      <img
        src={logoSrc}
        alt="Konekt"
        className={`${sizeMap[size] || sizeMap.md} w-auto object-contain`}
      />
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight">Konekt</span>
      )}
    </div>
  );
}
