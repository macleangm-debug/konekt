import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useBranding } from "../../contexts/BrandingContext";

/**
 * Canonical layout for legal/informational pages (Privacy, Terms, Help).
 * Features: clean text layout, section headings, optional table of contents,
 * readable spacing, consistent branding.
 *
 * Props:
 *  - icon: Lucide icon component
 *  - title: Page title
 *  - subtitle: Optional subtitle
 *  - lastUpdated: e.g. "February 2026"
 *  - sections: Array of { id, title, content (JSX) }
 *  - showToc: boolean (default true for 3+ sections)
 *  - backLink: { to, label } (default: home)
 */
export default function LegalPageLayout({
  icon: Icon,
  title,
  subtitle,
  lastUpdated,
  sections = [],
  showToc,
  backLink = { to: "/", label: "Back to Home" },
}) {
  const { brand_name } = useBranding();
  const displayToc = showToc !== undefined ? showToc : sections.length >= 3;
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "");
  const observerRef = useRef(null);

  useEffect(() => {
    if (!displayToc) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    observerRef.current = observer;
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections, displayToc]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" data-testid="legal-page-layout">
      {/* Back link */}
      <Link
        to={backLink.to}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#20364D] transition-colors mb-8"
        data-testid="legal-back-link"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLink.label}
      </Link>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          {Icon && (
            <div className="w-11 h-11 rounded-2xl bg-[#20364D] flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#20364D] tracking-tight">
            {title}
          </h1>
        </div>
        {subtitle && <p className="text-base text-slate-500 max-w-2xl mt-1">{subtitle}</p>}
        {lastUpdated && (
          <p className="text-xs text-slate-400 mt-3 tracking-wide uppercase">
            Last updated: {lastUpdated}
          </p>
        )}
      </div>

      {/* Body: TOC sidebar + content */}
      <div className={displayToc ? "flex gap-10" : ""}>
        {/* TOC Sidebar — sticky on desktop */}
        {displayToc && (
          <nav className="hidden lg:block w-56 shrink-0" data-testid="legal-toc">
            <div className="sticky top-24 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-3 pl-3">
                On this page
              </p>
              {sections.map((s, i) => {
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? "bg-[#20364D]/5 text-[#20364D] font-semibold"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-3 h-3 transition-transform ${isActive ? "rotate-90" : ""}`} />
                      <span className="truncate">{i + 1}. {s.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Content */}
        <div className={`flex-1 ${displayToc ? "max-w-3xl" : "max-w-4xl"}`}>
          <div className="space-y-10">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24"
                data-testid={`legal-section-${s.id}`}
              >
                <h2 className="text-xl font-bold text-[#20364D] mb-4 flex items-center gap-2">
                  <span className="text-sm text-slate-300 font-mono">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </h2>
                <div className="text-[15px] text-slate-600 leading-relaxed space-y-4 legal-content">
                  {s.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-16 pt-8 border-t border-slate-200">
            <p className="text-xs text-slate-400">
              {brand_name} &mdash; This document applies to all users of the platform.
              For questions, contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
