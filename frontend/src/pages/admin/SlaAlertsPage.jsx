import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, FileText, Calendar, RefreshCw, Loader2, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL;

export default function SlaAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("admin_token");

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/admin/sla-alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/sla-alerts/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error("Failed to load SLA data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
      case "low": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case "delayed_order": return <Clock className="w-5 h-5" />;
      case "stale_service_request": return <FileText className="w-5 h-5" />;
      case "overdue_recurring_plan": return <Calendar className="w-5 h-5" />;
      case "overdue_invoice": return <AlertTriangle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case "delayed_order": return "Delayed Order";
      case "stale_service_request": return "Stale Service Request";
      case "overdue_recurring_plan": return "Overdue Recurring Plan";
      case "overdue_invoice": return "Overdue Invoice";
      default: return type;
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case "healthy": return "text-green-600 bg-green-100";
      case "at_risk": return "text-amber-600 bg-amber-100";
      case "critical": return "text-red-600 bg-red-100";
      default: return "text-slate-600 bg-slate-100";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="sla-alerts-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SLA Alerts</h1>
          <p className="text-slate-500">
            Monitor delayed orders, stale requests, and at-risk assignments.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} data-testid="refresh-btn">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">Health Status</div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(summary.health_status)}`}>
                {summary.health_status === "healthy" && <CheckCircle className="w-3 h-3 inline mr-1" />}
                {summary.health_status?.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-3xl font-bold mt-2">{summary.total_alerts}</div>
            <div className="text-xs text-slate-500">Total Alerts</div>
          </div>
          
          <div className="bg-white rounded-xl border p-4">
            <div className="text-sm text-slate-500">Delayed Orders</div>
            <div className="text-3xl font-bold mt-2 text-red-600">{summary.delayed_orders}</div>
            <div className="text-xs text-slate-500">Pending 3+ days</div>
          </div>
          
          <div className="bg-white rounded-xl border p-4">
            <div className="text-sm text-slate-500">Stale Requests</div>
            <div className="text-3xl font-bold mt-2 text-amber-600">{summary.stale_service_requests}</div>
            <div className="text-xs text-slate-500">No progress 3+ days</div>
          </div>
          
          <div className="bg-white rounded-xl border p-4">
            <div className="text-sm text-slate-500">Overdue Plans</div>
            <div className="text-3xl font-bold mt-2 text-blue-600">{summary.overdue_recurring_plans}</div>
            <div className="text-xs text-slate-500">Missed schedule</div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="font-semibold text-slate-800">Active Alerts</h2>
        </div>
        
        {alerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <div className="text-lg font-semibold text-slate-800">All Clear!</div>
            <p className="text-slate-500 mt-1">No SLA alerts at this time.</p>
          </div>
        ) : (
          <div className="divide-y">
            {alerts.map((alert, idx) => (
              <div 
                key={`${alert.entity_id}-${idx}`} 
                className="p-4 hover:bg-slate-50 transition"
                data-testid={`alert-${alert.entity_id}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getPriorityColor(alert.priority)}`}>
                    {getAlertTypeIcon(alert.alert_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">
                        {alert.entity_number || alert.service_name || alert.entity_id?.substring(0, 8)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                        {alert.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        {getAlertTypeLabel(alert.alert_type)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 mt-1">{alert.reason}</p>
                    
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                      {alert.customer_name && (
                        <span>Customer: {alert.customer_name}</span>
                      )}
                      {alert.company_name && (
                        <span>Company: {alert.company_name}</span>
                      )}
                      {alert.key_account_email && (
                        <span>Account Manager: {alert.key_account_email}</span>
                      )}
                      {alert.days_old && (
                        <span className="text-red-600">{alert.days_old} days old</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right text-xs text-slate-500">
                    {alert.created_at && new Date(alert.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
