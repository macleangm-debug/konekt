import React, { useEffect, useState } from "react";
import { Shield, AlertTriangle, Check, Clock, FileText, Users, Package, Truck, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function HealthGauge({ score }) {
  const color = score >= 90 ? "#15803d" : score >= 70 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${score * 2.64} ${264 - score * 2.64}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-extrabold" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-[#20364D]">System Health</div>
        <div className="text-sm text-slate-500 mt-1">
          {score >= 90 ? "Excellent — all systems clean" : score >= 70 ? "Good — some issues to address" : "Needs attention — critical issues found"}
        </div>
      </div>
    </div>
  );
}

function IssueCard({ icon: Icon, title, count, severity, onViewDetails, accent }) {
  const colors = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    green: "border-green-200 bg-green-50",
    slate: "border-slate-200 bg-slate-50",
  };
  const accentColor = count > 0 ? (severity === "critical" ? "red" : "amber") : "green";
  return (
    <div className={`rounded-xl border p-4 ${colors[accentColor]}`} data-testid={`issue-card-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${count > 0 ? (severity === "critical" ? "text-red-600" : "text-amber-600") : "text-green-600"}`} />
          <div>
            <div className="text-sm font-semibold text-[#20364D]">{title}</div>
            <div className={`text-2xl font-extrabold mt-0.5 ${count > 0 ? (severity === "critical" ? "text-red-600" : "text-amber-600") : "text-green-600"}`}>
              {count}
            </div>
          </div>
        </div>
        {count > 0 && onViewDetails && (
          <Button variant="outline" size="sm" onClick={onViewDetails} className="text-xs">
            View <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailsList({ items, category, onClose }) {
  if (!items || items.length === 0) return <div className="text-sm text-slate-500 p-4">No records found.</div>;
  return (
    <div className="rounded-xl border bg-white overflow-hidden" data-testid="details-list">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
        <span className="text-sm font-semibold text-[#20364D] capitalize">{category.replace(/_/g, " ")}</span>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3 border-b last:border-b-0 text-sm hover:bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-[#20364D]">
                  {item.order_number || item.note_number || item.invoice_number || item.full_name || item.email || `Record ${i + 1}`}
                </span>
                {item.customer_name && <span className="text-slate-500 ml-2">{item.customer_name}</span>}
              </div>
              <Badge className="text-[10px]">{item.status || "—"}</Badge>
            </div>
            {item.created_at && <div className="text-xs text-slate-400 mt-0.5">{item.created_at.split("T")[0]}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DataIntegrityDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsCategory, setDetailsCategory] = useState(null);
  const [details, setDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = async () => {
    try {
      const r = await api.get("/api/admin/data-integrity/summary");
      setData(r.data);
    } catch { toast.error("Failed to load integrity data"); }
    finally { setLoading(false); }
  };

  const viewDetails = async (category) => {
    setLoadingDetails(true);
    setDetailsCategory(category);
    try {
      const r = await api.get(`/api/admin/data-integrity/details/${category}`);
      setDetails(r.data || []);
    } catch { setDetails([]); }
    finally { setLoadingDetails(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading integrity data...</div>;
  if (!data) return <div className="p-8 text-center text-slate-500">Failed to load data</div>;

  const c = data.categories || {};
  const comp = c.compliance || {};
  const ord = c.orders || {};
  const ful = c.fulfillment || {};

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="data-integrity-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Data Integrity</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor system health, missing data, and compliance gaps</p>
      </div>

      {/* Health Score */}
      <div className="rounded-2xl border bg-white p-6">
        <HealthGauge score={data.health_score} />
        <div className="mt-4 text-sm text-slate-500">
          {data.total_issues} total issues across {data.context?.total_customers || 0} customers, {data.context?.total_orders || 0} orders, {data.context?.total_invoices || 0} invoices
        </div>
      </div>

      {/* Issue Cards Grid */}
      <div>
        <h2 className="text-lg font-bold text-[#20364D] mb-3">Compliance</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <IssueCard icon={Users} title="Missing VRN" count={comp.missing_vrn || 0} severity="critical" onViewDetails={() => viewDetails("missing_vrn")} />
          <IssueCard icon={Users} title="Missing BRN" count={comp.missing_brn || 0} severity="critical" onViewDetails={() => viewDetails("missing_vrn")} />
          <IssueCard icon={FileText} title="Pending EFD" count={comp.pending_efd || 0} severity="warning" onViewDetails={() => viewDetails("pending_efd")} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-[#20364D] mb-3">Order Health</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <IssueCard icon={Package} title="Stuck Orders" count={ord.stuck_orders || 0} severity="warning" onViewDetails={() => viewDetails("stuck_orders")} />
          <IssueCard icon={Clock} title="Overdue Invoices" count={ord.overdue_invoices || 0} severity="critical" onViewDetails={() => viewDetails("overdue_invoices")} />
          <IssueCard icon={AlertTriangle} title="Orphan Orders" count={ord.orphan_orders || 0} severity="warning" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-[#20364D] mb-3">Fulfillment</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <IssueCard icon={Truck} title="Unconfirmed Deliveries" count={ful.unconfirmed_deliveries || 0} severity="warning" onViewDetails={() => viewDetails("unconfirmed_deliveries")} />
          <IssueCard icon={Check} title="Total Delivery Notes" count={ful.total_delivery_notes || 0} severity="none" />
          <IssueCard icon={Shield} title="Health Score" count={data.health_score} severity="none" />
        </div>
      </div>

      {/* Details Drawer */}
      {detailsCategory && (
        <div className="mt-4">
          {loadingDetails ? (
            <div className="text-sm text-slate-500 p-4">Loading details...</div>
          ) : (
            <DetailsList items={details} category={detailsCategory} onClose={() => setDetailsCategory(null)} />
          )}
        </div>
      )}
    </div>
  );
}
