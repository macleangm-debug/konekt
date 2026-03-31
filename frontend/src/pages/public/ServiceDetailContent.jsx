import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import BrandButton from "../../components/ui/BrandButton";
import ServicePageTemplate from "../../components/services/ServicePageTemplate";
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
        // Normalize for ServicePageTemplate
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
          faqs: data.faqs || [],
          pricing_guidance: data.pricing_guidance,
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
      <div className="max-w-7xl mx-auto px-6 py-10" data-testid="service-detail-loading">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
        </div>
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
    <div className="max-w-7xl mx-auto px-6 py-10" data-testid="service-detail-page">
      <div className="mb-6">
        <Link
          to={groupSlug ? `/services/${groupSlug}` : "/services"}
          className="inline-flex items-center text-slate-600 hover:text-[#20364D] transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {groupSlug || "services"}
        </Link>
      </div>

      <ServicePageTemplate service={service} />
    </div>
  );
}
