import React, { useState } from "react";
import { Globe, ChevronRight } from "lucide-react";

const COUNTRIES = [
  { code: "TZ", name: "Tanzania", regions: ["Dar es Salaam", "Arusha", "Mwanza", "Dodoma"] },
  { code: "KE", name: "Kenya", regions: ["Nairobi", "Mombasa", "Kisumu"] },
  { code: "UG", name: "Uganda", regions: ["Kampala", "Entebbe", "Jinja"] },
  { code: "RW", name: "Rwanda", regions: ["Kigali"] },
  { code: "NG", name: "Nigeria", regions: ["Lagos", "Abuja", "Port Harcourt"] },
  { code: "GH", name: "Ghana", regions: ["Accra", "Kumasi"] },
  { code: "ZA", name: "South Africa", regions: ["Johannesburg", "Cape Town", "Durban"] },
];

export default function CountrySelectorModal({ onDone }) {
  const [step, setStep] = useState("country"); // "country" | "region"
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    if (country.regions.length > 0) {
      setStep("region");
    } else {
      saveAndClose(country.code, null);
    }
  };

  const handleRegionSelect = (region) => {
    setSelectedRegion(region);
    saveAndClose(selectedCountry.code, region);
  };

  const saveAndClose = (countryCode, region) => {
    localStorage.setItem("customer_country_code", countryCode);
    if (region) {
      localStorage.setItem("customer_region", region);
    }
    if (onDone) onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" data-testid="country-selector-modal">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#20364D] flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#20364D]">
              {step === "country" ? "Select Your Country" : "Select Your Region"}
            </h2>
            <p className="text-slate-600 text-sm">
              {step === "country"
                ? "Choose your location to see available products and services"
                : `Select a region in ${selectedCountry?.name}`}
            </p>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {step === "country" ? (
            COUNTRIES.map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountrySelect(country)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border hover:bg-slate-50 hover:border-[#20364D] transition"
                data-testid={`country-${country.code}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCountryFlag(country.code)}</span>
                  <span className="font-medium">{country.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ))
          ) : (
            selectedCountry?.regions.map((region) => (
              <button
                key={region}
                onClick={() => handleRegionSelect(region)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border hover:bg-slate-50 hover:border-[#20364D] transition"
                data-testid={`region-${region}`}
              >
                <span className="font-medium">{region}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ))
          )}
        </div>

        {step === "region" && (
          <button
            onClick={() => setStep("country")}
            className="mt-4 text-sm text-slate-500 hover:text-[#20364D] transition"
          >
            ← Back to country selection
          </button>
        )}
      </div>
    </div>
  );
}

function getCountryFlag(code) {
  const flags = {
    TZ: "🇹🇿",
    KE: "🇰🇪",
    UG: "🇺🇬",
    RW: "🇷🇼",
    NG: "🇳🇬",
    GH: "🇬🇭",
    ZA: "🇿🇦",
  };
  return flags[code] || "🌍";
}
