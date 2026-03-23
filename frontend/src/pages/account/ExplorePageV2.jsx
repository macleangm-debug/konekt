import React, { useState } from "react";
import { Compass, ShoppingBag, Wrench } from "lucide-react";
import AccountMarketplacePageV2 from "./AccountMarketplacePageV2";
import AccountServicesPageV2 from "./AccountServicesPageV2";

export default function ExplorePageV2() {
  const [tab, setTab] = useState("products");

  return (
    <div className="space-y-8" data-testid="explore-page">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
            <Compass className="w-6 h-6 text-[#20364D]" />
          </div>
          <div>
            <div className="text-4xl font-bold text-[#20364D]">Explore</div>
            <div className="text-slate-600">Switch between ordering products and requesting services.</div>
          </div>
        </div>
      </div>

      <div className="inline-flex rounded-xl border bg-white p-1">
        <button 
          onClick={() => setTab("products")} 
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition ${
            tab === "products" ? "bg-[#20364D] text-white" : "text-[#20364D] hover:bg-slate-50"
          }`}
          data-testid="tab-marketplace"
        >
          <ShoppingBag className="w-4 h-4" />
          Marketplace
        </button>
        <button 
          onClick={() => setTab("services")} 
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition ${
            tab === "services" ? "bg-[#20364D] text-white" : "text-[#20364D] hover:bg-slate-50"
          }`}
          data-testid="tab-services"
        >
          <Wrench className="w-4 h-4" />
          Service Request
        </button>
      </div>

      {tab === "products" ? <AccountMarketplacePageV2 embedded /> : <AccountServicesPageV2 embedded />}
    </div>
  );
}
