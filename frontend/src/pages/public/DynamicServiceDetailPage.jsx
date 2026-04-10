import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PremiumFooterV2 from "../../components/public/PremiumFooterV2";
import CanonicalServicePage from "../../components/services/CanonicalServicePage";
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
            use_cases: data.use_cases || [],
            faqs: data.faqs || [],
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
          use_cases: found.use_cases || [],
          faqs: found.faqs || [],
        });
      }
    };
    load().finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PublicNavbarV2 />
        <div className="flex-1 flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
        </div>
        <PremiumFooterV2 />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PublicNavbarV2 />
        <div className="flex-1 max-w-4xl mx-auto px-6 py-16 text-center">
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
        <PremiumFooterV2 />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" data-testid="dynamic-service-detail-page">
      <PublicNavbarV2 />
      <main className="flex-1">
        <CanonicalServicePage
          slug={service.key || slug}
          title={service.name}
          description={service.description}
          groupName={service.group_name}
          includes={service.includes}
          audience={service.for_who}
          process={service.process_steps}
          benefits={service.why_konekt}
          useCases={service.use_cases}
          faqs={service.faqs}
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <CantFindWhatYouNeedBanner />
        </div>
      </main>
      <PremiumFooterV2 />
    </div>
  );
}
