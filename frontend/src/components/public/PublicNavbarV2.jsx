import React, { useState } from "react";
import { Link } from "react-router-dom";
import BrandButton from "../ui/BrandButton";
import { Menu, X } from "lucide-react";

export default function PublicNavbarV2() {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Marketplace", href: "/marketplace" },
    { label: "Services", href: "/services" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Expansion", href: "/launch-country" },
    { label: "Track Order", href: "/track-order" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm" data-testid="public-navbar">
      <div className="max-w-7xl mx-auto px-6 h-18 min-h-[72px] flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-[#20364D]">
          Konekt
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {links.map((link) => (
            <Link
              key={link.href + link.label}
              to={link.href}
              className="text-sm font-medium text-slate-700 hover:text-[#20364D] transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <BrandButton href="/dashboard" variant="ghost">
            Login
          </BrandButton>
          <BrandButton href="/marketplace" variant="gold">
            Start Browsing
          </BrandButton>
        </div>

        <button
          className="lg:hidden rounded-xl border px-4 py-2 font-medium flex items-center gap-2"
          onClick={() => setOpen((v) => !v)}
          data-testid="mobile-menu-btn"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          Menu
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t bg-white" data-testid="mobile-menu">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href + link.label}
                to={link.href}
                className="rounded-xl px-3 py-3 hover:bg-slate-50 font-medium text-slate-700"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t space-y-2">
              <BrandButton href="/dashboard" variant="ghost" className="w-full">
                Login
              </BrandButton>
              <BrandButton href="/marketplace" variant="gold" className="w-full">
                Start Browsing
              </BrandButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
