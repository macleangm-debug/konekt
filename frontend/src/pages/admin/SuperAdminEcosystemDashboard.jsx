import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  TrendingUp, Users, Globe, AlertTriangle, DollarSign, 
  ShoppingBag, Wrench, Building2, Loader2, ArrowRight, FileCheck
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function SuperAdminEcosystemDashboard() {
  const [overview, setOverview] = useState(null);
  const [partners, setPartners] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [countries, setCountries] = useState([]);
  const [atRisk, setAtRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("admin_token");

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [overviewRes, partnerRes, affiliateRes, countryRes, riskRes] = await Promise.all([
        fetch(`${API}/api/admin/ecosystem-dashboard/overview`, { headers }),
        fetch(`${API}/api/admin/ecosystem-dashboard/partner-summary`, { headers }),
        fetch(`${API}/api/admin/ecosystem-dashboard/affiliate-summary`, { headers }),
        fetch(`${API}/api/admin/ecosystem-dashboard/country-summary`, { headers }),
        fetch(`${API}/api/admin/ecosystem-dashboard/at-risk-items`, { headers }),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (partnerRes.ok) setPartners(await partnerRes.json());
      if (affiliateRes.ok) setAffiliates(await affiliateRes.json());
      if (countryRes.ok) setCountries(await countryRes.json());
      if (riskRes.ok) setAtRisk(await riskRes.json());
    } catch (error) {
      console.error(error);
      toast.error("Failed to load ecosystem data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const totalAtRisk = (atRisk?.delayed_jobs?.length || 0) + (atRisk?.issue_jobs?.length || 0) + 
                      (atRisk?.overdue_invoices?.length || 0) + (atRisk?.stale_quotes?.length || 0);

  return (
    <div className="p-6 space-y-6" data-testid="ecosystem-dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ecosystem Control Dashboard</h1>
        <p className="text-slate-500">One screen to control revenue, partners, affiliates, country expansion, and operational risk.</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard 
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Revenue"
          value={`TZS ${Number(overview?.total_revenue || 0).toLocaleString()}`}
          href="/admin/invoices"
          color="green"
        />
        <MetricCard 
          icon={<ShoppingBag className="w-5 h-5" />}
          label="Orders"
          value={overview?.total_orders || 0}
          href="/admin/orders"
          color="blue"
        />
        <MetricCard 
          icon={<Wrench className="w-5 h-5" />}
          label="Service Requests"
          value={overview?.total_service_requests || 0}
          href="/admin/service-requests"
          color="purple"
        />
        <MetricCard 
          icon={<Users className="w-5 h-5" />}
          label="Active Partners"
          value={overview?.active_partners || 0}
          href="/admin/partner-performance"
          color="amber"
        />
        <MetricCard 
          icon={<Globe className="w-5 h-5" />}
          label="Live Countries"
          value={overview?.live_countries || 0}
          href="/admin/setup"
          color="teal"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4">
        <SmallMetric label="Affiliates" value={overview?.active_affiliates || 0} href="/admin/affiliates" />
        <SmallMetric label="Contract Clients" value={overview?.active_contract_clients || 0} href="/admin/contract-clients" />
        <SmallMetric label="Quote Conv. Rate" value={`${overview?.quote_conversion_rate || 0}%`} href="/admin/quotes" />
        <SmallMetric label="Delayed Jobs" value={overview?.delayed_jobs || 0} href="/admin/sla-alerts" highlight={overview?.delayed_jobs > 0} />
        <SmallMetric label="Issue Jobs" value={overview?.issue_jobs || 0} href="/admin/sla-alerts" highlight={overview?.issue_jobs > 0} />
        <SmallMetric label="Payment Proofs" value={overview?.pending_payment_proofs || 0} href="/admin/payment-proofs" highlight={overview?.pending_payment_proofs > 0} />
      </div>

      {/* At-Risk Alert */}
      {totalAtRisk > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <span className="font-semibold text-red-700">{totalAtRisk} items need immediate attention</span>
              <span className="text-red-600 ml-2 text-sm">
                ({atRisk?.delayed_jobs?.length || 0} delayed, {atRisk?.issue_jobs?.length || 0} issues, 
                {atRisk?.overdue_invoices?.length || 0} overdue invoices, {atRisk?.stale_quotes?.length || 0} stale quotes)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        {/* Top Partners */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Top Partners</h2>
            <Link to="/admin/partner-performance" className="text-sm text-[#D4A843] hover:underline">View All</Link>
          </div>
          
          {partners.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No partners yet</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {partners.slice(0, 8).map((partner, idx) => (
                <div key={partner.partner_id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        idx < 3 ? "bg-[#D4A843]" : "bg-slate-300"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium">{partner.partner_name}</div>
                        <div className="text-xs text-slate-500">{partner.partner_type} · {partner.country_code}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${partner.completion_rate >= 80 ? "text-green-600" : "text-amber-600"}`}>
                        {partner.completion_rate}%
                      </div>
                      <div className="text-xs text-slate-500">{partner.completed}/{partner.assigned} jobs</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Affiliates */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Top Affiliates</h2>
            <Link to="/admin/affiliates" className="text-sm text-[#D4A843] hover:underline">View All</Link>
          </div>
          
          {affiliates.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No affiliates yet</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {affiliates.slice(0, 8).map((aff, idx) => (
                <div key={aff.affiliate_code} className="p-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        idx < 3 ? "bg-green-500" : "bg-slate-300"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium">{aff.name || aff.affiliate_code}</div>
                        <div className="text-xs text-slate-500">{aff.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">TZS {Number(aff.total_sales || 0).toLocaleString()}</div>
                      <div className="text-xs text-slate-500">{aff.order_count} sales</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Country Expansion */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Country Expansion Status</h2>
          <Link to="/admin/setup" className="text-sm text-[#D4A843] hover:underline">Manage Countries</Link>
        </div>
        
        <div className="p-4 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {countries.map((country) => (
            <div key={country.country_code} className="rounded-xl border p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold">{country.country_name}</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  country.status === "live" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {country.status}
                </span>
              </div>
              <div className="text-sm text-slate-500 mb-3">{country.country_code} · {country.currency}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Partners: <span className="font-medium">{country.partner_count}</span></div>
                <div>Delivery: <span className="font-medium">{country.delivery_partner_count}</span></div>
                <div>Orders: <span className="font-medium">{country.orders}</span></div>
                <div>Waitlist: <span className="font-medium">{country.waitlist_count}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, href, color }) {
  const colorMap = {
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    teal: "bg-teal-50 text-teal-600",
  };

  return (
    <Link to={href} className="group rounded-xl border bg-white p-4 hover:shadow-md hover:border-[#D4A843] transition">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || "bg-slate-100 text-slate-600"}`}>
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#D4A843] transition" />
      </div>
      <div className="font-bold text-2xl text-slate-800">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </Link>
  );
}

function SmallMetric({ label, value, href, highlight }) {
  return (
    <Link to={href} className={`rounded-xl border p-3 hover:shadow-sm transition ${highlight ? "bg-red-50 border-red-200" : "bg-white"}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${highlight ? "text-red-600" : "text-slate-800"}`}>{value}</div>
    </Link>
  );
}
