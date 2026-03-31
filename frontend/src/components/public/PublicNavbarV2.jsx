import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import BrandButton from "../ui/BrandButton";
import { Menu, X, FileText, ChevronDown } from "lucide-react";
import BrandLogo from "../branding/BrandLogo";
import { serviceNavigationGroups } from "../services/ServiceNavigationDropdownData";
import MarketSelectorNav from "../navigation/MarketSelectorNav";

export default function PublicNavbarV2() {
  const [open, setOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setServicesDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const links = [
    { label: "Marketplace", href: "/marketplace" },
    { label: "Services", href: "/services", hasDropdown: true },
    { label: "Track Order", href: "/track-order" },
    { label: "Expansion", href: "/launch-country" },
    { label: "Earn", href: "/earn" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm" data-testid="public-navbar">
      <div className="max-w-7xl mx-auto px-6 h-18 min-h-[72px] flex items-center justify-between">
        <Link to="/" className="flex items-center" data-testid="navbar-logo">
          <BrandLogo size="md" />
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {links.map((link) =>
            link.hasDropdown ? (
              <div key={link.href + link.label} className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="text-sm font-medium text-slate-700 hover:text-[#20364D] transition flex items-center gap-1"
                  onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                  data-testid="services-dropdown-btn"
                >
                  {link.label}
                  <ChevronDown className={`w-4 h-4 transition-transform ${servicesDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {servicesDropdownOpen && (
                  <div 
                    className="absolute top-full left-0 mt-2 w-[600px] bg-white rounded-2xl shadow-xl border p-5 grid grid-cols-2 gap-6 z-50"
                    data-testid="services-dropdown-menu"
                  >
                    {serviceNavigationGroups.map((group) => (
                      <div key={group.label}>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{group.label}</div>
                        <ul className="space-y-1">
                          {group.items.map((item) => (
                            <li key={item.href}>
                              <Link
                                to={item.href}
                                className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-[#20364D] transition"
                                onClick={() => setServicesDropdownOpen(false)}
                                data-testid={`nav-service-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <div className="col-span-2 border-t pt-3 mt-2">
                      <Link
                        to="/services"
                        className="text-sm font-semibold text-[#20364D] hover:underline"
                        onClick={() => setServicesDropdownOpen(false)}
                      >
                        View All Services →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.href + link.label}
                to={link.href}
                className={`text-sm font-medium transition ${
                  link.highlight 
                    ? "text-[#D4A843] hover:text-[#b8923a] flex items-center gap-1"
                    : "text-slate-700 hover:text-[#20364D]"
                }`}
              >
                {link.highlight && <FileText className="w-4 h-4" />}
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <MarketSelectorNav />
          <BrandButton href="/login" variant="ghost">
            Login
          </BrandButton>
          <BrandButton href="/request-quote" variant="gold">
            Get Quote
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
            {links.map((link) =>
              link.hasDropdown ? (
                <div key={link.href + link.label}>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-3 hover:bg-slate-50 font-medium text-slate-700 flex items-center justify-between"
                    onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                    data-testid="mobile-services-toggle"
                  >
                    {link.label}
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`} />
                  </button>
                  {mobileServicesOpen && (
                    <div className="pl-4 mt-2 space-y-2 max-h-80 overflow-y-auto" data-testid="mobile-services-menu">
                      {serviceNavigationGroups.map((group) => (
                        <div key={group.label} className="mb-4">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-3">{group.label}</div>
                          {group.items.map((item) => (
                            <Link
                              key={item.href}
                              to={item.href}
                              className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => { setOpen(false); setMobileServicesOpen(false); }}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      ))}
                      <Link
                        to="/services"
                        className="block px-3 py-2 text-sm font-semibold text-[#20364D]"
                        onClick={() => { setOpen(false); setMobileServicesOpen(false); }}
                      >
                        View All Services →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href + link.label}
                  to={link.href}
                  className={`rounded-xl px-3 py-3 hover:bg-slate-50 font-medium ${
                    link.highlight ? "text-[#D4A843] bg-amber-50" : "text-slate-700"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
            <div className="pt-3 border-t space-y-2">
              <BrandButton href="/login" variant="ghost" className="w-full">
                Login
              </BrandButton>
              <BrandButton href="/request-quote" variant="gold" className="w-full">
                Get Quote
              </BrandButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
