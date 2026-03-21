import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

export default function StaffPerformanceDashboardPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/api/staff-performance/sales").then((res) => setRows(res.data || []));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Staff Performance Dashboard"
        subtitle="Review performance, workload, close rate, and efficiency signals for sales staff."
      />

      <SurfaceCard>
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.sales_user_id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-[#20364D]">{row.sales_name}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Close Rate: {row.close_rate}% • Response Score: {row.response_speed_score} • Customer Score: {row.customer_rating_score}
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#20364D]">{row.efficiency_score}</div>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
