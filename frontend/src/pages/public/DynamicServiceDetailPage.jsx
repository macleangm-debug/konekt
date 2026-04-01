import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import ServicePageTemplateV2 from "../../components/services/ServicePageTemplateV2";
import CantFindWhatYouNeedBanner from "../../components/public/CantFindWhatYouNeedBanner";
import { getServiceBySlug } from "../../data/comprehensiveServiceData";
import { ArrowLeft, Loader2 } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DynamicServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/service-catalog/types/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setService({
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

      // Fallback to comprehensive static data
      const found = getServiceBySlug(slug);
      if (found) {
        setService({
          key: found.slug,
          name: found.name,
          description: found.description,
          group_name: found.group,
          includes: found.includes || [],
          for_who: found.for_who || [],
          process_steps: found.process_steps || [],
          why_konekt: found.why_konekt || [],
          faqs: found.faqs || [],
          pricing_guidance: found.pricing_guidance,
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
            to="/marketplace?tab=services"
            className="inline-flex items-center gap-2 mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Services
          </Link>
          <div className="max-w-lg mx-auto mt-8">
            <CantFindWhatYouNeedBanner />
          </div>
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
            to="/marketplace?tab=services"
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
        <div className="max-w-6xl mx-auto mt-10 px-4">
          <CantFindWhatYouNeedBanner />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
