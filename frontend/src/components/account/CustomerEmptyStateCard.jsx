import React from "react";
import { Link } from "react-router-dom";

export default function CustomerEmptyStateCard({ title, message, buttonLabel, buttonHref }) {
  return (
    <div className="rounded-[2rem] border bg-white p-10 text-center">
      <div className="text-2xl font-bold text-[#20364D]">{title}</div>
      <p className="text-slate-600 mt-4 max-w-2xl mx-auto leading-7">{message}</p>
      <Link to={buttonHref} className="inline-block mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
        {buttonLabel}
      </Link>
    </div>
  );
}
