import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function RuntimeStatusCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/runtime-settings");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load runtime settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="h-12 bg-slate-100 rounded mb-3" />
          <div className="h-12 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const integrations = [
    { key: "resend_configured", label: "Resend (Email)", description: "Transactional emails" },
    { key: "kwikpay_configured", label: "KwikPay (Payments)", description: "Payment processing" },
    { key: "stripe_configured", label: "Stripe", description: "International payments" },
    { key: "mongo_configured", label: "MongoDB", description: "Database connection" },
  ];

  return (
    <div className="rounded-3xl border bg-white p-6" data-testid="runtime-status-card">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xl font-bold text-[#20364D]">Runtime Integrations</div>
        <button
          onClick={load}
          className="p-2 rounded-lg hover:bg-slate-100 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="space-y-3">
        {integrations.map((integration) => {
          const isConfigured = data[integration.key];
          return (
            <div
              key={integration.key}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                isConfigured ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
              }`}
            >
              <div>
                <div className="font-medium text-slate-900">{integration.label}</div>
                <div className="text-xs text-slate-500">{integration.description}</div>
              </div>
              <div className="flex items-center gap-2">
                {isConfigured ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold text-sm">Configured</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 font-semibold text-sm">Missing</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Add environment variables to activate integrations.
      </div>
    </div>
  );
}
