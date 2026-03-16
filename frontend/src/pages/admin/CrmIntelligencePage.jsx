import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function CrmIntelligencePage() {
  const [dashboard, setDashboard] = useState(null);
  const [sales, setSales] = useState(null);
  const [marketing, setMarketing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [crmRes, salesRes, marketingRes] = await Promise.all([
        api.get("/api/admin/crm-intelligence/dashboard"),
        api.get("/api/admin/sales-kpis/summary"),
        api.get("/api/admin/marketing-performance/sources"),
      ]);

      setDashboard(crmRes.data);
      setSales(salesRes.data);
      setMarketing(marketingRes.data);
    } catch (error) {
      console.error("Failed to load CRM intelligence:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="p-10" data-testid="loading-state">Loading CRM intelligence...</div>;
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="crm-intelligence-page">
      <div className="text-left">
        <h1 className="text-4xl font-bold">CRM, Sales & Marketing Intelligence</h1>
        <p className="mt-2 text-slate-600">
          Track pipeline health, follow-ups, sales performance, and source quality.
        </p>
      </div>

      {dashboard && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="summary-cards">
          <StatCard label="Total Leads" value={dashboard.summary?.total_leads || 0} testId="stat-total-leads" />
          <StatCard label="Won" value={dashboard.summary?.won || 0} testId="stat-won" />
          <StatCard label="Lost" value={dashboard.summary?.lost || 0} testId="stat-lost" />
          <StatCard label="Quote Sent" value={dashboard.summary?.quote_sent || 0} testId="stat-quote-sent" />
          <StatCard label="Overdue Follow-ups" value={dashboard.summary?.overdue_followups || 0} testId="stat-overdue" highlight />
          <StatCard label="Stale Leads" value={dashboard.summary?.stale_leads || 0} testId="stat-stale" highlight />
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        {sales && (
          <Panel title="Sales Summary" testId="sales-summary-panel">
            <MetricRow label="Leads" value={sales.lead_count || 0} />
            <MetricRow label="Won" value={sales.won_count || 0} />
            <MetricRow label="Lost" value={sales.lost_count || 0} />
            <MetricRow label="Quotes" value={sales.quote_count || 0} />
            <MetricRow label="Revenue" value={`TZS ${Number(sales.total_revenue || 0).toLocaleString()}`} />
            <MetricRow label="Conversion Rate" value={`${sales.conversion_rate || 0}%`} />
          </Panel>
        )}

        {dashboard && (
          <Panel title="Pipeline by Stage" testId="pipeline-panel">
            {Object.entries(dashboard.by_stage || {}).map(([stage, count]) => (
              <MetricRow key={stage} label={stage.replace(/_/g, " ")} value={count} />
            ))}
            {Object.keys(dashboard.by_stage || {}).length === 0 && (
              <div className="text-slate-500 text-sm">No leads in pipeline yet</div>
            )}
          </Panel>
        )}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        {dashboard && (
          <Panel title="Lead Sources" testId="sources-panel">
            {Object.entries(dashboard.by_source || {}).map(([source, count]) => (
              <MetricRow key={source} label={source} value={count} />
            ))}
            {Object.keys(dashboard.by_source || {}).length === 0 && (
              <div className="text-slate-500 text-sm">No source data yet</div>
            )}
          </Panel>
        )}

        {marketing && (
          <Panel title="Marketing Source Performance" testId="marketing-panel">
            {Object.entries(marketing || {}).map(([source, data]) => (
              <div key={source} className="rounded-2xl border bg-slate-50 p-4 mb-3">
                <div className="font-semibold">{source}</div>
                <div className="text-sm text-slate-600 mt-2">Leads: {data.leads}</div>
                <div className="text-sm text-slate-600">Quotes: {data.quotes}</div>
                <div className="text-sm text-slate-600">Won: {data.won}</div>
              </div>
            ))}
            {Object.keys(marketing || {}).length === 0 && (
              <div className="text-slate-500 text-sm">No marketing data yet</div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, testId, highlight }) {
  return (
    <div 
      className={`rounded-3xl border bg-white p-5 ${highlight && value > 0 ? 'border-amber-300 bg-amber-50' : ''}`}
      data-testid={testId}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${highlight && value > 0 ? 'text-amber-700' : ''}`}>{value}</div>
    </div>
  );
}

function Panel({ title, children, testId }) {
  return (
    <div className="rounded-3xl border bg-white p-6" data-testid={testId}>
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-5 space-y-2">{children}</div>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-slate-600 capitalize">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
