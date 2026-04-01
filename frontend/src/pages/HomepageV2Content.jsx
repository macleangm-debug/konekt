import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { getStoredCountryCode, getStoredRegion } from "../lib/countryPreference";
import CountrySelectorModal from "../components/public/CountrySelectorModal";
import PremiumHero from "../components/public/PremiumHero";
import TrustStrip from "../components/public/TrustStrip";
import ClientTrustStrip from "../components/public/ClientTrustStrip";
import CategoryShowcase from "../components/public/CategoryShowcase";
import FeaturedMarketplaceSection from "../components/public/FeaturedMarketplaceSection";
import HomeBusinessSolutionsSection from "../components/public/HomeBusinessSolutionsSection";
import HowItWorksSection from "../components/public/HowItWorksSection";
import WhyChooseSection from "../components/public/WhyChooseSection";
import TrustSignalsGrid from "../components/public/TrustSignalsGrid";
import ExpansionSection from "../components/public/ExpansionSection";
import TestimonialsSection from "../components/public/TestimonialsSection";
import FinalCtaSection from "../components/public/FinalCtaSection";
import LandingBusinessProofSection from "../components/public/LandingBusinessProofSection";

export default function HomepageV2Content() {
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countryAvailability, setCountryAvailability] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const countryCode = getStoredCountryCode();
  const region = getStoredRegion();

  useEffect(() => {
    if (!countryCode) {
      setShowCountryModal(true);
      setLoading(false);
      return;
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
    <div data-testid="homepage-v2-content">
      {showCountryModal && (
        <CountrySelectorModal
          onDone={() => {
            setShowCountryModal(false);
            window.location.reload();
          }}
        />
      )}

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
      <HomeBusinessSolutionsSection />
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <WhyChooseSection />
      <TrustSignalsGrid />
      <ExpansionSection availability={countryAvailability} />
      <TestimonialsSection />
      <FinalCtaSection />
    </div>
  );
}
