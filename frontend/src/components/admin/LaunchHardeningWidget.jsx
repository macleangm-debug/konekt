import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { CheckCircle2, XCircle, Shield, Loader2 } from "lucide-react";

export default function LaunchHardeningWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/admin/launch-hardening/checklist");
        setData(res.data);
      } catch (error) {
        console.error("Failed to load launch hardening data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border bg-white p-6" data-testid="launch-hardening-widget-loading">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const progressPercentage = Math.round((data.score / data.total) * 100);
  const isReady = data.status === "ready";

  const formatCheckName = (key) => {
    return key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="rounded-3xl border bg-white p-6" data-testid="launch-hardening-widget">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isReady ? "bg-emerald-100" : "bg-amber-100"}`}>
          <Shield className={`w-5 h-5 ${isReady ? "text-emerald-600" : "text-amber-600"}`} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2D3E50]">Launch Hardening</h2>
          <div className="text-sm text-slate-600 mt-1">
            {data.score}/{data.total} checks passed
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isReady ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-xs">
          <span className="text-slate-500">{progressPercentage}% complete</span>
          <span className={`font-medium ${isReady ? "text-emerald-600" : "text-amber-600"}`}>
            {isReady ? "Ready for Launch" : "Needs Attention"}
          </span>
        </div>
      </div>

      {/* Checks list */}
      <div className="space-y-2 mt-5">
        {Object.entries(data.checks || {}).map(([key, value]) => (
          <div
            key={key}
            className={`flex items-center justify-between rounded-xl p-3 ${
              value ? "bg-emerald-50" : "bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {value ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-slate-700">{formatCheckName(key)}</span>
            </div>
            <span
              className={`text-xs font-semibold ${
                value ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {value ? "OK" : "MISSING"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
