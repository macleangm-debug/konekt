import React from "react";
import AdminContentStudioPage from "../admin/AdminContentStudioPage";

/**
 * Affiliate Content Studio
 * ─────────────────────────
 * Reuses the canonical AdminContentStudioPage which pulls campaigns,
 * captions and product/group-deal/services template data from the public
 * `/api/content-engine/template-data/*` endpoints. Affiliates see the
 * exact same templates and captions as the admin Content Studio so their
 * shareouts stay perfectly on-brand and on-message.
 *
 * This is a 1:1 wrapper so any future improvement in the admin studio
 * automatically benefits affiliates with no drift.
 */
export default function AffiliateContentStudioPage() {
  return (
    <div data-testid="affiliate-content-studio-page">
      <AdminContentStudioPage />
    </div>
  );
}
