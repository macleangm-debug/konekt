import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Printer, Palette, Wrench, Settings, ArrowRight, Loader2, Package, Camera, Shirt, Building2, FileText } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import BrandButton from "../../components/ui/BrandButton";
import { getServiceGroups, getServiceTypes } from "../../lib/serviceCatalogApi";

// Icon mapping for dynamic icons
const ICON_MAP = {
  printer: Printer,
  palette: Palette,
  wrench: Wrench,
  settings: Settings,
  package: Package,
  camera: Camera,
  shirt: Shirt,
  building: Building2,
  file: FileText,
};

// Fallback static data if API fails or no data
const FALLBACK_CATEGORIES = [
  {
    key: "printing",
    slug: "printing",
    name: "Printing Services",
    description: "Brochures, business cards, banners, branded documents, packaging, and large format printing.",
    icon: "printer",
    services: ["Business Cards", "Brochures & Flyers", "Banners & Signage", "Packaging", "Labels & Stickers"],
  },
  {
    key: "creative",
    slug: "creative",
    name: "Creative & Design",
    description: "Graphic design, copywriting, branding, and business content creation support.",
    icon: "palette",
    services: ["Logo Design", "Brand Identity", "Marketing Materials", "Social Media Graphics", "Presentation Design"],
  },
  {
    key: "maintenance",
    slug: "maintenance",
    name: "Maintenance Services",
    description: "Equipment maintenance, repair, and technical support for business operations.",
    icon: "wrench",
    services: ["Printer Maintenance", "Equipment Repair", "Preventive Service", "Technical Support"],
  },
  {
    key: "installation",
    slug: "installation",
    name: "Installation Services",
    description: "Professional installation and setup for office equipment and business systems.",
    icon: "settings",
    services: ["Equipment Setup", "System Installation", "Configuration", "Training"],
  },
];

export default function ServicesPageContent() {
  const [groups, setGroups] = useState([]);
  const [servicesByGroup, setServicesByGroup] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [groupsData, typesData] = await Promise.all([
          getServiceGroups(),
          getServiceTypes(),
        ]);

        if (groupsData.length > 0) {
          setGroups(groupsData);
          // Group service types by group_key
          const grouped = {};
          typesData.forEach((type) => {
            if (!grouped[type.group_key]) {
              grouped[type.group_key] = [];
            }
            grouped[type.group_key].push(type);
          });
          setServicesByGroup(grouped);
        } else {
          // Use fallback if no data
          setGroups(FALLBACK_CATEGORIES);
        }
      } catch (err) {
        console.error("Failed to fetch services:", err);
        setError(err.message);
        setGroups(FALLBACK_CATEGORIES);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10" data-testid="services-page-loading">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
        </div>
      </div>
    );
  }

  const categories = groups.length > 0 ? groups : FALLBACK_CATEGORIES;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" data-testid="services-page">
      <PageHeader 
        title="Business Services"
        subtitle="Professional services to support your business operations, from printing to creative design."
      />

      {/* Hero Section */}
      <SurfaceCard className="bg-gradient-to-br from-[#20364D] to-[#1a2d40] text-white mb-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Need a custom quote for your project?
            </h2>
            <p className="text-slate-200 mt-3">
              Tell us about your requirements and we'll provide a detailed quote with turnaround times.
            </p>
            <div className="mt-6">
              <BrandButton href="/services/request" variant="gold" data-testid="request-quote-hero-btn">
                Request a Quote
                <ArrowRight className="w-5 h-5 ml-2" />
              </BrandButton>
            </div>
          </div>
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {["Fast Turnaround", "Quality Assured", "Competitive Pricing", "Expert Support"].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <div className="font-medium">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          Unable to load services from server. Showing default categories.
        </div>
      )}

      {/* Service Categories */}
      <div className="grid md:grid-cols-2 gap-6">
        {categories.map((category) => {
          const iconKey = category.icon?.toLowerCase() || "package";
          const Icon = ICON_MAP[iconKey] || Package;
          const services = servicesByGroup[category.key] || [];
          const serviceNames = services.length > 0 
            ? services.map(s => s.name)
            : category.services || [];

          return (
            <SurfaceCard 
              key={category.key || category.slug} 
              className="hover:shadow-lg transition"
              data-testid={`service-category-${category.key || category.slug}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#20364D]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-7 h-7 text-[#20364D]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#20364D]">{category.name}</h3>
                  <p className="text-slate-600 mt-2">{category.description}</p>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {serviceNames.slice(0, 4).map((service) => (
                      <span key={service} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                        {service}
                      </span>
                    ))}
                    {serviceNames.length > 4 && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                        +{serviceNames.length - 4} more
                      </span>
                    )}
                  </div>
                  
                  <Link
                    to={`/services/${category.slug || category.key}`}
                    className="inline-flex items-center gap-1 mt-4 font-semibold text-[#20364D] hover:underline"
                    data-testid={`view-services-${category.key || category.slug}`}
                  >
                    View Services
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      {/* How It Works */}
      <div className="mt-16">
        <h2 className="text-2xl md:text-3xl font-bold text-[#20364D] mb-8">How service requests work</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: 1, title: "Submit your request", desc: "Tell us what you need with details about quantity, timeline, and specifications." },
            { step: 2, title: "Receive a quote", desc: "We'll review your request and provide a detailed quote with pricing and timeline." },
            { step: 3, title: "Track progress", desc: "Once approved, track your service request from start to completion." },
          ].map((item) => (
            <SurfaceCard key={item.step} data-testid={`how-it-works-step-${item.step}`}>
              <div className="w-10 h-10 rounded-full bg-[#20364D] text-white flex items-center justify-center font-bold mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-[#20364D]">{item.title}</h3>
              <p className="text-slate-600 mt-2">{item.desc}</p>
            </SurfaceCard>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-16 text-center">
        <SurfaceCard className="bg-slate-50">
          <h3 className="text-xl font-bold text-[#20364D] mb-2">Can't find what you're looking for?</h3>
          <p className="text-slate-600 mb-4">Contact us for custom requirements or questions about our services.</p>
          <BrandButton href="mailto:services@konekt.co.tz" variant="outline" data-testid="contact-services-btn">
            Contact Services Team
          </BrandButton>
        </SurfaceCard>
      </div>
    </div>
  );
}
