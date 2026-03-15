import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Palette, Wrench, HeadphonesIcon, PenTool } from "lucide-react";

const CATEGORY_ICONS = {
  creative: Palette,
  maintenance: Wrench,
  support: HeadphonesIcon,
  copywriting: PenTool,
};

const CATEGORY_LABELS = {
  creative: "Creative Services",
  maintenance: "Equipment Maintenance",
  support: "Technical Support",
  copywriting: "Copywriting Services",
};

export default function ServicesHubPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/service-forms/public");
        setServices(res.data || []);
      } catch (error) {
        console.error("Failed to load services:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = {
      creative: [],
      maintenance: [],
      support: [],
      copywriting: [],
    };

    for (const item of services) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [services]);

  const renderSection = (category, items) => {
    if (!items?.length) return null;

    const Icon = CATEGORY_ICONS[category] || Palette;
    const title = CATEGORY_LABELS[category] || category;

    return (
      <section className="space-y-5" data-testid={`services-section-${category}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D3E50]/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#2D3E50]" />
          </div>
          <h2 className="text-3xl font-bold text-[#2D3E50]">{title}</h2>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((service) => (
            <div 
              key={service.id} 
              className="rounded-3xl border bg-white p-6 hover:shadow-lg transition-shadow"
              data-testid={`service-card-${service.slug}`}
            >
              <div className="text-xl font-bold text-[#2D3E50]">{service.title}</div>
              <p className="text-slate-600 mt-2 text-sm line-clamp-2">{service.description}</p>
              <div className="text-sm font-medium mt-4 text-slate-700">
                From {service.currency} {Number(service.base_price || 0).toLocaleString()}
              </div>
              <Link
                to={`/services/${service.slug}/request`}
                className="inline-flex mt-5 rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold hover:bg-[#1e2d3d] transition-colors"
                data-testid={`start-request-${service.slug}`}
              >
                Start Request
              </Link>
            </div>
          ))}
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[400px]" data-testid="services-hub-loading">
        <div className="w-8 h-8 border-4 border-[#2D3E50] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10" data-testid="services-hub-page">
      <div className="text-left">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2D3E50]">Professional Services</h1>
        <p className="text-slate-600 mt-3 max-w-3xl text-lg">
          Request creative services, office machine maintenance, technical support, and business copywriting with structured briefs that help our team serve you faster.
        </p>
      </div>

      {renderSection("creative", grouped.creative)}
      {renderSection("maintenance", grouped.maintenance)}
      {renderSection("support", grouped.support)}
      {renderSection("copywriting", grouped.copywriting)}

      {services.length === 0 && (
        <div className="text-center py-12" data-testid="no-services">
          <p className="text-slate-500 text-lg">No services available at the moment.</p>
        </div>
      )}
    </div>
  );
}
