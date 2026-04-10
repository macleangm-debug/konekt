import React from "react";
import {
  ServiceHero,
  ServiceIncludes,
  ServiceAudience,
  ServiceProcess,
  ServiceBenefits,
  ServiceUseCases,
  ServiceFAQ,
  ServiceCTA,
} from "./canonical";

/**
 * Canonical Service Page Template
 * 
 * Single reusable template for ALL service pages.
 * 8-section structure: Hero → Includes → Audience → Process → Benefits → Use Cases → FAQ → CTA
 *
 * Props:
 *  - slug: Service slug for quote request linking
 *  - title: Service name
 *  - description: 1–2 line overview
 *  - groupName: Category/group label (shown above title in hero)
 *  - includes: string[] — What this service covers
 *  - audience: string[] — Who it's for
 *  - process: string[] | { title, description }[] — How it works steps
 *  - benefits: string[] — Why choose this service
 *  - useCases: string[] — Real scenarios where this applies
 *  - faqs: { q, a }[] — Frequently asked questions
 */
export default function CanonicalServicePage({
  slug,
  title,
  description,
  groupName,
  includes = [],
  audience = [],
  process: processSteps,
  benefits = [],
  useCases = [],
  faqs = [],
}) {
  return (
    <div data-testid="canonical-service-page">
      <ServiceHero
        title={title}
        description={description}
        groupName={groupName}
        slug={slug}
      />
      <ServiceIncludes items={includes} />
      <ServiceAudience items={audience} />
      <ServiceProcess steps={processSteps} />
      <ServiceBenefits items={benefits} />
      <ServiceUseCases items={useCases} />
      <ServiceFAQ items={faqs} />
      <ServiceCTA slug={slug} />
    </div>
  );
}
