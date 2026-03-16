import React, { useEffect, useState } from "react";
import { Package, Layers, Truck, Receipt } from "lucide-react";
import partnerApi from "../../lib/partnerApi";

export default function PartnerDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await partnerApi.get("/api/partner-portal/dashboard");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-red-500">Failed to load dashboard data</div>
      </div>
    );
  }

  const { partner, summary } = data;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partner-dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-[#20364D]">
          Welcome, {partner?.name || "Partner"}
        </h1>
        <p className="mt-2 text-slate-600">
          Manage your Konekt catalog allocation, fulfill orders, and track settlements.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Catalog Items"
          value={summary.catalog_count || 0}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Layers}
          label="Active Allocations"
          value={summary.active_allocations || 0}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={Truck}
          label="Pending Fulfillment"
          value={summary.pending_fulfillment || 0}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Receipt}
          label="Settlement Estimate"
          value={`TZS ${Number(summary.settlement_total_estimate || 0).toLocaleString()}`}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Partner Info Card */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold text-[#20364D] mb-4">Partner Information</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem label="Partner Type" value={partner?.partner_type || "-"} />
          <InfoItem label="Country" value={partner?.country_code || "-"} />
          <InfoItem label="Regions" value={(partner?.regions || []).join(", ") || "-"} />
          <InfoItem label="Lead Time" value={`${partner?.lead_time_days || 0} days`} />
          <InfoItem label="Settlement Terms" value={partner?.settlement_terms || "-"} />
          <InfoItem label="Status" value={partner?.status || "-"} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold text-[#20364D] mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <ActionCard
            href="/partner/catalog"
            title="Add Catalog Item"
            description="Add a new product or service to your Konekt catalog"
          />
          <ActionCard
            href="/partner/bulk-upload"
            title="Bulk Upload"
            description="Upload multiple items via JSON or CSV"
          />
          <ActionCard
            href="/partner/fulfillment"
            title="View Fulfillment Queue"
            description="Check and process pending fulfillment jobs"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-3xl border bg-white p-5" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="font-medium mt-0.5 capitalize">{value}</div>
    </div>
  );
}

function ActionCard({ href, title, description }) {
  return (
    <a
      href={href}
      className="block rounded-2xl border p-5 hover:border-[#20364D] hover:shadow-sm transition"
      data-testid={`action-${title.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="font-semibold text-[#20364D]">{title}</div>
      <div className="text-sm text-slate-500 mt-1">{description}</div>
    </a>
  );
}
