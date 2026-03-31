import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import ServicePageTemplateV2 from "../../components/services/ServicePageTemplateV2";
import { ArrowLeft, Loader2 } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Fallback service data if API doesn't have the service
const FALLBACK_SERVICES = {
  "printing-promotional-materials": {
    key: "printing-promotional-materials",
    slug: "printing-promotional-materials",
    group_key: "printing_branding",
    group_name: "Printing & Branding",
    name: "Printing & Promotional Materials",
    description: "Structured printing support for marketing, corporate, and event materials including branded collateral and promotional items.",
    includes: [
      "Business cards, flyers, brochures, and booklets",
      "Promotional items such as lanyards, name tags, diaries, and branded giveaways",
      "Artwork coordination, revisions, and print production follow-up",
    ],
    for_who: [
      "Businesses launching campaigns or events",
      "Teams that need recurring branded materials",
      "Organizations that want structured print coordination",
    ],
    process_steps: [
      { title: "Submit brief", description: "Share quantities, sizes, deadlines, and branding requirements." },
      { title: "Commercial review", description: "Konekt aligns pricing, feasibility, and production path." },
      { title: "Production", description: "Printing or branding execution starts with monitored follow-up." },
      { title: "Delivery", description: "Completed items are delivered or handed over according to plan." },
    ],
    why_konekt: [
      "Coordinated handling from brief to production",
      "Support across one-off and recurring needs",
      "Better visibility for business clients and teams",
    ],
    pricing_guidance: "Pricing depends on item type, quantity, finishing, branding complexity, and delivery requirements.",
    faqs: [
      { q: "Can Konekt handle both design and printing?", a: "Yes, Konekt can coordinate design support and the printing workflow together." },
      { q: "Can I request multiple item types in one brief?", a: "Yes, especially for campaign or event-related requirements." },
    ],
  },
  "office-branding": {
    key: "office-branding",
    slug: "office-branding",
    group_key: "printing_branding",
    group_name: "Printing & Branding",
    name: "Office Branding",
    description: "End-to-end coordination for workspace branding, graphics, directional signs, and branded visual identity inside the office.",
    includes: [
      "Wall branding and reception branding",
      "Directional graphics and internal signage",
      "Brand placement planning and installation support",
    ],
    for_who: [
      "Offices setting up or refreshing workspace identity",
      "Companies with branches and customer-facing premises",
      "Organizations needing coordinated branding execution",
    ],
    process_steps: [
      { title: "Discovery", description: "Konekt captures the office context and branding objective." },
      { title: "Site review", description: "Measurements, location context, and branding surfaces are reviewed." },
      { title: "Design + quote", description: "Commercial and design direction are aligned." },
      { title: "Installation", description: "Approved branding is produced and installed." },
    ],
    why_konekt: [
      "Structured coordination across design, production, and installation",
      "Suitable for one office or multiple branches",
      "Clearer client communication throughout the process",
    ],
    pricing_guidance: "Pricing depends on site size, materials, installation complexity, and branding coverage.",
    faqs: [
      { q: "Is a site visit required?", a: "In most office branding projects, yes — site review helps quote accurately." },
    ],
  },
  "showroom-design": {
    key: "showroom-design",
    slug: "showroom-design",
    group_key: "printing_branding",
    group_name: "Printing & Branding",
    name: "Showroom & Exhibition Design",
    description: "Coordination of showroom setup, exhibition booth graphics, branded display areas, and event-specific branding.",
    includes: [
      "Booth and stand design coordination",
      "Branded backdrops, banners, and display panels",
      "Event branding collateral and logistics support",
    ],
    for_who: [
      "Businesses exhibiting at trade shows or expos",
      "Companies setting up showrooms or pop-up spaces",
      "Teams coordinating conference or event branding",
    ],
    process_steps: [
      { title: "Brief", description: "Capture booth size, event context, branding assets, and timeline." },
      { title: "Design", description: "Visual concepts are produced for approval." },
      { title: "Production", description: "Approved materials go into production." },
      { title: "Setup & support", description: "On-site setup or delivery coordination." },
    ],
    why_konekt: [
      "One-stop coordination for exhibition branding",
      "From design to setup, tracked end to end",
      "Supports single events or multi-location rollouts",
    ],
    pricing_guidance: "Pricing depends on booth dimensions, materials, design complexity, and on-site requirements.",
    faqs: [
      { q: "Can Konekt manage the full event branding package?", a: "Yes — from design to production and setup coordination." },
    ],
  },
  "packaging-labels": {
    key: "packaging-labels",
    slug: "packaging-labels",
    group_key: "printing_branding",
    group_name: "Printing & Branding",
    name: "Packaging & Labels",
    description: "Custom packaging, product labels, and branded wrapping coordination for retail, food, industrial, or consumer use.",
    includes: [
      "Product labels and sticker printing",
      "Custom packaging design and production",
      "Branded wrapping, boxes, and bags",
    ],
    for_who: [
      "Product-based businesses needing branded packaging",
      "Food and beverage companies with labeling needs",
      "Retailers wanting consistent packaging standards",
    ],
    process_steps: [
      { title: "Requirement review", description: "Capture product specs, quantities, and branding elements." },
      { title: "Design alignment", description: "Packaging design or label artwork is coordinated." },
      { title: "Sampling", description: "Samples produced for approval before bulk run." },
      { title: "Production & delivery", description: "Bulk order produced and delivered." },
    ],
    why_konekt: [
      "Coordinated packaging across multiple SKUs",
      "Design and production managed through one point",
      "Scalable for growing brands",
    ],
    pricing_guidance: "Pricing depends on packaging type, material, print finish, and order volume.",
    faqs: [
      { q: "Can I get samples before committing?", a: "Yes — sampling is part of the standard workflow." },
    ],
  },
};

export default function DynamicServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Try API first
        const res = await fetch(`${API_URL}/api/service-catalog/types/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setService({
            ...data,
            key: data.key || data.slug || slug,
            name: data.name,
            description: data.description || data.short_description,
            group_name: data.group_name || data.category,
            includes: data.includes || [],
            for_who: data.for_who || [],
            process_steps: data.process_steps || [],
            why_konekt: data.why_konekt || [],
            faqs: data.faqs || [],
            pricing_guidance: data.pricing_guidance,
          });
          return;
        }
      } catch {}

      // Fallback to static data
      const found = FALLBACK_SERVICES[slug];
      if (found) {
        setService({
          ...found,
          key: found.key || found.slug || slug,
        });
      }
    };
    load().finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNavbarV2 />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNavbarV2 />
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-bold text-[#20364D]">Service Not Found</h1>
          <p className="text-slate-600 mt-3">The service you are looking for does not exist or has been removed.</p>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="dynamic-service-detail-page">
      <PublicNavbarV2 />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>
        <ServicePageTemplateV2
          slug={service.key || slug}
          title={service.name}
          overview={service.description}
          included={service.includes || []}
          idealFor={service.for_who || []}
          benefits={service.why_konekt || []}
          howItWorks={(service.process_steps || []).map((s) => s.title || s)}
          faqs={(service.faqs || []).map((f) => ({ question: f.q || f.question, answer: f.a || f.answer }))}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
