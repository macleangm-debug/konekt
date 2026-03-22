import React from "react";
import HelpPageTemplate from "../../components/onboarding/HelpPageTemplate";

export default function HelpAffiliatePage() {
  return (
    <HelpPageTemplate
      title="Affiliate Help"
      subtitle="Learn how to share, earn, and track your performance."
      role="affiliate"
      bullets={[
        "Copy your personal promo code and referral link.",
        "Share through WhatsApp and your networks.",
        "Track clicks, leads, sales, and payout progress.",
        "You only see masked sales information, not client private details.",
      ]}
    />
  );
}
