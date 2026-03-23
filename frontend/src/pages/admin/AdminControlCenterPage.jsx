import React from "react";
import { Link } from "react-router-dom";
import AdminQuickSettingsCard from "../../components/navigation/AdminQuickSettingsCard";

const cards = [
  {
    title: "Settings Hub",
    description: "Single place for go-live defaults, payments, AI, notifications, launch controls, and commercial settings.",
    href: "/admin/settings-hub",
  },
  {
    title: "Affiliate Manager",
    description: "Review affiliate status, promo codes, performance, and governance actions.",
    href: "/admin/affiliates",
  },
  {
    title: "Go-To-Market",
    description: "Manage launch-facing commercial behavior and rollout controls.",
    href: "/admin/go-to-market",
  },
  {
    title: "Launch QA",
    description: "Complete launch checks and final operational verification.",
    href: "/admin/launch-qa",
  },
];

export default function AdminControlCenterPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Admin Control Center</div>
        <div className="text-slate-600 mt-2">
          Use this area as the main control surface for launch operations and configuration.
        </div>
      </div>

      <AdminQuickSettingsCard />

      <div className="grid xl:grid-cols-2 gap-6">
        {cards.map((card) => (
          <div key={card.href} className="rounded-[2rem] border bg-white p-8">
            <div className="text-2xl font-bold text-[#20364D]">{card.title}</div>
            <p className="text-slate-600 mt-4 leading-7">{card.description}</p>
            <Link
              to={card.href}
              className="inline-block mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
            >
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
