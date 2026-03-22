import React from "react";
import HelpPageTemplate from "../../components/onboarding/HelpPageTemplate";

export default function HelpAdminPage() {
  return (
    <HelpPageTemplate
      title="Admin Help"
      subtitle="Control go-to-market rules, partners, and system performance."
      role="admin"
      bullets={[
        "Set commercial rules in the go-to-market configuration page.",
        "Manage affiliates and vendors using structured manager views.",
        "Review payout, performance, and operational dashboards regularly.",
        "Use onboarding and help pages to improve team adoption.",
      ]}
    />
  );
}
