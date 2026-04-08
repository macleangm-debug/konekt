import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import KpiCard from "../../components/dashboard/KpiCard";
import SectionCard from "../../components/dashboard/SectionCard";
import SalesCommissionTable from "../../components/sales/SalesCommissionTable";
import ExpectedCommissionCard from "../../components/sales/ExpectedCommissionCard";
import MonthlyBreakdownTable from "../../components/sales/MonthlyBreakdownTable";
import { Loader2 } from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function SalesCommissionDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, ordersRes, monthlyRes] = await Promise.all([
        api.get("/api/staff/commissions/summary").catch(() => ({ data: { summary: {} } })),
        api.get("/api/staff/commissions/orders").catch(() => ({ data: { orders: [] } })),
        api.get("/api/staff/commissions/monthly").catch(() => ({ data: { months: [] } })),
      ]);
      setSummary(summaryRes.data?.summary || {});
      setOrders(ordersRes.data?.orders || []);
      setMonths(monthlyRes.data?.months || []);
    } catch (err) {
      console.error("Failed to load commission data", err);
    } finally {
      setLoading(false);
    }
  };

  // Find the first "expected" order for the ExpectedCommissionCard
  const expectedOrder = orders.find(o => o.commission_status === "expected");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="commission-loading">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="sales-commission-dashboard">
      {/* KPI Cards - TZS first */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Earned"
          value={money(summary?.total_earned)}
          helper="All time commission earned"
          accent="emerald"
        />
        <KpiCard
          label="Expected"
          value={money(summary?.expected)}
          helper="From open quotes/orders"
          accent="blue"
        />
        <KpiCard
          label="Pending Payout"
          value={money(summary?.pending_payout)}
          helper="Approved, not yet paid out"
          accent="amber"
        />
        <KpiCard
          label="Paid Out"
          value={money(summary?.paid_out)}
          helper="Already paid to you"
        />
      </div>

      {/* Commission Per Order + Expected Card */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <SectionCard
          title="Commission Per Order"
          subtitle="TZS commission for every order assigned to you. Commission status is independent from order status."
        >
          <SalesCommissionTable rows={orders} />
        </SectionCard>

        <div className="space-y-6">
          {expectedOrder && (
            <ExpectedCommissionCard
              quoteNumber={expectedOrder.order_number}
              finalPrice={expectedOrder.order_total}
              expectedCommission={expectedOrder.commission_amount}
              salesPct={expectedOrder.commission_pct}
            />
          )}
          <SectionCard
            title="How Commission Works"
            subtitle="Your commission comes from the distributable margin pool."
          >
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="text-emerald-600 font-bold">1.</span>
                You see expected commission early at quote/order stage.
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 font-bold">2.</span>
                Payout status is separate from order status.
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 font-bold">3.</span>
                Customer does not see internal margin or commission breakdown.
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <SectionCard
        title="Monthly Earnings"
        subtitle="Monthly commission breakdown with pending and paid amounts in TZS."
      >
        <MonthlyBreakdownTable months={months} />
      </SectionCard>
    </div>
  );
}
