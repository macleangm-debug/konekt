import React, { useEffect, useState } from "react";
import { Loader2, Activity, TrendingUp, AlertTriangle, Users, Building2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ServiceInsightsPage() {
  const [demand, setDemand] = useState([]);
  const [conversion, setConversion] = useState([]);
  const [delays, setDelays] = useState([]);
  const [partnerCoverage, setPartnerCoverage] = useState([]);
  const [inHouseOpportunity, setInHouseOpportunity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("demand");

  const token = localStorage.getItem("admin_token");

  const loadData = async () => {
    try {
      const [demandRes, conversionRes, delaysRes, coverageRes, opportunityRes] = await Promise.all([
        fetch(`${API}/api/admin/service-insights/demand`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/service-insights/conversion`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/service-insights/delays`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/service-insights/partner-coverage`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/service-insights/in-house-opportunity`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (demandRes.ok) setDemand(await demandRes.json());
      if (conversionRes.ok) setConversion(await conversionRes.json());
      if (delaysRes.ok) setDelays(await delaysRes.json());
      if (coverageRes.ok) setPartnerCoverage(await coverageRes.json());
      if (opportunityRes.ok) setInHouseOpportunity(await opportunityRes.json());
    } catch (error) {
      console.error(error);
      toast.error("Failed to load service insights");
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

  const totalRequests = demand.reduce((s, d) => s + (d.total_requests || 0), 0);
  const totalCompleted = demand.reduce((s, d) => s + (d.completed || 0), 0);
  const servicesNeedingPartners = partnerCoverage.filter(s => s.needs_more_partners).length;

  const tabs = [
    { key: "demand", label: "Demand", icon: Activity },
    { key: "conversion", label: "Conversion Funnel", icon: TrendingUp },
    { key: "delays", label: "Delays", icon: AlertTriangle },
    { key: "coverage", label: "Partner Coverage", icon: Users },
    { key: "in-house", label: "In-House Opportunity", icon: Building2 },
  ];

  return (
    <div className="p-6" data-testid="service-insights-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Service Insights</h1>
        <p className="text-slate-500">Analyze service demand, conversions, and partner coverage.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Activity className="w-4 h-4" />
            Total Requests
          </div>
          <div className="text-3xl font-bold mt-1">{totalRequests}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp className="w-4 h-4" />
            Completed
          </div>
          <div className="text-3xl font-bold mt-1 text-green-600">{totalCompleted}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <AlertTriangle className="w-4 h-4" />
            Services with Delays
          </div>
          <div className="text-3xl font-bold mt-1 text-amber-600">{delays.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" />
            Need More Partners
          </div>
          <div className="text-3xl font-bold mt-1 text-red-600">{servicesNeedingPartners}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(key)}
          >
            <Icon className="w-4 h-4 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* Demand Tab */}
      {activeTab === "demand" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Service Demand Summary</h2>
          </div>
          {demand.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No service request data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Service</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Total Requests</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Completed</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Pending</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {demand.map((service, idx) => {
                    const completionRate = service.total_requests > 0
                      ? ((service.completed / service.total_requests) * 100).toFixed(1)
                      : 0;
                    return (
                      <tr key={service.service_key || idx} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{service.service_name || service.service_key || "N/A"}</td>
                        <td className="px-4 py-3 text-right font-bold">{service.total_requests}</td>
                        <td className="px-4 py-3 text-right text-green-600">{service.completed}</td>
                        <td className="px-4 py-3 text-right text-amber-600">{service.pending}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${
                            completionRate >= 80 ? "text-green-600" :
                            completionRate >= 50 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {completionRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Conversion Tab */}
      {activeTab === "conversion" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Service Conversion Funnel</h2>
          </div>
          {conversion.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No conversion data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Service</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Requests</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Quoted</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Approved</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Completed</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Quote Rate</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Approval Rate</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {conversion.map((service, idx) => (
                    <tr key={service.service_key || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{service.service_name || service.service_key || "N/A"}</td>
                      <td className="px-4 py-3 text-right">{service.requests}</td>
                      <td className="px-4 py-3 text-right">{service.quoted}</td>
                      <td className="px-4 py-3 text-right">{service.approved}</td>
                      <td className="px-4 py-3 text-right text-green-600">{service.completed}</td>
                      <td className="px-4 py-3 text-right">{service.quote_rate}%</td>
                      <td className="px-4 py-3 text-right">{service.approval_rate}%</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">{service.completion_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delays Tab */}
      {activeTab === "delays" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Services with Most Delays</h2>
          </div>
          {delays.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No delayed services - great!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rank</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Service</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Delayed Count</th>
                  </tr>
                </thead>
                <tbody>
                  {delays.map((service, idx) => (
                    <tr key={service.service_key || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          idx < 3 ? "bg-red-500" : "bg-slate-300"
                        }`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{service.service_name || service.service_key || "N/A"}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{service.delayed_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Partner Coverage Tab */}
      {activeTab === "coverage" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Partner Coverage by Service</h2>
          </div>
          {partnerCoverage.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No service types configured</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Service</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Partners</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Weekly Capacity</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Active Assignments</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerCoverage.map((service, idx) => (
                    <tr key={service.service_key || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{service.service_name || service.service_key}</td>
                      <td className="px-4 py-3 text-right">{service.partner_count}</td>
                      <td className="px-4 py-3 text-right">{service.total_capacity_per_week}</td>
                      <td className="px-4 py-3 text-right">{service.active_assignments}</td>
                      <td className="px-4 py-3 text-center">
                        {service.needs_more_partners ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Needs Partners
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* In-House Opportunity Tab */}
      {activeTab === "in-house" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">In-House Operation Candidates</h2>
            <p className="text-xs text-slate-500 mt-1">Services with high demand and partner delivery issues</p>
          </div>
          {inHouseOpportunity.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No opportunity data available (need 5+ requests)</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Service</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Requests</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Completed</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Delayed</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Completion %</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Delay %</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Opportunity Score</th>
                  </tr>
                </thead>
                <tbody>
                  {inHouseOpportunity.map((service, idx) => (
                    <tr key={service.service_key || idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{service.service_name || service.service_key || "N/A"}</td>
                      <td className="px-4 py-3 text-right">{service.total_requests}</td>
                      <td className="px-4 py-3 text-right text-green-600">{service.completed}</td>
                      <td className="px-4 py-3 text-right text-red-600">{service.delayed}</td>
                      <td className="px-4 py-3 text-right">{service.completion_rate}%</td>
                      <td className="px-4 py-3 text-right">{service.delay_rate}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          service.opportunity_score >= 10 ? "bg-green-100 text-green-700" :
                          service.opportunity_score >= 5 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {service.opportunity_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
