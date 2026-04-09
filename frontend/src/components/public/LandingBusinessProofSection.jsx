import React from "react";
import { ShoppingCart, Building2, Palette, Wrench, Check } from "lucide-react";
import AudienceUseCaseCard from "./AudienceUseCaseCard";
import LandingActionRibbon from "./LandingActionRibbon";

const cards = [
  {
    icon: ShoppingCart,
    title: "Procurement Teams",
    description:
      "Recurring supply, structured approvals, and better ordering visibility across categories.",
  },
  {
    icon: Building2,
    title: "Corporate Operations",
    description:
      "Reliable support across offices, branches, internal teams, and operational requests.",
    highlight: true,
  },
  {
    icon: Palette,
    title: "Creative & Print Buyers",
    description:
      "Branding, promotional materials, print production, and campaign execution with better coordination.",
  },
  {
    icon: Wrench,
    title: "Service-Driven Organizations",
    description:
      "Cleaning, technical support, installations, and recurring service workflows managed more clearly.",
  },
];

const proofPoints = [
  "Structured quote and approval workflows",
  "Country-aware routing and order processing",
  "Better visibility from request to delivery",
];

export default function LandingBusinessProofSection() {
  return (
    <section className="bg-slate-50 py-20" data-testid="landing-business-proof-section">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-start">
          <div>
            <div className="text-xs tracking-[0.22em] uppercase text-slate-500 font-semibold">
              Built for serious business buying
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-[#20364D] mt-4 leading-tight">
              Built for businesses that need reliable execution
            </h2>

            <p className="text-slate-600 mt-5 text-lg max-w-3xl leading-8">
              We help companies source products, request services, manage quotes,
              and track delivery through one coordinated platform.
            </p>

            <div className="space-y-4 mt-8" data-testid="proof-points">
              {proofPoints.map((item, idx) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl bg-white border px-4 py-4"
                  data-testid={`proof-point-${idx}`}
                >
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-[#F4E7BF] text-[#8B6A10] flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="font-medium text-[#20364D]">{item}</div>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              <div className="rounded-[2rem] bg-white border p-6" data-testid="buying-model-card">
                <div className="text-sm text-slate-500">Supported buying model</div>
                <div className="text-3xl font-bold text-[#20364D] mt-2">Products + Services</div>
                <div className="text-slate-600 mt-3">
                  One business workflow instead of fragmented requests.
                </div>
              </div>

              <div className="rounded-[2rem] bg-white border p-6" data-testid="delivery-card">
                <div className="text-sm text-slate-500">Operational strength</div>
                <div className="text-3xl font-bold text-[#20364D] mt-2">Trackable Delivery</div>
                <div className="text-slate-600 mt-3">
                  Better follow-up from quote to delivery and service completion.
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5" data-testid="audience-cards-grid">
            {cards.map((card) => (
              <AudienceUseCaseCard
                key={card.title}
                Icon={card.icon}
                title={card.title}
                description={card.description}
                highlight={!!card.highlight}
              />
            ))}
          </div>
        </div>

        <LandingActionRibbon />
      </div>
    </section>
  );
}
