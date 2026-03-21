import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { Loader2, User, Building, FileText, DollarSign, Phone, Mail, TrendingUp, Clock, Target } from "lucide-react";

export default function SalesQueueIntelligencePage() {
  const [items, setItems] = useState([]);
  const [stage, setStage] = useState("");
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
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
        
        // Fetch queue items
        let data = [];
        try {
          const res = await api.get(`/api/sales-opportunities/my-queue${query}`);
          data = res.data || [];
        } catch (err) {
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
        
        // Fetch leaderboard
        try {
          const leaderRes = await api.get("/api/sales-intelligence/leaderboard");
          setLeaderboard(leaderRes.data || []);
        } catch (err) {
          console.log("Leaderboard not available");
        }
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

  // Calculate time since created (SLA indicator)
  const getTimeSince = (createdAt) => {
    if (!createdAt) return null;
    const created = new Date(createdAt);
    const now = new Date();
    const hours = Math.floor((now - created) / (1000 * 60 * 60));
    if (hours < 1) return "< 1h";
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="space-y-8" data-testid="sales-queue-intelligence-page">
      <PageHeader
        title="Sales Intelligence Queue"
        subtitle="See leads with smart assignment, efficiency scoring, and priority indicators."
      />

      {/* Leaderboard Quick View */}
      {leaderboard.length > 0 && (
        <SurfaceCard>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#D4A843]" />
            <div className="text-lg font-bold text-[#20364D]">Top Performers</div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaderboard.slice(0, 4).map((person, idx) => (
              <div key={person.sales_user_id} className="rounded-2xl border p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    idx === 0 ? "bg-[#D4A843]" : "bg-slate-400"
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-[#20364D]">{person.sales_name}</div>
                    <div className="text-sm text-slate-500">Score: {person.efficiency_score}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="text-slate-500">Close Rate: {person.close_rate}%</div>
                  <div className="text-slate-500">Workload: {person.open_workload}</div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

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
            const timeSince = getTimeSince(item.created_at);
            
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
                      {timeSince && (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 ${
                          parseInt(timeSince) > 24 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          <Clock className="w-3 h-3" />
                          {timeSince} ago
                        </span>
                      )}
                      {item.assigned_sales_name && (
                        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <Target className="w-3 h-3 inline mr-1" />
                          {item.assigned_sales_name}
                        </span>
                      )}
                      {item.business_pricing_requested && (
                        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-[#F4E7BF] text-[#8B6A10]">
                          <DollarSign className="w-3 h-3 inline mr-1" />
                          Business Pricing
                        </span>
                      )}
                    </div>

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
