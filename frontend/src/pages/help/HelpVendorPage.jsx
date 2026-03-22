import React from "react";
import HelpPageTemplate from "../../components/onboarding/HelpPageTemplate";

export default function HelpVendorPage() {
  return (
    <HelpPageTemplate
      title="Vendor / Supplier Help"
      subtitle="Understand how to receive jobs and update internal progress."
      role="vendor"
      bullets={[
        "Review assigned jobs in your vendor dashboard.",
        "Update internal progress accurately and on time.",
        "Respond to nudges from sales or admin where required.",
        "Customer-facing layers will not expose your internal details.",
      ]}
    />
  );
}
