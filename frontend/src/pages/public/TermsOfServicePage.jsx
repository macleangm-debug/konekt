import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

const sections = [
  {
    title: "Affiliate Program",
    content: [
      "Participation in the Connect Affiliate Program is subject to application and approval by Connect.",
      "Connect reserves the right to approve, reject, suspend, or remove any affiliate at its sole discretion.",
      "Affiliates must use only their assigned promo code and referral link. Misrepresentation of pricing, offers, or Connect branding is prohibited.",
      "Commission is earned on successful completed transactions only. Commission rates may vary by campaign and are determined by Connect.",
      "Violations including fraud, spam, or misuse of promo codes will result in immediate termination and forfeiture of unpaid earnings.",
    ],
  },
  {
    title: "Promo Codes & Attribution",
    content: [
      "Only one promotional channel applies per transaction. Orders cannot combine affiliate, sales, and referral codes simultaneously.",
      "Promo codes must not be shared in misleading ways or used to manipulate pricing or attribution.",
      "Promo codes may be invalidated by Connect at any time if abuse or misuse is detected.",
      "Connect determines final attribution for all orders. Attribution decisions are final.",
    ],
  },
  {
    title: "Wallet Usage",
    content: [
      "Wallet balances are promotional credits, not cash equivalents.",
      "Wallet usage per order is subject to availability and system-defined limits.",
      "Wallet balances cannot be withdrawn as cash or transferred to other accounts.",
      "Connect reserves the right to adjust wallet rules, limits, and availability at any time.",
    ],
  },
  {
    title: "Group Deal Purchases",
    content: [
      "Group deals are campaign-based purchases that depend on reaching a minimum quantity threshold.",
      "If the minimum quantity threshold is not met by the campaign deadline, customers are eligible for a full refund.",
      "If the threshold is met, orders proceed to fulfillment. The deal may close before the deadline if the target is reached early.",
      "Delivery timelines for group deals may vary due to bulk procurement and coordination requirements.",
      "Customers may purchase additional units in the same campaign. Total committed units are aggregated per customer.",
    ],
  },
  {
    title: "Payment & Verification",
    content: [
      "All orders are confirmed only after payment has been verified and approved by Connect.",
      "Connect reserves the right to approve or reject any payment proof submission.",
      "Incorrect, incomplete, or fraudulent payment submissions may result in order cancellation.",
      "Payment verification timelines depend on the payment method and may take up to 48 hours.",
    ],
  },
  {
    title: "Ratings & Feedback",
    content: [
      "Customers may be invited to rate their service experience after order completion.",
      "Ratings are used internally for service quality improvement and may influence internal performance systems.",
      "Abuse or manipulation of the rating system, including fake ratings or coerced reviews, is strictly prohibited.",
      "Connect reserves the right to moderate or remove ratings that violate these terms.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="terms-page">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-4">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#20364D] flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#D4A843]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#20364D]">Terms of Service</h1>
            <p className="text-xs text-slate-400 mt-0.5">Last updated: April 2026</p>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6" data-testid={`terms-section-${i}`}>
              <h2 className="text-lg font-bold text-[#20364D] mb-4">{i + 1}. {section.title}</h2>
              <ul className="space-y-2.5">
                {section.content.map((item, j) => (
                  <li key={j} className="text-sm text-slate-600 leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#D4A843]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 text-xs text-slate-400">
          <p>These terms apply to all users of the Connect platform. By using our services, you agree to these terms.</p>
          <p className="mt-1">For questions, contact <a href="mailto:support@konekt.co.tz" className="text-[#20364D] hover:underline">support@konekt.co.tz</a></p>
        </div>
      </div>
    </div>
  );
}
