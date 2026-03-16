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
    "inline-flex items-center justify-center rounded-2xl px-6 py-3.5 font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const styles = {
    primary:
      "bg-[#20364D] text-white hover:opacity-95 focus:ring-[#20364D]",
    gold:
      "bg-[#D4A843] text-slate-900 hover:opacity-95 focus:ring-[#D4A843]",
    ghost:
      "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus:ring-slate-400",
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
