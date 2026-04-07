export default function BrandLogo({
  variant = "default",
  size = "md",
  showWordmark = false,
  className = "",
}) {
  const sizeMap = {
    xs: "h-7",
    sm: "h-9",
    md: "h-11",
    lg: "h-14 md:h-16",
    xl: "h-16 md:h-20",
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
