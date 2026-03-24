import React from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function ServiceDetailShowcase({ service, onBack, children }) {
  if (!service) return null;

  const highlights = service.highlights || ["Fast response", "Professional coordination", "Quote tailored to your needs"];

  return (
    <div className="space-y-6" data-testid="service-detail-showcase">
      <button
        onClick={onBack}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#0f172a] hover:bg-[#f8fafc] transition-colors"
        data-testid="back-to-services-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Services
      </button>

      <div className="rounded-xl bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{service.service_name}</h2>
        <p className="text-white/60 mt-3 max-w-3xl text-sm leading-relaxed">
          {service.long_description || "Tell us what you need and the assigned sales team member will prepare the right quotation for you."}
        </p>

        <div className="grid md:grid-cols-3 gap-3 mt-6">
          {highlights.map((item, idx) => (
            <div key={idx} className="rounded-lg bg-white/10 p-4 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-[#f4c430] flex-shrink-0" />
              <span className="text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
