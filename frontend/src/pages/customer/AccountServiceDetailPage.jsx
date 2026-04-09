import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLoader from "../../components/branding/AppLoader";
import ServicePageTemplate from "../../components/services/ServicePageTemplate";
import PageHeader from "../../components/ui/PageHeader";
import { Loader2, ArrowLeft } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Fallback service data
const FALLBACK_SERVICES = {
  "printing-promotional-materials": {
    key: "printing-promotional-materials",
    slug: "printing-promotional-materials",
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
      { title: "Commercial review", description: "We align pricing, feasibility, and production path." },
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
      { q: "Can you handle both design and printing?", a: "Yes, we can coordinate design support and the printing workflow together." },
      { q: "Can I request multiple item types in one brief?", a: "Yes, especially for campaign or event-related requirements." },
    ],
  },
  "office-branding": {
    key: "office-branding",
    slug: "office-branding",
    group_name: "Printing & Branding",
    name: "Office Branding",
    description: "End-to-end coordination for workspace branding, graphics, directional signs, and branded visual identity inside the office.",
    includes: ["Wall branding and reception branding", "Directional graphics and internal signage", "Brand placement planning and installation support"],
    for_who: ["Offices setting up or refreshing workspace identity", "Companies with branches and customer-facing premises", "Organizations needing coordinated branding execution"],
    process_steps: [
      { title: "Discovery", description: "We capture the office context and branding objective." },
      { title: "Site review", description: "Measurements, location context, and branding surfaces are reviewed." },
      { title: "Design + quote", description: "Commercial and design direction are aligned." },
      { title: "Installation", description: "Approved branding is produced and installed." },
    ],
    why_konekt: ["Structured coordination across design, production, and installation", "Suitable for one office or multiple branches", "Clearer client communication throughout the process"],
    pricing_guidance: "Pricing depends on site size, materials, installation complexity, and branding coverage.",
    faqs: [{ q: "Is a site visit required?", a: "In most office branding projects, yes — site review helps quote accurately." }],
  },
};

export default function AccountServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let found = null;
        
        // Try API endpoints
        try {
          const res = await fetch(`${API_URL}/api/public-services/types`);
          if (res.ok) {
            const services = await res.json();
            found = services.find((x) => x.slug === slug || x.key === slug);
          }
        } catch (err) {
          console.log("Public services API not available");
        }
        
        if (!found) {
          try {
            const res = await fetch(`${API_URL}/api/service-catalog/services`);
            if (res.ok) {
              const services = await res.json();
              found = services.find((x) => x.slug === slug || x.key === slug);
            }
          } catch (err) {
            console.log("Service catalog API not available");
          }
        }
        
        // Use fallback
        if (!found && FALLBACK_SERVICES[slug]) {
          found = FALLBACK_SERVICES[slug];
        }
        
        if (found) {
          setService({
            ...found,
            key: found.key || found.slug || slug,
            name: found.name,
            description: found.description || found.short_description,
            group_name: found.group_name || found.category,
            includes: found.includes || [],
            for_who: found.for_who || [],
            process_steps: found.process_steps || [],
            why_konekt: found.why_konekt || [],
            faqs: found.faqs || [],
            pricing_guidance: found.pricing_guidance,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="account-service-loading">
        <AppLoader text="Loading service details..." size="md" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="space-y-8" data-testid="account-service-not-found">
        <PageHeader title="Service Not Found" subtitle="The service you're looking for doesn't exist." />
        <div className="text-center">
          <Link 
            to="/account/services" 
            className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="account-service-detail-page">
      <div className="flex items-center justify-between">
        <PageHeader
          title={service.name}
          subtitle="You are in account mode, so you can go directly into the structured service request or business pricing flow."
        />
        <Link 
          to="/account/services" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Services
        </Link>
      </div>

      <ServicePageTemplate
        service={service}
        isLoggedIn={true}
        accountMode={true}
      />
    </div>
  );
}
