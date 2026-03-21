import React from "react";
import { useNavigate } from "react-router-dom";

export default function ServiceRequestActions({ service, accountMode = false }) {
  const navigate = useNavigate();

  const openService = () => navigate(`/services/${service.slug}`);
  const requestQuote = () => {
    if (accountMode) {
      navigate(`/dashboard/business-pricing?service=${service.key}`);
      return;
    }
    navigate(`/services/${service.slug}`);
  };

  return (
    <div className="grid gap-3 mt-6">
      <button
        type="button"
        onClick={openService}
        className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
      >
        View Service
      </button>
      <button
        type="button"
        onClick={requestQuote}
        className="rounded-xl border px-5 py-3 font-semibold text-[#20364D]"
      >
        Request Quote
      </button>
    </div>
  );
}
