import React from "react";
import ServiceRequestChooser from "../../components/account/ServiceRequestChooser";
import ServiceDynamicRequestForm from "../../components/account/ServiceDynamicRequestForm";

export default function AccountServiceRequestPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Services</div>
        <div className="text-slate-600 mt-2">Choose whether to submit the request yourself or let sales prepare the quote for you.</div>
      </div>

      <ServiceRequestChooser />
      <ServiceDynamicRequestForm />
    </div>
  );
}
