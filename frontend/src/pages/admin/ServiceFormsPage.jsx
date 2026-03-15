import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { FileText, CheckCircle, XCircle } from "lucide-react";

export default function ServiceFormsPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/service-forms/admin");
        setServices(res.data || []);
      } catch (error) {
        console.error("Failed to load service forms:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categoryColors = {
    creative: "bg-purple-100 text-purple-800",
    maintenance: "bg-orange-100 text-orange-800",
    support: "bg-blue-100 text-blue-800",
    copywriting: "bg-green-100 text-green-800",
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2D3E50] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="service-forms-admin-page">
      <div className="max-w-none w-full space-y-6">
        <div className="text-left">
          <h1 className="text-4xl font-bold text-[#2D3E50]">Service Forms</h1>
          <p className="mt-2 text-slate-600">
            Manage dynamic service request schemas for creative, support, maintenance, and copywriting.
          </p>
        </div>

        <div className="grid xl:grid-cols-2 gap-4">
          {services.map((service) => (
            <div key={service.id} className="rounded-3xl border bg-white p-6 hover:shadow-md transition-shadow" data-testid={`admin-service-card-${service.slug}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[#2D3E50]">{service.title}</div>
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[service.category] || "bg-slate-100 text-slate-800"}`}>
                      {service.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {service.is_active ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-medium">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-medium">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 text-slate-600 text-sm line-clamp-2">{service.description}</div>

              <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Base Price</div>
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {service.currency} {Number(service.base_price || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Form Fields</div>
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {(service.form_schema || []).length} fields
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Add-ons</div>
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {(service.add_ons || []).length} options
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                {service.requires_payment && (
                  <span className="inline-flex px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
                    Requires Payment
                  </span>
                )}
                {service.requires_quote_review && (
                  <span className="inline-flex px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                    Quote Review
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {services.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-500 mt-4">No service forms found.</p>
            <p className="text-slate-400 text-sm mt-1">Run the seed script to populate service forms.</p>
          </div>
        )}
      </div>
    </div>
  );
}
