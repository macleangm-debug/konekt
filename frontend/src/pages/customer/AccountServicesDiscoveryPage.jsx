import React, { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import AppLoader from "../../components/branding/AppLoader";
import ServiceHeroPanel from "../../components/services/ServiceHeroPanel";
import ServiceCategoryGrid from "../../components/services/ServiceCategoryGrid";
import { Loader2 } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  { key: "deep-cleaning", slug: "deep-cleaning", group_key: "facilities_services", name: "Deep Office Cleaning", short_description: "Carpet, upholstery, washroom, and workspace deep cleaning." },
  { key: "fumigation", slug: "fumigation", group_key: "facilities_services", name: "Fumigation Services", short_description: "Professional pest control and fumigation for offices." },
  { key: "printer-servicing", slug: "printer-servicing", group_key: "technical_support", name: "Printer Servicing", short_description: "Printer servicing, diagnostics, and maintenance support." },
  { key: "cctv-installation", slug: "cctv-installation", group_key: "technical_support", name: "CCTV Installation", short_description: "Security camera setup and installation services." },
  { key: "procurement-support", slug: "procurement-support", group_key: "business_support", name: "Procurement Support", short_description: "Structured sourcing and supply coordination for business clients." },
  { key: "uniform-tailoring", slug: "uniform-tailoring", group_key: "workwear_uniforms", name: "Uniform Tailoring", short_description: "Office uniforms and custom workwear sizing, production, and delivery." },
];

export default function AccountServicesDiscoveryPage() {
  const [categories, setCategories] = useState(defaultCategories);
  const [services, setServices] = useState(defaultServices);
  const [activeCategory, setActiveCategory] = useState("printing_branding");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to fetch service categories from API
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
        } catch (err) {
          console.log("Using default categories");
        }
        
        // Try to fetch services from API
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
        } catch (err) {
          console.log("Using default services");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-8" data-testid="account-services-discovery-page">
      <PageHeader
        title="Services"
        subtitle="All services remain visible when logged in, with direct account-mode request paths."
      />

      <ServiceHeroPanel accountMode={true} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <AppLoader text="Loading services..." size="md" />
        </div>
      ) : (
        <div className="space-y-10">
          <ServiceCategoryGrid
            categories={categories}
            services={services}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            accountMode={true}
          />
        </div>
      )}
    </div>
  );
}
