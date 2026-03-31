import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ChevronRight, Check, Clock } from "lucide-react";

const COUNTRIES = [
  { code: "TZ", name: "Tanzania", status: "active", regions: ["Dar es Salaam", "Arusha", "Mwanza", "Dodoma"] },
  { code: "KE", name: "Kenya", status: "coming_soon", regions: [] },
  { code: "UG", name: "Uganda", status: "coming_soon", regions: [] },
  { code: "RW", name: "Rwanda", status: "coming_soon", regions: [] },
  { code: "GH", name: "Ghana", status: "coming_soon", regions: [] },
  { code: "NG", name: "Nigeria", status: "coming_soon", regions: [] },
  { code: "ZA", name: "South Africa", status: "coming_soon", regions: [] },
];

const FLAGS = {
  TZ: "\u{1F1F9}\u{1F1FF}",
  KE: "\u{1F1F0}\u{1F1EA}",
  UG: "\u{1F1FA}\u{1F1EC}",
  RW: "\u{1F1F7}\u{1F1FC}",
  GH: "\u{1F1EC}\u{1F1ED}",
  NG: "\u{1F1F3}\u{1F1EC}",
  ZA: "\u{1F1FF}\u{1F1E6}",
};

export default function CountrySelectorModal({ onDone }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("country");
  const [selectedCountry, setSelectedCountry] = useState(null);

  const handleCountrySelect = (country) => {
    if (country.status === "coming_soon") {
      // Redirect to expansion page - navigate first, then close modal
      // Note: Don't call onDone() here as it triggers page reload which interrupts navigation
      navigate(`/launch-country?country=${country.code}`);
      return;
    }

    // Active country — proceed to region selection
    setSelectedCountry(country);
    if (country.regions.length > 0) {
      setStep("region");
    } else {
      saveAndClose(country.code, null);
    }
  };

  const handleRegionSelect = (region) => {
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
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition ${
                  country.status === "active"
                    ? "hover:bg-green-50 hover:border-green-400 border-green-200 bg-green-50/30"
                    : "hover:bg-slate-50 hover:border-slate-300"
                }`}
                data-testid={`country-${country.code}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{FLAGS[country.code] || "\u{1F30D}"}</span>
                  <div className="text-left">
                    <span className="font-medium block">{country.name}</span>
                    {country.status === "active" ? (
                      <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Coming Soon
                      </span>
                    )}
                  </div>
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
            Back to country selection
          </button>
        )}
      </div>
    </div>
  );
}
