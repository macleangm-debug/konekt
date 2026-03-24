import React from "react";
import { ArrowRight, Palette } from "lucide-react";

export default function ServiceCardGrid({ services = [], onOpen }) {
  if (!services.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
        <Palette className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <div className="text-sm text-[#64748b]">No services available yet</div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="service-card-grid">
      {services.map((service) => (
        <button
          key={service.service_key}
          type="button"
          onClick={() => onOpen(service)}
          className="text-left rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
          data-testid={`service-card-${service.service_key}`}
        >
          <h3 className="text-lg font-semibold text-[#0f172a]">{service.service_name}</h3>
          <p className="text-sm text-[#64748b] mt-2 leading-relaxed line-clamp-3">
            {service.short_description || "Request a quote for this service through a guided form."}
          </p>
          <div className="flex items-center gap-2 mt-4 text-sm font-semibold text-[#1f3a5f] group-hover:text-[#0f172a] transition-colors">
            Request Quote
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      ))}
    </div>
  );
}
