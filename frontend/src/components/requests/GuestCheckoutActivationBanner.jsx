import React from "react";
import { UserPlus, ArrowRight } from "lucide-react";

export default function GuestCheckoutActivationBanner({ accountInvite, customerName }) {
  if (!accountInvite?.invite_url) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6" data-testid="guest-activation-banner">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-emerald-100 p-3">
          <UserPlus className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-emerald-800">Activate Your Konekt Account</h3>
          <p className="text-sm text-emerald-700 mt-1">
            {customerName ? `Hi ${customerName}, a` : "A"} Konekt account has been created for you. 
            Activate it to track your orders, manage invoices, and earn rewards.
          </p>
          <a
            href={accountInvite.invite_url}
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition"
            data-testid="activate-account-link"
          >
            Activate Account <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
