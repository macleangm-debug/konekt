import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Printer, Palette, Wrench, Settings, ArrowRight, Loader2,
  Package, Shirt, Building2, ShieldCheck, Clock, Headphones,
  CheckCircle2, Search, PenTool, Sparkles, Zap, Monitor,
} from "lucide-react";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PremiumFooterV2 from "../../components/public/PremiumFooterV2";
import ServiceCategoryGrid from "../../components/services/ServiceCategoryGrid";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ICON_MAP = {
  printing_branding: Printer,
  creative_services: Palette,
  facilities_services: Building2,
  technical_support: Monitor,
  business_support: Package,
  workwear_uniforms: Shirt,
};

const defaultCategories = [
  { key: "printing_branding", name: "Printing & Branding" },
  { key: "creative_services", name: "Creative & Design" },
  { key: "facilities_services", name: "Facilities Services" },
  { key: "technical_support", name: "Technical Support" },
  { key: "business_support", name: "Business Support" },
  { key: "workwear_uniforms", name: "Uniforms & Workwear" },
];

const defaultServices = [
  { key: "printing", slug: "printing", group_key: "printing_branding", name: "Printing Services", short_description: "Business cards, brochures, banners, labels, and branded print support." },
  { key: "office-branding", slug: "office-branding", group_key: "printing_branding", name: "Office Branding", short_description: "Workspace branding, wall graphics, signage, and installation." },
  { key: "signage-installation", slug: "signage-installation", group_key: "printing_branding", name: "Signage Installation", short_description: "Indoor and outdoor signage design and professional installation." },
  { key: "graphic-design", slug: "graphic-design", group_key: "creative_services", name: "Graphic Design Support", short_description: "Design support for brand assets, documents, and campaigns." },
  { key: "social-media-design", slug: "social-media-design", group_key: "creative_services", name: "Social Media Design", short_description: "Visual content creation for social media platforms." },
  { key: "presentation-design", slug: "presentation-design", group_key: "creative_services", name: "Presentation Design", short_description: "Professional presentation design for pitches and reports." },
  { key: "deep-cleaning", slug: "deep-cleaning", group_key: "facilities_services", name: "Deep Office Cleaning", short_description: "Carpet, upholstery, washroom, and workspace deep cleaning." },
  { key: "fumigation", slug: "fumigation", group_key: "facilities_services", name: "Fumigation Services", short_description: "Professional pest control and fumigation for offices." },
  { key: "printer-servicing", slug: "printer-servicing", group_key: "technical_support", name: "Printer Servicing", short_description: "Printer servicing, diagnostics, and maintenance support." },
  { key: "cctv-installation", slug: "cctv-installation", group_key: "technical_support", name: "CCTV Installation", short_description: "Security camera setup and installation services." },
  { key: "network-setup", slug: "network-setup", group_key: "technical_support", name: "Office Network Setup", short_description: "LAN, Wi-Fi, and network infrastructure setup." },
  { key: "procurement-support", slug: "procurement-support", group_key: "business_support", name: "Procurement Support", short_description: "Structured sourcing and supply coordination for business clients." },
  { key: "event-support", slug: "event-support", group_key: "business_support", name: "Business Event Support", short_description: "Event planning, logistics, and materials coordination." },
  { key: "uniform-tailoring", slug: "uniform-tailoring", group_key: "workwear_uniforms", name: "Uniform Tailoring", short_description: "Office uniforms and custom workwear sizing, production, and delivery." },
  { key: "ppe-supply", slug: "ppe-supply", group_key: "workwear_uniforms", name: "PPE Supply", short_description: "Personal protective equipment sourcing and supply." },
];

export default function ServicesPageImproved() {
  const [categories, setCategories] = useState(defaultCategories);
  const [services, setServices] = useState(defaultServices);
  const [activeCategory, setActiveCategory] = useState("printing_branding");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        try {
          const catRes = await fetch(`${API_URL}/api/service-catalog/groups`);
          if (catRes.ok) {
            const catData = await catRes.json();
            if (catData.length > 0) {
              const mapped = catData.map(g => ({ key: g.slug || g.key, name: g.name }));
              setCategories(mapped);
              setActiveCategory(mapped[0]?.key || "printing_branding");
            }
          }
        } catch (err) { /* fallback */ }
        try {
          const servRes = await fetch(`${API_URL}/api/service-catalog/services`);
          if (servRes.ok) {
            const servData = await servRes.json();
            if (servData.length > 0) {
              const mapped = servData.map(s => ({
                key: s.slug || s.key,
                slug: s.slug || s.key,
                group_key: s.group_slug || s.group_key,
                name: s.name,
                short_description: s.short_description || s.description?.substring(0, 120),
              }));
              setServices(mapped);
            }
          }
        } catch (err) { /* fallback */ }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const strengths = [
    { Icon: ShieldCheck, title: "Quality Assured", text: "Every service request is managed end-to-end by Konekt, ensuring consistent quality and accountability." },
    { Icon: Clock, title: "Fast Turnaround", text: "Clear timelines and structured workflows mean your service requests are handled promptly." },
    { Icon: Headphones, title: "Dedicated Support", text: "A dedicated team coordinates your request from submission to completion." },
  ];

  return (
    <div className="min-h-screen bg-white" data-testid="services-page-improved">
      <PublicNavbarV2 />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0E1A2B] text-white" data-testid="services-hero">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.15] tracking-tight" data-testid="services-hero-headline">
              Professional Business Services
              <span className="text-[#D4A843]"> — Managed by Konekt</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              From printing and branding to office maintenance and creative design — Konekt handles your service needs with structured workflows and reliable execution.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/request-quote"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-bold hover:bg-[#c49a3d] transition"
                data-testid="services-hero-quote-btn"
              >
                Request a Quote <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#browse-services"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 font-semibold hover:bg-white/10 transition"
                data-testid="services-hero-browse-btn"
              >
                Browse Services
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Category Highlights */}
      <section className="bg-slate-50 py-16 md:py-20" data-testid="service-categories-highlight">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">What We Offer</h2>
            <p className="text-slate-600 mt-3 text-base md:text-lg">
              Six core service categories covering everything your business needs to operate and grow.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => {
              const Icon = ICON_MAP[cat.key] || Package;
              const count = services.filter(s => s.group_key === cat.key).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    document.getElementById("browse-services")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`rounded-2xl border p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all group ${
                    activeCategory === cat.key ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white"
                  }`}
                  data-testid={`cat-highlight-${cat.key}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    activeCategory === cat.key ? "bg-white/15" : "bg-[#20364D]/8"
                  }`}>
                    <Icon className={`w-6 h-6 ${activeCategory === cat.key ? "text-[#D4A843]" : "text-[#20364D]"}`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-1 ${activeCategory === cat.key ? "text-white" : "text-[#20364D]"}`}>{cat.name}</h3>
                  <p className={`text-sm ${activeCategory === cat.key ? "text-slate-300" : "text-slate-500"}`}>
                    {count} service{count !== 1 ? "s" : ""} available
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Service Browsing */}
      <section id="browse-services" className="py-16 md:py-20" data-testid="browse-services-section">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">Browse Services</h2>
                <p className="text-slate-600 mt-3 text-base md:text-lg">
                  Select a category and explore available services. Request a quote or submit a service request directly.
                </p>
              </div>
              <ServiceCategoryGrid
                categories={categories}
                services={services}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                accountMode={false}
              />
            </div>
          )}
        </div>
      </section>

      {/* Trust Signals */}
      <section className="bg-slate-50 py-16 md:py-20" data-testid="services-trust-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">Why Businesses Choose Konekt Services</h2>
            <p className="text-slate-600 mt-3 text-base md:text-lg">
              A structured, reliable approach to business services — from request to delivery.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {strengths.map((s) => (
              <div key={s.title} className="rounded-2xl border bg-white p-6" data-testid={`trust-${s.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                  <s.Icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-[#20364D] mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20" data-testid="services-how-it-works">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">How Service Requests Work</h2>
            <p className="text-slate-600 mt-3 text-base md:text-lg">
              A clear, structured process from request to completion.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: "1", title: "Submit Your Request", text: "Tell us what you need with quantity, timeline, and specifications.", Icon: Search },
              { num: "2", title: "Receive a Quote", text: "We review your request and provide detailed pricing and timeline.", Icon: PenTool },
              { num: "3", title: "Approve & Pay", text: "Confirm the quote and submit your payment. We verify before starting.", Icon: CheckCircle2 },
              { num: "4", title: "Track to Completion", text: "Monitor progress and receive your completed service on time.", Icon: Zap },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl bg-white border p-6 hover:shadow-lg transition-shadow group" data-testid={`services-step-${step.num}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-full bg-[#20364D] text-white flex items-center justify-center text-sm font-bold">
                    {step.num}
                  </span>
                  <step.Icon className="w-5 h-5 text-[#D4A843] group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-lg font-bold text-[#20364D] mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 py-16 md:py-20" data-testid="services-cta-section">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D] mb-3">
            Need a Custom Service?
          </h2>
          <p className="text-slate-600 text-base md:text-lg max-w-xl mx-auto mb-8">
            Can't find what you need? Submit a custom quote request and our team will get back to you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/request-quote"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-bold hover:bg-[#c49a3d] transition"
              data-testid="services-cta-quote-btn"
            >
              Request a Quote <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#20364D] text-[#20364D] px-7 py-3.5 font-semibold hover:bg-[#20364D] hover:text-white transition"
              data-testid="services-cta-products-btn"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>

      <PremiumFooterV2 />
    </div>
  );
}
