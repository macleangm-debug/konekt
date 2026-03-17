import React from "react";
import { Link } from "react-router-dom";
import { Settings, CreditCard, Calculator, Globe, Rocket, CheckSquare, ArrowRight } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import RuntimeStatusCard from "../../components/admin/RuntimeStatusCard";

const sections = [
  {
    title: "Business Identity",
    desc: "Company name, logo, TIN, address, support channels, invoice footer.",
    href: "/admin/business-settings",
    icon: Settings,
  },
  {
    title: "Payments",
    desc: "Bank transfer instructions, country payment options, gateway readiness.",
    href: "/admin/payment-settings",
    icon: CreditCard,
  },
  {
    title: "Commercial Rules",
    desc: "Markup rules, commission rules, points caps, numbering formats.",
    href: "/admin/group-markups",
    icon: Calculator,
  },
  {
    title: "Countries & Expansion",
    desc: "Country configs, regions, expansion readiness, partner applications.",
    href: "/admin/countries-regions",
    icon: Globe,
  },
  {
    title: "Launch Readiness",
    desc: "See if the key operational and technical requirements are ready.",
    href: "/admin/launch-readiness",
    icon: Rocket,
  },
  {
    title: "Verification Pass",
    desc: "Use the final pass page to verify admin pages, saves, and seeded content.",
    href: "/admin/verification-pass",
    icon: CheckSquare,
  },
];

export default function AdminConfigurationHubPage() {
  return (
    <div className="space-y-8" data-testid="admin-configuration-hub">
      <PageHeader
        title="Configuration & Launch Settings"
        subtitle="One place to review the settings that matter most before production."
      />

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D] mb-6">Configuration Areas</div>

          <div className="grid md:grid-cols-2 gap-4">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group rounded-2xl border bg-slate-50 p-5 hover:bg-white hover:shadow-lg hover:border-[#20364D]/20 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#20364D]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-[#20364D] group-hover:text-[#D4A843] transition">
                        {item.title}
                      </div>
                      <p className="text-slate-600 mt-1 text-sm">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <RuntimeStatusCard />

          <SurfaceCard>
            <div className="text-xl font-bold text-[#20364D] mb-4">Next recommended actions</div>
            <div className="space-y-3 text-slate-700">
              <div className="rounded-xl border bg-slate-50 px-4 py-3 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#20364D] text-white text-sm flex items-center justify-center font-bold">1</span>
                <span>Confirm payment settings and bank instructions.</span>
              </div>
              <div className="rounded-xl border bg-slate-50 px-4 py-3 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#20364D] text-white text-sm flex items-center justify-center font-bold">2</span>
                <span>Review markup, commission, and points protection rules.</span>
              </div>
              <div className="rounded-xl border bg-slate-50 px-4 py-3 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#20364D] text-white text-sm flex items-center justify-center font-bold">3</span>
                <span>Run the launch readiness and verification pass pages.</span>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
