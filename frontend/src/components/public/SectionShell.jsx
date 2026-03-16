import React from "react";

export default function SectionShell({
  children,
  className = "",
  containerClassName = "",
  muted = false,
}) {
  return (
    <section className={`${muted ? "bg-slate-50" : "bg-white"} ${className}`}>
      <div className={`max-w-7xl mx-auto px-6 py-16 md:py-20 ${containerClassName}`}>
        {children}
      </div>
    </section>
  );
}
