import React from "react";
import { Building2, Mail, Phone, MapPin, FileText } from "lucide-react";

export default function CustomerSummaryCard({ customer }) {
  if (!customer) return null;

  return (
    <div className="rounded-2xl border bg-slate-50 p-5 space-y-3" data-testid="customer-summary-card">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-[#2D3E50]" />
        <span className="font-semibold">Customer Details</span>
      </div>
      
      <div className="text-base font-medium text-slate-800">{customer.company_name || "-"}</div>
      <div className="text-sm text-slate-600">
        {customer.contact_name}
      </div>
      
      <div className="flex flex-col gap-1 text-sm text-slate-500">
        <span className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          {customer.email}
        </span>
        {customer.phone && (
          <span className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {customer.phone}
          </span>
        )}
      </div>

      {(customer.address_line_1 || customer.city || customer.country) && (
        <div className="flex items-start gap-2 text-sm text-slate-500">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {[customer.address_line_1, customer.address_line_2, customer.city, customer.country]
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 pt-3 border-t text-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500">TIN:</span>
          <span className="font-medium">{customer.tax_number || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500">BRN:</span>
          <span className="font-medium">{customer.business_registration_number || "-"}</span>
        </div>
      </div>
    </div>
  );
}
