import React from "react";
import { Link } from "react-router-dom";
import { Globe, Users, Shield, Award, ArrowRight } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import BrandButton from "../../components/ui/BrandButton";
import { useBranding } from "../../contexts/BrandingContext";

export default function AboutPageContent() {
  const { brand_name } = useBranding();
  return (
    <div className="max-w-7xl mx-auto px-6 py-10" data-testid="about-page">
      <PageHeader 
        title={`About ${brand_name}`}
        subtitle="Business products, services, and delivery support through one connected platform."
      />

      {/* Mission Section */}
      <SurfaceCard className="bg-gradient-to-br from-[#20364D] to-[#1a2d40] text-white mb-12">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold">
            Built for modern African business operations
          </h2>
          <p className="text-slate-200 mt-4 text-lg">
            {brand_name} is a business operating system designed to help companies across Africa source products, 
            request services, and manage operations through one trusted platform. We combine ordering, 
            delivery, and service coordination to reduce friction and improve visibility.
          </p>
        </div>
      </SurfaceCard>

      {/* Values */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { icon: Globe, title: "Country-Aware", desc: "Localized availability and pricing for each market" },
          { icon: Users, title: "Business-Focused", desc: "Built for companies and procurement teams" },
          { icon: Shield, title: "Quality Controlled", desc: "Vetted partners under strict standards" },
          { icon: Award, title: "Scalable Model", desc: "Growing ecosystem across Africa" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <SurfaceCard key={item.title}>
              <div className="w-12 h-12 rounded-2xl bg-[#20364D]/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-[#20364D]" />
              </div>
              <h3 className="text-lg font-bold text-[#20364D]">{item.title}</h3>
              <p className="text-slate-600 mt-2">{item.desc}</p>
            </SurfaceCard>
          );
        })}
      </div>

      {/* What We Offer */}
      <div className="mb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-[#20364D] mb-6">What we offer</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <SurfaceCard>
            <h3 className="text-xl font-bold text-[#20364D] mb-3">Products</h3>
            <ul className="space-y-2 text-slate-600">
              <li>• Promotional products and corporate gifts</li>
              <li>• Office equipment and supplies</li>
              <li>• Stationery and consumables</li>
              <li>• Spare parts and accessories</li>
            </ul>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-xl font-bold text-[#20364D] mb-3">Services</h3>
            <ul className="space-y-2 text-slate-600">
              <li>• Printing and branded materials</li>
              <li>• Creative design and branding</li>
              <li>• Equipment maintenance</li>
              <li>• Installation and setup</li>
            </ul>
          </SurfaceCard>
        </div>
      </div>

      {/* Expansion */}
      <SurfaceCard className="bg-slate-50">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#20364D]">
              Expanding across Africa
            </h2>
            <p className="text-slate-600 mt-4">
              {brand_name} is growing through partnerships with local distributors and service providers. 
              If you're interested in expanding into your country, we'd love to hear from you.
            </p>
            <div className="mt-6">
              <BrandButton href="/launch-country" variant="primary">
                Partner with us
                <ArrowRight className="w-5 h-5 ml-2" />
              </BrandButton>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {["Tanzania", "Kenya", "Uganda", "Rwanda", "Nigeria", "Ghana"].map((country) => (
              <div key={country} className="rounded-2xl border bg-white p-4 text-center">
                <div className="font-medium text-[#20364D]">{country}</div>
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>

      {/* Contact */}
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold text-[#20364D] mb-4">Get in touch</h2>
        <p className="text-slate-600 mb-6">
          Questions about {brand_name}? We're here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <BrandButton href="mailto:info@konekt.co.tz" variant="primary">
            Email Us
          </BrandButton>
          <BrandButton href="/marketplace" variant="ghost">
            Browse Marketplace
          </BrandButton>
        </div>
      </div>
    </div>
  );
}
