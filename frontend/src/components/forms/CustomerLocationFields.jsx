import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import api from "../../lib/api";

/**
 * CustomerLocationFields - Reusable component for capturing customer location
 * Used in Lead/Customer creation forms, Quote creation, etc.
 * 
 * Props:
 * - countryCode: string - Current country code (e.g., "TZ")
 * - region: string - Current region
 * - onCountryChange: (code: string) => void
 * - onRegionChange: (region: string) => void
 * - showLabel: boolean - Whether to show labels (default: true)
 * - required: boolean - Whether fields are required (default: false)
 * - className: string - Additional CSS classes for container
 */
export default function CustomerLocationFields({
  countryCode = "TZ",
  region = "",
  onCountryChange,
  onRegionChange,
  showLabel = true,
  required = false,
  className = "",
}) {
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingRegions, setLoadingRegions] = useState(false);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        // Trigger seed if needed (idempotent)
        await api.post("/api/geography/seed").catch(() => {});
        const res = await api.get("/api/geography/countries");
        setCountries(res.data || []);
      } catch (error) {
        console.error("Failed to load countries:", error);
      } finally {
        setLoadingCountries(false);
      }
    };
    loadCountries();
  }, []);

  // Load regions when country changes
  useEffect(() => {
    const loadRegions = async () => {
      if (!countryCode) {
        setRegions([]);
        return;
      }
      setLoadingRegions(true);
      try {
        const res = await api.get(`/api/geography/regions/${countryCode}`);
        setRegions(res.data || []);
      } catch (error) {
        console.error("Failed to load regions:", error);
        setRegions([]);
      } finally {
        setLoadingRegions(false);
      }
    };
    loadRegions();
  }, [countryCode]);

  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    onCountryChange?.(newCode);
    // Reset region when country changes
    onRegionChange?.("");
  };

  const handleRegionChange = (e) => {
    onRegionChange?.(e.target.value);
  };

  return (
    <div className={`grid md:grid-cols-2 gap-4 ${className}`} data-testid="customer-location-fields">
      {/* Country Select */}
      <div>
        {showLabel && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Country {required && <span className="text-red-500">*</span>}
            </span>
          </label>
        )}
        <select
          className="w-full border rounded-xl px-4 py-3 bg-white disabled:bg-slate-100"
          value={countryCode}
          onChange={handleCountryChange}
          disabled={loadingCountries}
          required={required}
          data-testid="customer-country-select"
        >
          {loadingCountries ? (
            <option value="">Loading countries...</option>
          ) : (
            <>
              <option value="">Select Country</option>
              {countries.map((c) => (
                <option key={c.id || c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* Region Select */}
      <div>
        {showLabel && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Region {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <select
          className="w-full border rounded-xl px-4 py-3 bg-white disabled:bg-slate-100"
          value={region}
          onChange={handleRegionChange}
          disabled={loadingRegions || !countryCode || regions.length === 0}
          required={required}
          data-testid="customer-region-select"
        >
          {loadingRegions ? (
            <option value="">Loading regions...</option>
          ) : regions.length === 0 ? (
            <option value="">No regions available</option>
          ) : (
            <>
              <option value="">Select Region</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </>
          )}
        </select>
      </div>
    </div>
  );
}
