import React, { useState } from "react";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/public/PublicFooter";
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

export default function ServicesPageImproved() {
  const [activeCategory, setActiveCategory] = useState("printing_branding");

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbarV2 />
      <main>
        <ServiceHeroPanel accountMode={false} />

        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="space-y-10">
            <div>
              <div className="text-2xl font-bold text-[#20364D]">Featured and categorized services</div>
              <p className="text-slate-600 mt-2">
                Stronger hierarchy, clearer card design, and faster next steps for quote or request.
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
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
