import React from "react";
import { Wrench } from "lucide-react";
import GuidedServiceRequestPanel from "../../components/account/GuidedServiceRequestPanel";

export default function AccountServicesPageV2({ embedded = false }) {
  return (
    <div className={embedded ? "" : "space-y-8"} data-testid="account-services-page">
      {!embedded && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#20364D]" />
            </div>
            <div>
              <div className="text-4xl font-bold text-[#20364D]">Services</div>
              <div className="text-slate-600">A guided service experience with self-service and assisted options.</div>
            </div>
          </div>
        </div>
      )}
      <GuidedServiceRequestPanel />
    </div>
  );
}
