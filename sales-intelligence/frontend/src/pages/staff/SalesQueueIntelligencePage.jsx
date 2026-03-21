import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

export default function SalesQueueIntelligencePage() {
  const [items, setItems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [queueRes, leadersRes] = await Promise.all([
        api.get("/api/sales-opportunities/my-queue"),
        api.get("/api/sales-intelligence/leaderboard"),
      ]);
      setItems(queueRes.data || []);
      setLeaderboard(leadersRes.data || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales Queue + Opportunity Intelligence"
        subtitle="See assigned work, source quality, guided sales context, and staff performance signals together."
      />

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">Assigned Opportunities</div>
          <div className="space-y-4 mt-6">
            {items.length ? items.map((item) => (
              <div key={item.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="text-lg font-bold text-[#20364D]">{item.title}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {(item.customer_name || item.customer_email)} • {item.source} • {item.stage}
                </div>
                <div className="text-sm text-slate-600 mt-3">
                  Products: {(item.product_skus || []).join(", ") || "—"}
                </div>
                <div className="text-sm text-slate-600">
                  Services: {(item.service_keys || []).join(", ") || "—"}
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Guided Questions: {(item.sales_questions || []).length}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border bg-slate-50 p-6 text-slate-600">No opportunities assigned yet.</div>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">Team Leaderboard</div>
          <div className="space-y-3 mt-6">
            {leaderboard.map((person, idx) => (
              <div key={person.sales_user_id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-[#20364D]">{idx + 1}. {person.sales_name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Close Rate: {person.close_rate}% • Workload: {person.open_workload}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-[#20364D]">{person.efficiency_score}</div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
