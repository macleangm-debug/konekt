import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

export default function SalesQueuePage() {
  const [items, setItems] = useState([]);
  const [stage, setStage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const query = stage ? `?stage=${encodeURIComponent(stage)}` : "";
      const res = await api.get(`/api/sales-opportunities/my-queue${query}`);
      setItems(res.data || []);
    };
    load();
  }, [stage]);

  const stages = ["", "new", "contacted", "quote_in_progress", "quote_sent", "approved", "handed_to_operations", "closed_won", "closed_lost"];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales Queue"
        subtitle="See leads, quote requests, service requests, and business pricing opportunities in one view."
      />

      <div className="flex flex-wrap gap-3">
        {stages.map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setStage(s)}
            className={`rounded-full px-5 py-3 text-sm font-semibold ${
              stage === s ? "bg-[#20364D] text-white" : "bg-white border text-slate-700"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <SurfaceCard key={item.id}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <div className="text-xl font-bold text-[#20364D]">{item.title}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {(item.customer_name || item.customer_email)} {item.company_name ? `• ${item.company_name}` : ""}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                    {item.opportunity_type}
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                    source: {item.source}
                  </span>
                  {item.business_pricing_requested ? (
                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-[#F4E7BF] text-[#8B6A10]">
                      business pricing
                    </span>
                  ) : null}
                  {item.affiliate_code ? (
                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                      affiliate: {item.affiliate_code}
                    </span>
                  ) : null}
                </div>

                <div className="text-sm text-slate-600 mt-4">
                  Products: {(item.product_skus || []).join(", ") || "—"}
                </div>
                <div className="text-sm text-slate-600">
                  Services: {(item.service_keys || []).join(", ") || "—"}
                </div>
                <div className="text-sm text-slate-600 mt-3">
                  Guided Questions: {(item.sales_questions || []).length}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/staff/opportunities/${item.id}`)}
                  className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold"
                >
                  Open
                </button>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
