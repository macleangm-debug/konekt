import React from "react";
import HelpPageTemplate from "../../components/onboarding/HelpPageTemplate";

export default function HelpCustomerPage() {
  return (
    <HelpPageTemplate
      title="Customer Help"
      subtitle="Learn how to browse, request, pay, and track."
      role="customer"
      bullets={[
        "Browse marketplace products or service pages.",
        "If you need help, request a quote or talk to the AI assistant.",
        "Pay by bank transfer and upload payment proof from the invoice page.",
        "Track order or service progress from your account.",
      ]}
    />
  );
}
