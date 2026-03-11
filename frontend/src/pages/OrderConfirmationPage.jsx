import React from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";

export default function OrderConfirmationPage() {
  const { orderId } = useParams();

  return (
    <div className="bg-slate-50 min-h-[80vh] flex items-center justify-center px-6" data-testid="order-confirmation">
      <div className="max-w-2xl w-full rounded-3xl border bg-white p-10 text-center shadow-sm">
        <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-700" />
        </div>

        <h1 className="text-4xl font-bold mt-6">Order Submitted!</h1>
        <p className="text-slate-600 mt-3 text-lg">
          Your order has been received successfully. Our team will review it and begin processing shortly.
        </p>

        <div className="rounded-2xl bg-slate-50 border p-6 mt-8">
          <div className="text-sm text-slate-500">Order Reference</div>
          <div className="text-2xl font-bold mt-2 font-mono">{orderId}</div>
        </div>

        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 mt-6 text-left">
          <h3 className="font-semibold text-blue-900">What happens next?</h3>
          <ul className="mt-3 space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Our team will review your order and customization details</span>
            </li>
            <li className="flex items-start gap-2">
              <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>You'll receive an email confirmation with order details</span>
            </li>
            <li className="flex items-start gap-2">
              <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Track your order progress from your dashboard</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link
            to="/dashboard"
            className="rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold inline-flex items-center gap-2"
            data-testid="go-to-dashboard"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to={`/orders/${orderId}/tracking`}
            className="rounded-xl border px-6 py-3 font-medium inline-flex items-center gap-2"
            data-testid="track-order"
          >
            Track Order
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t">
          <p className="text-sm text-slate-500">
            Need help? Contact us at{" "}
            <a href="mailto:support@konekt.co.tz" className="text-[#2D3E50] font-medium">
              support@konekt.co.tz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
