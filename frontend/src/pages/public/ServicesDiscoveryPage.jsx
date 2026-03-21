import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import ServiceCategoryTabs from "../../components/public/ServiceCategoryTabs";
import ServiceFeaturedStrip from "../../components/public/ServiceFeaturedStrip";
import SoftLeadCaptureModal from "../../components/auth/SoftLeadCaptureModal";
import { Loader2 } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const fallbackCategories = [
  { key: "printing_branding", name: "Printing & Branding" },
  { key: "creative_services", name: "Creative & Design" },
  { key: "facilities_services", name: "Facilities Services" },
  { key: "technical_support", name: "Technical Support" },
];

const fallbackServices = [
  { key: "printing", slug: "printing", group_key: "printing_branding", name: "Printing Services", short_description: "Business cards, brochures, banners, labels, and branded print support." },
  { key: "office-branding", slug: "office-branding", group_key: "printing_branding", name: "Office Branding", short_description: "Workspace branding, wall graphics, signage, and installation." },
  { key: "graphic-design", slug: "graphic-design", group_key: "creative_services", name: "Graphic Design Support", short_description: "Design support for brand assets, documents, and campaigns." },
  { key: "deep-cleaning", slug: "deep-cleaning", group_key: "facilities_services", name: "Deep Office Cleaning", short_description: "Carpet, upholstery, washroom, and workspace deep cleaning." },
  { key: "printer-servicing", slug: "printer-servicing", group_key: "technical_support", name: "Printer Servicing", short_description: "Printer servicing, diagnostics, and maintenance support." },
];

export default function ServicesDiscoveryPage() {
  const [categories, setCategories] = useState(fallbackCategories);
  const [services, setServices] = useState(fallbackServices);
  const [activeCategory, setActiveCategory] = useState("printing_branding");
  const [loading, setLoading] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch service categories
        const catRes = await fetch(`${API_URL}/api/service-catalog/groups`);
        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.length > 0) {
            const mapped = catData.map(g => ({ key: g.slug, name: g.name }));
            setCategories(mapped);
            setActiveCategory(mapped[0]?.key || "printing_branding");
          }
        }
        
        // Fetch services
        const servRes = await fetch(`${API_URL}/api/service-catalog/services`);
        if (servRes.ok) {
          const servData = await servRes.json();
          if (servData.length > 0) {
            const mapped = servData.map(s => ({
              key: s.slug,
              slug: s.slug,
              group_key: s.group_slug || s.group_key,
              name: s.name,
              short_description: s.short_description || s.description?.substring(0, 100),
            }));
            setServices(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to fetch service data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const visible = useMemo(
    () => services.filter((x) => x.group_key === activeCategory),
    [activeCategory, services]
  );

  const featured = useMemo(() => services.slice(0, 4), [services]);

  const startGuestLead = (service) => {
    setSelectedService(service);
    setShowLeadModal(true);
  };

  const handleLeadCaptured = () => {
    setShowLeadModal(false);
    if (selectedService) {
      navigate(`/services/${selectedService.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="services-discovery-page">
      <PublicNavbarV2 />

      <main>
        {/* Hero Section */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid lg:grid-cols-[1fr_0.95fr] gap-10 items-center">
              <div>
                <div className="text-xs tracking-[0.22em] uppercase text-slate-500 font-semibold">
                  Services Discovery
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#20364D] mt-4 leading-tight">
                  Explore business services with clearer categories, better guidance, and faster next steps
                </h1>
                <p className="text-slate-600 mt-5 text-lg max-w-3xl">
                  Browse service categories, understand what each service covers, and request support through a smoother
                  guest or logged-in flow.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <Link 
                    to="/contact" 
                    data-testid="request-quote-btn"
                    className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold text-center hover:bg-[#17283c] transition"
                  >
                    Request Quote
                  </Link>
                  <Link 
                    to="/dashboard/service-requests" 
                    data-testid="browse-account-btn"
                    className="rounded-xl border px-5 py-3 font-semibold text-[#20364D] text-center hover:bg-slate-50 transition"
                  >
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

        {/* Services Content */}
        <section className="max-w-7xl mx-auto px-6 py-16 space-y-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
            </div>
          ) : (
            <>
              {/* Featured Services */}
              <div>
                <div className="text-2xl font-bold text-[#20364D]">Featured services</div>
                <p className="text-slate-600 mt-2">Start with the most requested business services.</p>
                <div className="mt-6">
                  <ServiceFeaturedStrip items={featured} />
                </div>
              </div>

              {/* Browse by Category */}
              <div className="space-y-6">
                <div className="text-2xl font-bold text-[#20364D]">Browse by category</div>
                <ServiceCategoryTabs
                  categories={categories}
                  activeKey={activeCategory}
                  onChange={setActiveCategory}
                />

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {visible.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500">
                      No services found in this category yet.
                    </div>
                  ) : (
                    visible.map((service) => (
                      <div 
                        key={service.key} 
                        className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition"
                        data-testid={`service-card-${service.slug}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl text-[#D4A843]">
                            ✦
                          </div>
                          <div className="rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs font-semibold">
                            {categories.find((x) => x.key === service.group_key)?.name || "Service"}
                          </div>
                        </div>

                        <div className="text-2xl font-bold text-[#20364D] mt-6">{service.name}</div>
                        <p className="text-slate-600 mt-3 leading-6">{service.short_description}</p>

                        <div className="grid gap-3 mt-6">
                          <Link
                            to={`/services/${service.slug}`}
                            data-testid={`view-service-${service.slug}`}
                            className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold text-center hover:bg-[#17283c] transition"
                          >
                            View Service
                          </Link>
                          <button
                            type="button"
                            onClick={() => startGuestLead(service)}
                            data-testid={`request-quote-${service.slug}`}
                            className="rounded-xl border px-5 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition"
                          >
                            Request Quote
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <PublicFooter />

      {/* Soft Lead Capture Modal */}
      <SoftLeadCaptureModal
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        onSubmitted={handleLeadCaptured}
        intentType="service_interest"
        intentPayload={selectedService ? { service_slug: selectedService.slug, service_name: selectedService.name } : {}}
      />
    </div>
  );
}
