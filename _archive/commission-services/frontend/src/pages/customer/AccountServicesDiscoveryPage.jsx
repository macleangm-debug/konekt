import React, { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import ServiceHeroPanel from "../../components/services/ServiceHeroPanel";
import ServiceCategoryGrid from "../../components/services/ServiceCategoryGrid";

const categories = [
  { key: "printing_branding", name: "Printing & Branding" },
  { key: "creative_services", name: "Creative & Design" },
  { key: "facilities_services", name: "Facilities Services" },
  { key: "technical_support", name: "Technical Support" },
  { key: "business_support", name: "Business Support" },
  { key: "workwear_uniforms", name: "Uniforms & Workwear" },
];

const services = [
  { key: "printing", slug: "printing", group_key: "printing_branding", name: "Printing Services", short_description: "Cards, brochures, banners, labels, and branded print support." },
  { key: "office-branding", slug: "office-branding", group_key: "printing_branding", name: "Office Branding", short_description: "Workspace branding, wall graphics, signage, and installation." },
  { key: "graphic-design", slug: "graphic-design", group_key: "creative_services", name: "Graphic Design Support", short_description: "Design support for brand assets, documents, and campaigns." },
  { key: "deep-cleaning", slug: "deep-cleaning", group_key: "facilities_services", name: "Deep Office Cleaning", short_description: "Carpet, upholstery, washroom, and workspace deep cleaning." },
  { key: "printer-servicing", slug: "printer-servicing", group_key: "technical_support", name: "Printer Servicing", short_description: "Printer servicing, diagnostics, and maintenance support." },
  { key: "procurement-support", slug: "procurement-support", group_key: "business_support", name: "Procurement Support", short_description: "Structured sourcing and supply coordination for business clients." },
  { key: "uniform-tailoring", slug: "uniform-tailoring", group_key: "workwear_uniforms", name: "Uniform Tailoring", short_description: "Office uniforms and custom workwear sizing, production, and delivery." },
];

export default function AccountServicesDiscoveryPage() {
  const [activeCategory, setActiveCategory] = useState("printing_branding");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Services"
        subtitle="All services should remain visible when the client is logged in, with direct account-mode request paths."
      />

      <ServiceHeroPanel accountMode={true} />

      <div className="space-y-10">
        <ServiceCategoryGrid
          categories={categories}
          services={services}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          accountMode={true}
        />
      </div>
    </div>
  );
}
