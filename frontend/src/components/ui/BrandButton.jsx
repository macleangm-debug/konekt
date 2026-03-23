import React from "react";
import { Link } from "react-router-dom";

export default function BrandButton({
  children,
  href,
  variant = "primary",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md";

  const styles = {
    primary:
      "bg-[#0f172a] text-white hover:bg-[#1e293b] focus:ring-[#1f3a5f]",
    gold:
      "bg-[#f4c430] text-[#0f172a] hover:bg-[#e8b82a] focus:ring-[#f4c430]",
    ghost:
      "border border-gray-200 bg-white text-[#0f172a] hover:bg-[#f8fafc] focus:ring-gray-300",
    darkGhost:
      "border border-white/20 bg-white/5 text-white hover:bg-white/10 focus:ring-white/30",
  };

  if (href) {
    return (
      <Link to={href} className={`${base} ${styles[variant]} ${className}`} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
