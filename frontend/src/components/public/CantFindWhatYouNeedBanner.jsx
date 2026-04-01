import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, ArrowRight } from "lucide-react";

export default function CantFindWhatYouNeedBanner({ className = "" }) {
  const navigate = useNavigate();

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${className}`} data-testid="cant-find-banner">
      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        <MessageSquarePlus className="w-6 h-6 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-[#20364D]">Can't find what you're looking for?</h3>
        <p className="text-sm text-slate-700 mt-1">
          You won't see everything on the website. Tell us what you need and our team will source it, scope it, or customize it for you.
        </p>
      </div>
      <button
        onClick={() => navigate("/request-quote")}
        className="shrink-0 rounded-xl bg-[#20364D] text-white px-5 py-3 text-sm font-semibold hover:bg-[#2d4a66] transition flex items-center gap-2"
        data-testid="cant-find-cta-btn"
      >
        Tell Us What You Need <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
