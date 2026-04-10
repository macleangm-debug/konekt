import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import SurfaceCard from "../../components/ui/SurfaceCard";
import BrandButton from "../../components/ui/BrandButton";
import CanonicalServicePage from "../../components/services/CanonicalServicePage";
import { getServiceBySlug, getServiceDetail } from "../../lib/serviceCatalogApi";

export default function ServiceDetailContent() {
  const { groupSlug, serviceSlug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchService() {
      try {
        setLoading(true);
        let data;
        try {
          data = await getServiceBySlug(serviceSlug);
        } catch {
          data = await getServiceDetail(serviceSlug);
        }
        setService({
          ...data,
          key: data.key || data.slug || serviceSlug,
          slug: data.slug || serviceSlug,
          group_key: data.group_key || groupSlug,
          group_name: data.group_name || groupSlug,
          name: data.name,
          description: data.description || data.short_description,
          includes: data.includes || [],
          for_who: data.for_who || [],
          process_steps: data.process_steps || [],
          why_konekt: data.why_konekt || [],
          use_cases: data.use_cases || [],
          faqs: data.faqs || [],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [serviceSlug, groupSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="service-detail-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10" data-testid="service-detail-error">
        <SurfaceCard className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold text-[#20364D] mb-2">Service Not Found</h2>
          <p className="text-slate-600 mb-6">{error || "The requested service does not exist."}</p>
          <BrandButton onClick={() => navigate(groupSlug ? `/services/${groupSlug}` : "/services")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </BrandButton>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div data-testid="service-detail-page">
      <CanonicalServicePage
        slug={service.key || serviceSlug}
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
    </div>
  );
}
