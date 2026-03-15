import React from "react";
import { Link } from "react-router-dom";
import { Coins } from "lucide-react";

export default function PointsUsageHint({ points = 0 }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4" data-testid="points-usage-hint">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D4A843]/10 flex items-center justify-center flex-shrink-0">
          <Coins className="w-5 h-5 text-[#D4A843]" />
        </div>
        <div>
          <div className="text-sm text-slate-500">Rewards</div>
          <div className="text-lg font-bold mt-1 text-[#2D3E50]">
            You have {Number(points || 0).toLocaleString()} points
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Eligible products and services may allow you to use your points at checkout.
          </p>
          <Link to="/dashboard/points" className="inline-flex mt-3 text-sm font-semibold text-[#2D3E50] hover:underline">
            View my points
          </Link>
        </div>
      </div>
    </div>
  );
}
