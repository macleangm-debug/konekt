import React from "react";
import { Link } from "react-router-dom";

export default function CustomerPrimaryActions() {
  const items = [
    { label: "Browse Marketplace", href: "/account/marketplace", style: "bg-[#20364D] text-white" },
    { label: "Request a Service", href: "/account/services", style: "bg-white text-[#20364D] border" },
    { label: "Let Sales Assist Me", href: "/account/assisted-quote", style: "bg-[#F4E7BF] text-[#8B6A10]" },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {items.map((item) => (
        <Link key={item.href} to={item.href} className={`rounded-[2rem] px-6 py-5 font-semibold text-center ${item.style}`}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
