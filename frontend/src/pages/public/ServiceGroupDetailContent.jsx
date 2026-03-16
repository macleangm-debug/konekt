import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Clock, CheckCircle, Package, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import BrandButton from "../../components/ui/BrandButton";
import { getServiceTypes, getServiceGroups } from "../../lib/serviceCatalogApi";

export default function ServiceGroupDetailContent() {
  const { groupSlug } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [groups, types] = await Promise.all([
          getServiceGroups(),
          getServiceTypes(),
        ]);

        // Find the group by slug or key
        const foundGroup = groups.find(g => g.slug === groupSlug || g.key === groupSlug);
        if (foundGroup) {
          setGroup(foundGroup);
          // Filter services for this group
          const groupServices = types.filter(t => t.group_key === foundGroup.key);
          setServices(groupServices);
        } else {
          setError("Service category not found");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [groupSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10" data-testid="service-group-loading">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10" data-testid="service-group-error">
        <SurfaceCard className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold text-[#20364D] mb-2">Service Category Not Found</h2>
          <p className="text-slate-600 mb-6">{error || "The requested service category does not exist."}</p>
          <BrandButton onClick={() => navigate("/services")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </BrandButton>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" data-testid="service-group-page">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/services" className="inline-flex items-center text-slate-600 hover:text-[#20364D] transition">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to all services
        </Link>
      </div>

      <PageHeader 
        title={group.name}
        subtitle={group.description}
      />

      {/* Services Grid */}
      {services.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {services.map((service) => (
            <SurfaceCard 
              key={service.id || service.key} 
              className="hover:shadow-lg transition cursor-pointer group"
              data-testid={`service-card-${service.key}`}
            >
              <div className="flex flex-col h-full">
                <h3 className="text-lg font-bold text-[#20364D] group-hover:text-[#B8860B] transition">
                  {service.name}
                </h3>
                <p className="text-slate-600 mt-2 flex-1 line-clamp-3">
                  {service.short_description || service.description}
                </p>
                
                {/* Service Mode Badge */}
                <div className="mt-4 flex items-center gap-2 text-sm">
                  {service.site_visit_required && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Site Visit
                    </span>
                  )}
                  {service.has_product_blanks && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Products
                    </span>
                  )}
                </div>

                {/* Pricing Info */}
                {service.pricing_mode && (
                  <div className="mt-3 text-sm text-slate-500">
                    {service.pricing_mode === "fixed" && service.base_price > 0 && (
                      <span>From TZS {service.base_price.toLocaleString()}</span>
                    )}
                    {service.pricing_mode === "visit_fee" && service.visit_fee > 0 && (
                      <span>Visit Fee: TZS {service.visit_fee.toLocaleString()}</span>
                    )}
                    {service.pricing_mode === "quote" && (
                      <span>Quote-based pricing</span>
                    )}
                  </div>
                )}

                <Link 
                  to={`/services/${groupSlug}/${service.slug || service.key}`}
                  className="inline-flex items-center gap-1 mt-4 font-semibold text-[#20364D] hover:text-[#B8860B] transition"
                >
                  Request Service
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </SurfaceCard>
          ))}
        </div>
      ) : (
        <SurfaceCard className="text-center py-12 mt-8">
          <Package className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-[#20364D] mb-2">No services available yet</h3>
          <p className="text-slate-600">Services in this category are coming soon.</p>
        </SurfaceCard>
      )}

      {/* Why Choose Us */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-[#20364D] mb-6">Why choose Konekt?</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { title: "Quality Assurance", desc: "Rigorous quality checks at every stage" },
            { title: "Fast Turnaround", desc: "Quick delivery without compromising quality" },
            { title: "Competitive Pricing", desc: "Best value for your business needs" },
            { title: "Expert Support", desc: "Dedicated team to assist you" },
          ].map((item, idx) => (
            <SurfaceCard key={idx} className="text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-semibold text-[#20364D]">{item.title}</h4>
              <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </div>
  );
}
