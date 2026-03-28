import React from "react";
import { User, Phone, Mail } from "lucide-react";

export default function CustomerAssignedSalesCard({ sales }) {
  if (!sales || (!sales.name && !sales.phone && !sales.email)) return null;

  return (
    <section className="rounded-[2rem] border bg-white p-8" data-testid="assigned-sales-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
          <User className="w-5 h-5 text-[#20364D]" />
        </div>
        <div className="text-lg font-bold text-[#20364D]">Your Konekt Sales Contact</div>
      </div>
      <div className="space-y-3">
        <div className="text-xl font-semibold text-slate-900">{sales.name || "-"}</div>
        {sales.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <a href={`tel:${sales.phone}`} className="hover:text-[#20364D] transition">{sales.phone}</a>
          </div>
        )}
        {sales.email && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <a href={`mailto:${sales.email}`} className="hover:text-[#20364D] transition">{sales.email}</a>
          </div>
        )}
      </div>
    </section>
  );
}
