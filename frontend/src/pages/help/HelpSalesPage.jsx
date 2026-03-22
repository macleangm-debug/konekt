import React from "react";
import HelpPageTemplate from "../../components/onboarding/HelpPageTemplate";

export default function HelpSalesPage() {
  return (
    <HelpPageTemplate
      title="Sales Help"
      subtitle="Understand how to work leads, quotes, and execution follow-up."
      role="sales"
      bullets={[
        "Review lead source before acting on the opportunity.",
        "If lead source is affiliate, sales commission is reduced by default.",
        "Use follow-up and coordination tools to keep delivery on track.",
        "Keep customer updates professional and customer-safe.",
      ]}
    />
  );
}
