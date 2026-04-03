import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/public/PublicFooter";
import ServiceCategoryTabs from "../../components/public/ServiceCategoryTabs";
import ServiceFeaturedStrip from "../../components/public/ServiceFeaturedStrip";

const mockCategories = [
  { key: "printing_branding", name: "Printing & Branding" },
  { key: "creative_services", name: "Creative & Design" },
  { key: "facilities_services", name: "Facilities Services" },
  { key: "technical_support", name: "Technical Support" },
];

const mockServices = [
  { key: "printing", slug: "printing", group_key: "printing_branding", name: "Printing Services", short_description: "Business cards, brochures, banners, labels, and branded print support." },
  { key: "office-branding", slug: "office-branding", group_key: "printing_branding", name: "Office Branding", short_description: "Workspace branding, wall graphics, signage, and installation." },
  { key: "graphic-design", slug: "graphic-design", group_key: "creative_services", name: "Graphic Design Support", short_description: "Design support for brand assets, documents, and campaigns." },
  { key: "deep-cleaning", slug: "deep-cleaning", group_key: "facilities_services", name: "Deep Office Cleaning", short_description: "Carpet, upholstery, washroom, and workspace deep cleaning." },
  { key: "printer-servicing", slug: "printer-servicing", group_key: "technical_support", name: "Printer Servicing", short_description: "Printer servicing, diagnostics, and maintenance support." },
];

export default function ServicesDiscoveryPage() {
  const [activeCategory, setActiveCategory] = useState("printing_branding");
  const navigate = useNavigate();

  const visible = useMemo(
    () => mockServices.filter((x) => x.group_key === activeCategory),
    [activeCategory]
  );

  const featured = useMemo(() => mockServices.slice(0, 4), []);

  const startGuestLead = (service) => {
    navigate(`/services/${service.slug}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbarV2 />

      <main>
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid lg:grid-cols-[1fr_0.95fr] gap-10 items-center">
              <div>
                <div className="text-xs tracking-[0.22em] uppercase text-slate-500 font-semibold">
                  Services Discovery
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-[#20364D] mt-4 leading-tight">
                  Explore business services with clearer categories, better guidance, and faster next steps
                </h1>
                <p className="text-slate-600 mt-5 text-lg max-w-3xl">
                  Browse service categories, understand what each service covers, and request support through a smoother
                  guest or logged-in flow.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <Link to="/request-quote" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
                    Request Quote
                  </Link>
                  <Link to="/dashboard/services" className="rounded-xl border px-5 py-3 font-semibold text-[#20364D]">
                    Browse Inside Account
                  </Link>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white border p-6">
                  <div className="text-lg font-bold text-[#20364D]">Guest-friendly</div>
                  <p className="text-slate-600 mt-3 text-sm">
                    Guests can explore, start interest capture, and continue without being forced into an account too early.
                  </p>
                </div>
                <div className="rounded-3xl bg-white border p-6">
                  <div className="text-lg font-bold text-[#20364D]">Account mode</div>
                  <p className="text-slate-600 mt-3 text-sm">
                    Logged-in customers complete detailed forms inside their account for better tracking.
                  </p>
                </div>
                <div className="rounded-3xl bg-white border p-6">
                  <div className="text-lg font-bold text-[#20364D]">Business-ready</div>
                  <p className="text-slate-600 mt-3 text-sm">
                    Stronger B2B support, business pricing pathways, and guided follow-up for serious clients.
                  </p>
                </div>
                <div className="rounded-3xl bg-white border p-6">
                  <div className="text-lg font-bold text-[#20364D]">Clear next steps</div>
                  <p className="text-slate-600 mt-3 text-sm">
                    Every service card leads to a dedicated page with the right CTAs for quote or request.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-16 space-y-12">
          <div>
            <div className="text-2xl font-bold text-[#20364D]">Featured services</div>
            <p className="text-slate-600 mt-2">Start with the most requested business services.</p>
            <div className="mt-6">
              <ServiceFeaturedStrip items={featured} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-2xl font-bold text-[#20364D]">Browse by category</div>
            <ServiceCategoryTabs
              categories={mockCategories}
              activeKey={activeCategory}
              onChange={setActiveCategory}
            />

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {visible.map((service) => (
                <div key={service.key} className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition">
                  <div className="flex items-center justify-between gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                      ✦
                    </div>
                    <div className="rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs font-semibold">
                      {mockCategories.find((x) => x.key === service.group_key)?.name}
                    </div>
                  </div>

                  <div className="text-2xl font-bold text-[#20364D] mt-6">{service.name}</div>
                  <p className="text-slate-600 mt-3 leading-6">{service.short_description}</p>

                  <div className="grid gap-3 mt-6">
                    <Link
                      to={`/services/${service.slug}`}
                      className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold text-center"
                    >
                      View Service
                    </Link>
                    <button
                      type="button"
                      onClick={() => startGuestLead(service)}
                      className="rounded-xl border px-5 py-3 font-semibold text-[#20364D]"
                    >
                      Request Quote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
