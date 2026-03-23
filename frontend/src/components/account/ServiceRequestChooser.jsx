import React from "react";
import { Link } from "react-router-dom";

export default function ServiceRequestChooser() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Fill the Request Form</div>
        <p className="text-slate-600 mt-4 leading-7">
          Choose a service and complete a request form tailored to that service.
        </p>
        <Link to="/account/services?mode=self" className="inline-block mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
          Start Request
        </Link>
      </div>

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Have Sales Contact Me</div>
        <p className="text-slate-600 mt-4 leading-7">
          Share a short brief and let a sales advisor contact you and prepare the quote from your account.
        </p>
        <Link to="/account/assisted-quote" className="inline-block mt-6 rounded-xl bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 font-semibold">
          Request Sales Assistance
        </Link>
      </div>
    </div>
  );
}
