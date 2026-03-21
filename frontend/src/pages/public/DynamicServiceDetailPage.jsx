import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import ServicePageTemplate from "../../components/services/ServicePageTemplate";
import { toast } from "sonner";
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
    name: "Showroom Design",
    description: "Design and execution support for branded showrooms and display environments that present products or services more effectively.",
    includes: [
      "Showroom layout thinking and branding direction",
      "Display structures and branded surfaces",
      "Installation and finishing coordination",
    ],
    for_who: [
      "Retail and corporate environments",
      "Brands with physical display spaces",
      "Teams that want more professional merchandising presentation",
    ],
    process_steps: [
      { title: "Brief", description: "Discuss space purpose, customer journey, and display goals." },
      { title: "Site + design review", description: "Konekt aligns concept direction with physical context." },
      { title: "Commercial alignment", description: "Scope, pricing, materials, and timeline are confirmed." },
      { title: "Execution", description: "Production and installation are coordinated to completion." },
    ],
    why_konekt: [
      "Good fit for design + execution workflows",
      "Better coordination between branding and physical setup",
      "Useful for launch, refresh, or campaign spaces",
    ],
    pricing_guidance: "Pricing depends on concept scope, fabrication needs, materials, and installation conditions.",
    faqs: [
      { q: "Can this include signage and printed display material?", a: "Yes, showroom design can be combined with printing, signage, and branded materials." },
    ],
  },
  "billboard-signs": {
    key: "billboard-signs",
    slug: "billboard-signs",
    group_key: "printing_branding",
    group_name: "Printing & Branding",
    name: "Billboard Signs",
    description: "Large-format billboard signage coordination including branding, fabrication support, installation, and maintenance-oriented execution planning.",
    includes: [
      "Billboard sign production coordination",
      "Branding artwork and print surface handling",
      "Installation workflow and execution planning",
    ],
    for_who: [
      "Businesses with outdoor visibility needs",
      "Campaign teams and location-based promotions",
      "Organizations requiring branded public-facing signage",
    ],
    process_steps: [
      { title: "Requirement capture", description: "Discuss location, size, branding, and installation context." },
      { title: "Technical review", description: "Site conditions and structural needs are reviewed." },
      { title: "Quote + approval", description: "Commercial and execution scope is agreed." },
      { title: "Fabrication + install", description: "Billboard assets are produced and installed." },
    ],
    why_konekt: [
      "Combines branding coordination with execution planning",
      "Better visibility over outdoor signage workflow",
      "Useful for one-off campaign or long-term placement",
    ],
    pricing_guidance: "Pricing depends on billboard size, fabrication complexity, site location, and installation conditions.",
    faqs: [
      { q: "Does this require a site visit?", a: "In most cases yes, because billboard work is location and structure-dependent." },
    ],
  },
};

export default function DynamicServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuestLead, setShowGuestLead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadForm, setLeadForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    country: "Tanzania",
    region: "",
    need_summary: "",
  });
  
  const isLoggedIn = useMemo(() => Boolean(localStorage.getItem("konekt_token") || localStorage.getItem("token")), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Try to fetch from API
        let found = null;
        
        try {
          const res = await fetch(`${API_URL}/api/public-services/types`);
          if (res.ok) {
            const services = await res.json();
            found = services.find((x) => x.slug === slug || x.key === slug);
          }
        } catch (err) {
          console.log("Public services API not available");
        }
        
        // Try service catalog
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
        
        // Use fallback data if available
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

  const submitGuestLead = async (e) => {
    e.preventDefault();
    
    if (!leadForm.full_name || !leadForm.email || !leadForm.phone) {
      toast.error("Please fill in name, email, and phone");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/guest-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: leadForm.full_name,
          email: leadForm.email,
          phone: leadForm.phone,
          company: leadForm.company_name,
          country_code: leadForm.country === "Tanzania" ? "TZ" : leadForm.country,
          intent_type: "service_interest",
          intent_payload: {
            service_key: service?.key || slug,
            service_name: service?.name,
            region: leadForm.region,
            need_summary: leadForm.need_summary,
          },
          source: "website",
        }),
      });
      
      if (!res.ok) throw new Error("Failed to submit");
      
      toast.success("Your interest has been captured. Konekt will follow up with you.");
      setShowGuestLead(false);
      setLeadForm({
        full_name: "",
        email: "",
        phone: "",
        company_name: "",
        country: "Tanzania",
        region: "",
        need_summary: "",
      });
    } catch (err) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="text-slate-600 mt-3">The service you're looking for doesn't exist or has been removed.</p>
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
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link 
            to="/services" 
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>
        
        <ServicePageTemplate
          service={service}
          isLoggedIn={isLoggedIn}
          onGuestLeadClick={() => setShowGuestLead(true)}
          accountMode={false}
        />

        {/* Guest Lead Form */}
        {showGuestLead && (
          <form onSubmit={submitGuestLead} className="rounded-[2rem] border bg-white p-8 mt-8" data-testid="guest-lead-form">
            <div className="text-2xl font-bold text-[#20364D]">Leave your details</div>
            <p className="text-slate-600 mt-3">
              Not ready to create an account yet? Leave your details and Konekt can follow up on this service need.
            </p>

            <div className="grid gap-4 mt-6">
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Full name *" 
                value={leadForm.full_name} 
                onChange={(e) => setLeadForm({ ...leadForm, full_name: e.target.value })}
                data-testid="guest-fullname"
              />
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Email *" 
                type="email"
                value={leadForm.email} 
                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                data-testid="guest-email"
              />
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Phone *" 
                value={leadForm.phone} 
                onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                data-testid="guest-phone"
              />
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Company name (optional)" 
                value={leadForm.company_name} 
                onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                data-testid="guest-company"
              />
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Country" 
                value={leadForm.country} 
                onChange={(e) => setLeadForm({ ...leadForm, country: e.target.value })}
                data-testid="guest-country"
              />
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Region / city" 
                value={leadForm.region} 
                onChange={(e) => setLeadForm({ ...leadForm, region: e.target.value })}
                data-testid="guest-region"
              />
              <textarea 
                className="border rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Briefly describe what you need" 
                value={leadForm.need_summary} 
                onChange={(e) => setLeadForm({ ...leadForm, need_summary: e.target.value })}
                data-testid="guest-summary"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                type="submit" 
                disabled={submitting}
                className="rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition disabled:opacity-50"
                data-testid="submit-guest-lead-btn"
              >
                {submitting ? "Submitting..." : "Submit Details"}
              </button>
              <button 
                type="button"
                onClick={() => setShowGuestLead(false)}
                className="rounded-xl border px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </main>
      
      <PublicFooter />
    </div>
  );
}
