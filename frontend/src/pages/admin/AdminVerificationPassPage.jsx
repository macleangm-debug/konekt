import React, { useState } from "react";
import { CheckCircle, Circle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

const checks = [
  { id: 1, text: "Configuration Hub opens correctly", category: "Admin Pages" },
  { id: 2, text: "Business Settings save and reload", category: "Admin Pages" },
  { id: 3, text: "Payment Settings save and reload", category: "Admin Pages" },
  { id: 4, text: "Markup Rules save and reload", category: "Configuration" },
  { id: 5, text: "Commission Rules save and reload", category: "Configuration" },
  { id: 6, text: "Numbering Rules save and preview correctly", category: "Configuration" },
  { id: 7, text: "Services page shows seeded services", category: "Content" },
  { id: 8, text: "Marketplace shows seeded products", category: "Content" },
  { id: 9, text: "Business Pricing Requests page loads and updates work", category: "Operations" },
  { id: 10, text: "Payment Proofs page loads and review actions work", category: "Operations" },
  { id: 11, text: "Partner Applications page loads and review actions work", category: "Operations" },
  { id: 12, text: "Launch Readiness page reflects current environment settings", category: "Launch" },
  { id: 13, text: "Checkout flow validates points correctly", category: "Commerce" },
  { id: 14, text: "Cart survives guest-to-login transition", category: "Commerce" },
  { id: 15, text: "Payment proof submission creates pending record", category: "Commerce" },
];

export default function AdminVerificationPassPage() {
  const [done, setDone] = useState({});

  const toggle = (id) => {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(done).filter(Boolean).length;
  const progress = Math.round((completedCount / checks.length) * 100);

  // Group by category
  const grouped = checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {});

  return (
    <div className="space-y-8" data-testid="admin-verification-pass-page">
      <PageHeader
        title="Admin Verification Pass"
        subtitle="Run this pass before production to confirm all admin pages and critical launch flows work correctly."
      />

      {/* Progress Card */}
      <SurfaceCard className="bg-gradient-to-r from-[#20364D] to-[#2a4a66] text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/70">Verification Progress</div>
            <div className="text-3xl font-bold mt-1">{completedCount} / {checks.length} verified</div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{progress}%</div>
            <div className="text-sm text-white/70">complete</div>
          </div>
        </div>
        <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </SurfaceCard>

      {/* Grouped Checks */}
      {Object.entries(grouped).map(([category, categoryChecks]) => (
        <SurfaceCard key={category}>
          <div className="text-lg font-bold text-[#20364D] mb-4">{category}</div>
          <div className="space-y-3">
            {categoryChecks.map((check) => (
              <button
                key={check.id}
                onClick={() => toggle(check.id)}
                className={`w-full text-left flex items-center gap-4 rounded-xl border p-4 transition ${
                  done[check.id]
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-slate-50 hover:bg-white hover:border-slate-300"
                }`}
              >
                {done[check.id] ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300 shrink-0" />
                )}
                <span className={`font-medium ${done[check.id] ? "text-emerald-700" : "text-slate-700"}`}>
                  {check.id}. {check.text}
                </span>
              </button>
            ))}
          </div>
        </SurfaceCard>
      ))}

      {progress === 100 && (
        <SurfaceCard className="bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <div>
              <div className="text-xl font-bold text-emerald-700">All verifications passed!</div>
              <p className="text-emerald-600">The admin configuration is ready for production.</p>
            </div>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
