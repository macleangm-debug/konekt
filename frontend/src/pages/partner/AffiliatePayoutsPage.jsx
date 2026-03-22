import React from "react";
import AffiliatePayoutSummaryCard from "../../components/affiliate/AffiliatePayoutSummaryCard";

const payout = {
  pending: "TZS 72,000",
  paid: "TZS 112,000",
  next_cycle: "Month End",
  account_name: "Mary K. - CRDB",
  account_reference: "Account ending 4721",
};

export default function AffiliatePayoutsPage() {
  return (
    <div className="space-y-8">
      <div className="text-4xl font-bold text-[#20364D]">Payouts</div>
      <AffiliatePayoutSummaryCard payout={payout} />
    </div>
  );
}
