import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, FileText } from "lucide-react";
import { Button } from "../components/ui/button";

export default function CreativeServiceCheckoutPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [paymentMode, setPaymentMode] = useState("pay_now");

  if (!state?.projectDraft) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">No creative service draft found.</p>
          <Link to="/creative-services">
            <Button variant="outline">Browse Services</Button>
          </Link>
        </div>
      </div>
    );
  }

  const project = state.projectDraft;
  const total = project.total_price || 0;

  const proceed = () => {
    if (paymentMode === "pay_now") {
      navigate(
        `/payment/select?target_type=creative_project&target_id=${project.id}&email=${encodeURIComponent(project.customer_email || "")}`,
        {
          state: {
            customerName: project.customer_name,
          },
        }
      );
      return;
    }

    navigate("/dashboard/designs");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
        {/* Back link */}
        <Link
          to="/creative-services"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Services
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Review & Complete Order</h1>
          <p className="text-slate-600 mt-2">
            Confirm your creative service details and choose how you want to proceed.
          </p>
        </div>

        {/* Order Summary */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-bold text-[#2D3E50]">{project.service_title}</h2>
          
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Base Price</span>
              <span>{project.currency || "TZS"} {Number(project.base_price || 0).toLocaleString()}</span>
            </div>
            {project.add_on_total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Add-ons</span>
                <span>{project.currency || "TZS"} {Number(project.add_on_total).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-3 border-t">
              <span>Total</span>
              <span>{project.currency || "TZS"} {Number(total).toLocaleString()}</span>
            </div>
          </div>

          {/* Customer details summary */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-slate-700 mb-3">Delivery Details</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>{project.customer_name}</p>
              {project.company_name && <p>{project.company_name}</p>}
              <p>{project.customer_email}</p>
              {project.customer_phone && <p>{project.phone_prefix} {project.customer_phone}</p>}
              {project.address_line_1 && (
                <p>
                  {project.address_line_1}
                  {project.address_line_2 && `, ${project.address_line_2}`}
                  {project.city && `, ${project.city}`}
                  {project.country && `, ${project.country}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#2D3E50]">Choose Completion Option</h2>

          <label className="flex items-start gap-4 border rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition">
            <input
              type="radio"
              name="payment_mode"
              checked={paymentMode === "pay_now"}
              onChange={() => setPaymentMode("pay_now")}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-[#D4A843]" />
                <span className="font-semibold">Pay now</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Complete payment immediately and push the project into active delivery.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-4 border rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition">
            <input
              type="radio"
              name="payment_mode"
              checked={paymentMode === "pay_later"}
              onChange={() => setPaymentMode("pay_later")}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-600" />
                <span className="font-semibold">Pay later</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Save the request and complete payment later from your invoice or dashboard.
              </p>
            </div>
          </label>

          <Button
            type="button"
            onClick={proceed}
            className="w-full rounded-xl bg-[#2D3E50] hover:bg-[#253242] text-white py-3 font-semibold"
            data-testid="checkout-continue-btn"
          >
            {paymentMode === "pay_now" ? "Continue to Payment" : "Submit & Pay Later"}
          </Button>
        </div>
      </div>
    </div>
  );
}
