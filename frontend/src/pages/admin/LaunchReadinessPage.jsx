import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { FileDown } from "lucide-react";
import RuntimeStatusCard from "../../components/admin/RuntimeStatusCard";

export default function LaunchReadinessPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Use the same endpoint as the PDF report for consistency
        const res = await api.get("/api/admin/launch-report/json");
        setData(res.data);
      } catch (error) {
        console.error("Failed to load readiness data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleExportPDF = () => {
    const token = localStorage.getItem("token");
    const baseUrl = process.env.REACT_APP_BACKEND_URL || "";
    window.open(`${baseUrl}/api/admin/launch-report/pdf?token=${token}`, "_blank");
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Unable to load readiness data</p>
      </div>
    );
  }

  const checks = data.checks || {};
  const counts = data.counts || {};

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-none w-full space-y-6">
        <div className="flex items-start justify-between">
          <div className="text-left">
            <h1 className="text-4xl font-bold" data-testid="launch-readiness-title">Launch Readiness</h1>
            <p className="mt-2 text-slate-600">
              Review critical setup before production launch.
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            className="rounded-xl border bg-white px-5 py-3 font-medium flex items-center gap-2 hover:bg-slate-50"
            data-testid="export-pdf-btn"
          >
            <FileDown className="w-4 h-4" />
            Export Readiness PDF
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_350px] gap-6">
          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-6" data-testid="readiness-score-card">
              <div className="text-sm text-slate-500">Readiness Score</div>
              <div className="text-4xl font-bold mt-2">
                {data.ready_score}/{data.max_score}
              </div>
              <div className="mt-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  data.status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {data.status}
                </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="checks-grid">
          {Object.entries(checks).map(([key, value]) => (
            <div key={key} className="rounded-3xl border bg-white p-5" data-testid={`check-${key}`}>
              <div className="text-sm text-slate-500">{key.replace(/_/g, " ")}</div>
              <div className={`text-lg font-bold mt-2 ${value ? "text-emerald-700" : "text-red-600"}`}>
                {value ? "OK" : "Missing"}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border bg-white p-6" data-testid="data-counts-section">
          <h2 className="text-2xl font-bold">Data Counts</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
            {Object.entries(counts).map(([key, value]) => (
              <div key={key} className="rounded-2xl border bg-slate-50 p-4" data-testid={`count-${key}`}>
                <div className="text-sm text-slate-500">{key.replace(/_/g, " ")}</div>
                <div className="text-xl font-bold mt-2">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6" data-testid="checklist-section">
          <h2 className="text-2xl font-bold">Manual Final Checklist</h2>
          <div className="space-y-3 mt-5 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Confirm live KwikPay credentials and webhook endpoint</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Confirm bank transfer details in settings</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Confirm company logo, TIN, BRN, address, and tax setup</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Confirm at least one product has stock-tracked variants</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Confirm hero banner and client banner content</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Confirm creative services and add-ons pricing</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Confirm referral settings and points redemption values</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Confirm affiliate application, approval, and dashboard flows</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Test quote &rarr; order &rarr; invoice &rarr; payment &rarr; statement</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">&#9633;</span>
              <span>Test customer dashboard and design project workflow</span>
            </div>
          </div>
        </div>
          </div>
          
          {/* Runtime Integrations Sidebar */}
          <div className="space-y-6">
            <RuntimeStatusCard />
          </div>
        </div>
      </div>
    </div>
  );
}
