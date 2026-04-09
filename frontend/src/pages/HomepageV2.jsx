import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { getStoredCountryCode, getStoredRegion } from "../lib/countryPreference";
import PublicNavbarV2 from "../components/public/PublicNavbarV2";
import PremiumHero from "../components/public/PremiumHero";
import TrustStrip from "../components/public/TrustStrip";
import ClientTrustStrip from "../components/public/ClientTrustStrip";
import CategoryShowcase from "../components/public/CategoryShowcase";
import LandingBusinessProofSection from "../components/public/LandingBusinessProofSection";
import FeaturedMarketplaceSection from "../components/public/FeaturedMarketplaceSection";
import HowItWorksSection from "../components/public/HowItWorksSection";
import WhyChooseSection from "../components/public/WhyChooseSection";
import ExpansionSection from "../components/public/ExpansionSection";
import TestimonialsSection from "../components/public/TestimonialsSection";
import FinalCtaSection from "../components/public/FinalCtaSection";
import PremiumFooterV2 from "../components/public/PremiumFooterV2";

export default function HomepageV2() {
  const [countryAvailability, setCountryAvailability] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default to Tanzania if no country stored
  const countryCode = getStoredCountryCode() || "TZ";
  const region = getStoredRegion();

  useEffect(() => {
    if (!localStorage.getItem("customer_country_code")) {
      localStorage.setItem("customer_country_code", "TZ");
    }

    const load = async () => {
      try {
        const [availabilityRes, listingsRes] = await Promise.all([
          api.get(`/api/public-country/availability/${countryCode}`).catch(() => ({ data: null })),
          api.get(`/api/public-marketplace/country/${countryCode}`).catch(() => ({ data: { items: [] } })),
        ]);
        setCountryAvailability(availabilityRes.data);
        setListings(listingsRes.data?.items || listingsRes.data || []);
      } catch (error) {
        console.error("Failed to load homepage data:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [countryCode, region]);

  return (
    <div className="bg-white min-h-screen" data-testid="homepage-v2">
      <PublicNavbarV2 />
      <PremiumHero
        countryCode={countryCode}
        region={region}
        availability={countryAvailability}
      />
      <TrustStrip />
      <ClientTrustStrip />
      <CategoryShowcase />
      <LandingBusinessProofSection />
      <FeaturedMarketplaceSection listings={Array.isArray(listings) ? listings.slice(0, 8) : []} />
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <WhyChooseSection />
      <ExpansionSection availability={countryAvailability} />
      <TestimonialsSection />
      <FinalCtaSection />
      <PremiumFooterV2 />
    </div>
  );
}
