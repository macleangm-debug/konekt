import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { Loader2, User, Building, FileText, DollarSign, Phone, Mail } from "lucide-react";

export default function SalesQueuePage() {
  const [items, setItems] = useState([]);
  const [stage, setStage] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const stages = [
    { value: "", label: "All" },
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "quote_in_progress", label: "Quote in Progress" },
    { value: "quote_sent", label: "Quote Sent" },
    { value: "approved", label: "Approved" },
    { value: "handed_to_operations", label: "Handed to Ops" },
    { value: "closed_won", label: "Won" },
    { value: "closed_lost", label: "Lost" },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const query = stage ? `?stage=${encodeURIComponent(stage)}` : "";
        
        // Try sales opportunities endpoint first, fall back to guest leads
        let data = [];
        try {
          const res = await api.get(`/api/sales-opportunities/my-queue${query}`);
          data = res.data || [];
        } catch (err) {
          // Fall back to guest leads
          try {
            const leadsRes = await api.get(`/api/guest-leads${query ? `?status=${stage || 'new'}` : ''}`);
            data = (leadsRes.data || []).map(lead => ({
              id: lead.id,
              title: `${lead.intent_type?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Lead'} - ${lead.full_name}`,
              customer_name: lead.full_name,
              customer_email: lead.email,
              phone: lead.phone,
              company_name: lead.company_name,
              opportunity_type: "guest_lead",
              source: lead.source || "website",
              stage: lead.status || "new",
              intent_type: lead.intent_type,
              intent_payload: lead.intent_payload,
              created_at: lead.created_at,
            }));
          } catch (err2) {
            console.log("Neither endpoint available");
          }
        }
        
        setItems(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [stage]);

  const getOpportunityTypeBadge = (type) => {
    const types = {
      guest_lead: { bg: "bg-purple-50", text: "text-purple-700", label: "Guest Lead" },
      quote_request: { bg: "bg-blue-50", text: "text-blue-700", label: "Quote Request" },
      service_request: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Service Request" },
      business_pricing: { bg: "bg-[#F4E7BF]", text: "text-[#8B6A10]", label: "Business Pricing" },
      product_inquiry: { bg: "bg-slate-100", text: "text-slate-700", label: "Product Inquiry" },
    };
    return types[type] || types.guest_lead;
  };

  return (
    <div className="space-y-8" data-testid="sales-queue-page">
      <PageHeader
        title="Sales Queue"
        subtitle="See leads, quote requests, service requests, and business pricing opportunities in one view."
      />

      {/* Stage Filter */}
      <div className="flex flex-wrap gap-3">
        {stages.map((s) => (
          <button
            key={s.value || "all"}
            type="button"
            onClick={() => setStage(s.value)}
            data-testid={`stage-filter-${s.value || 'all'}`}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
              stage === s.value 
                ? "bg-[#20364D] text-white" 
                : "bg-white border text-slate-700 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
        </div>
      ) : items.length === 0 ? (
        <SurfaceCard className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-600 mb-2">No opportunities found</h3>
          <p className="text-slate-500">
            {stage ? `No items in "${stages.find(s => s.value === stage)?.label}" stage.` : "Your sales queue is empty."}
          </p>
        </SurfaceCard>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const typeBadge = getOpportunityTypeBadge(item.opportunity_type);
            
            return (
              <SurfaceCard key={item.id} data-testid={`queue-item-${item.id}`}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-[#20364D]" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-[#20364D]">{item.title}</div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          {item.customer_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {item.customer_name}
                            </span>
                          )}
                          {item.customer_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {item.customer_email}
                            </span>
                          )}
                          {item.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {item.phone}
                            </span>
                          )}
                        </div>
                        {item.company_name && (
                          <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                            <Building className="w-3 h-3" />
                            {item.company_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeBadge.bg} ${typeBadge.text}`}>
                        {typeBadge.label}
                      </span>
                      <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                        Source: {item.source || "website"}
                      </span>
                      <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                        Stage: {(item.stage || "new").replace(/_/g, " ")}
                      </span>
                      {item.business_pricing_requested && (
                        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-[#F4E7BF] text-[#8B6A10]">
                          <DollarSign className="w-3 h-3 inline mr-1" />
                          Business Pricing
                        </span>
                      )}
                      {item.affiliate_code && (
                        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                          Affiliate: {item.affiliate_code}
                        </span>
                      )}
                    </div>

                    {/* Products/Services */}
                    {((item.product_skus && item.product_skus.length > 0) || 
                      (item.service_keys && item.service_keys.length > 0)) && (
                      <div className="mt-4 text-sm text-slate-600">
                        {item.product_skus?.length > 0 && (
                          <div>Products: {item.product_skus.join(", ")}</div>
                        )}
                        {item.service_keys?.length > 0 && (
                          <div>Services: {item.service_keys.join(", ")}</div>
                        )}
                      </div>
                    )}

                    {/* Intent Payload Preview */}
                    {item.intent_payload && Object.keys(item.intent_payload).length > 0 && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                        <div className="font-medium text-slate-700 mb-1">Request Details:</div>
                        {Object.entries(item.intent_payload).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="capitalize">{key.replace(/_/g, " ")}:</span> {String(value).substring(0, 50)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Guided Questions Count */}
                    {item.sales_questions?.length > 0 && (
                      <div className="text-sm text-slate-600 mt-3">
                        Guided Questions: {item.sales_questions.length}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/staff/opportunities/${item.id}`)}
                      data-testid={`open-opportunity-${item.id}`}
                      className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#17283c] transition"
                    >
                      Open
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
