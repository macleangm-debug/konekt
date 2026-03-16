import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { Button } from "../../components/ui/button";
import { 
  Calendar, 
  Clock, 
  Package, 
  Pause, 
  Play, 
  Settings, 
  Wrench, 
  Sparkles,
  Loader2,
  Plus,
  RefreshCcw
} from "lucide-react";
import { toast } from "sonner";

export default function RecurringPlansPage() {
  const [servicePlans, setServicePlans] = useState([]);
  const [supplyPlans, setSupplyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadPlans = async () => {
    try {
      const [serviceRes, supplyRes] = await Promise.all([
        api.get("/api/recurring-service-plans"),
        api.get("/api/recurring-supply-plans"),
      ]);
      setServicePlans(serviceRes.data || []);
      setSupplyPlans(supplyRes.data || []);
    } catch (error) {
      console.error("Failed to load plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handlePauseResume = async (type, planId, currentStatus) => {
    setActionLoading(`${type}-${planId}`);
    try {
      const action = currentStatus === "active" ? "pause" : "resume";
      const endpoint = type === "service" 
        ? `/api/recurring-service-plans/${planId}/${action}`
        : `/api/recurring-supply-plans/${planId}/${action}`;
      await api.post(endpoint);
      toast.success(`Plan ${action}d successfully`);
      loadPlans();
    } catch (error) {
      toast.error("Failed to update plan");
    } finally {
      setActionLoading(null);
    }
  };

  const getFrequencyLabel = (frequency) => {
    switch (frequency) {
      case "weekly": return "Weekly";
      case "biweekly": return "Every 2 weeks";
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly";
      default: return frequency;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700";
      case "paused": return "bg-amber-100 text-amber-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getPlanTypeIcon = (type) => {
    switch (type) {
      case "cleaning": return <Sparkles className="w-5 h-5" />;
      case "maintenance": return <Wrench className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="recurring-plans-loading">
        <div className="animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-72 bg-slate-200 rounded"></div>
        </div>
        <div className="grid xl:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="rounded-3xl bg-slate-200 h-64 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const hasPlans = servicePlans.length > 0 || supplyPlans.length > 0;

  return (
    <div className="space-y-8" data-testid="recurring-plans-page">
      <PageHeader
        title="Recurring Plans"
        subtitle="Manage your recurring cleaning, maintenance, and supply arrangements for hassle-free business operations."
      />

      {!hasPlans ? (
        <SurfaceCard className="text-center py-12">
          <RefreshCcw className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-bold text-[#20364D] mb-2">No recurring plans yet</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Set up recurring services like cleaning, maintenance, or supply deliveries to keep your business running smoothly.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/services">
              <Button data-testid="browse-services-btn">
                <Plus className="w-4 h-4 mr-2" />
                Browse Services
              </Button>
            </Link>
          </div>
        </SurfaceCard>
      ) : (
        <div className="grid xl:grid-cols-2 gap-6">
          {/* Recurring Service Plans */}
          <SurfaceCard data-testid="recurring-services-section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#20364D]">Recurring Services</h2>
              <Link to="/services">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </Link>
            </div>
            
            {servicePlans.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recurring services set up</p>
              </div>
            ) : (
              <div className="space-y-4">
                {servicePlans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className="rounded-2xl border bg-slate-50 p-4"
                    data-testid={`service-plan-${plan.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center text-[#20364D]">
                          {getPlanTypeIcon(plan.plan_type)}
                        </div>
                        <div>
                          <div className="font-bold text-[#20364D]">{plan.service_name}</div>
                          <div className="text-sm text-slate-500 mt-1">
                            {plan.company_name || plan.customer_name}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {getFrequencyLabel(plan.frequency)}
                      </div>
                      {plan.next_scheduled_date && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-4 h-4" />
                          Next: {new Date(plan.next_scheduled_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    {plan.status !== "cancelled" && (
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseResume("service", plan.id, plan.status)}
                          disabled={actionLoading === `service-${plan.id}`}
                        >
                          {actionLoading === `service-${plan.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : plan.status === "active" ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Resume
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          {/* Recurring Supply Plans */}
          <SurfaceCard data-testid="recurring-supplies-section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#20364D]">Recurring Supplies</h2>
              <Link to="/products">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </Link>
            </div>
            
            {supplyPlans.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recurring supplies set up</p>
              </div>
            ) : (
              <div className="space-y-4">
                {supplyPlans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className="rounded-2xl border bg-slate-50 p-4"
                    data-testid={`supply-plan-${plan.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center text-[#20364D]">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-[#20364D]">{plan.plan_name || "Office Supplies"}</div>
                          <div className="text-sm text-slate-500 mt-1">
                            {plan.company_name || plan.customer_name}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {getFrequencyLabel(plan.frequency)}
                      </div>
                      {plan.items?.length > 0 && (
                        <div className="text-slate-600">
                          {plan.items.length} item{plan.items.length > 1 ? "s" : ""}
                        </div>
                      )}
                      {plan.estimated_total > 0 && (
                        <div className="text-slate-600">
                          ~TZS {plan.estimated_total.toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    {plan.status !== "cancelled" && (
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseResume("supply", plan.id, plan.status)}
                          disabled={actionLoading === `supply-${plan.id}`}
                        >
                          {actionLoading === `supply-${plan.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : plan.status === "active" ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Resume
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>
      )}

      {/* Info Section */}
      <SurfaceCard className="bg-slate-50">
        <h3 className="text-lg font-bold text-[#20364D] mb-4">Benefits of Recurring Plans</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="font-semibold text-[#20364D]">Never Run Out</div>
            <p className="text-sm text-slate-600 mt-1">
              Automatic deliveries ensure you always have what you need.
            </p>
          </div>
          <div>
            <div className="font-semibold text-[#20364D]">Flexible Scheduling</div>
            <p className="text-sm text-slate-600 mt-1">
              Pause, resume, or modify your plans anytime.
            </p>
          </div>
          <div>
            <div className="font-semibold text-[#20364D]">Dedicated Support</div>
            <p className="text-sm text-slate-600 mt-1">
              Key accounts get an assigned account manager.
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
