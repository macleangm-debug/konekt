import React from "react";
import { Construction } from "lucide-react";

export default function PartnershipComingSoonPage({ title = "Coming Soon" }) {
  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-[60vh] flex items-center justify-center" data-testid="partnership-coming-soon">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-5">
          <Construction className="w-8 h-8 text-[#D4A843]" />
        </div>
        <h1 className="text-2xl font-bold text-[#20364D] mb-2">{title}</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          This section is under development and will be available in a future release.
          Check back soon for updates.
        </p>
      </div>
    </div>
  );
}
