import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const FALLBACK = {
  brand_name: "Konekt",
  legal_name: "KONEKT LIMITED",
  tagline: "Business Procurement Simplified",
  primary_logo_url: "",
  secondary_logo_url: "",
  favicon_url: "",
  primary_color: "#20364D",
  accent_color: "#D4A843",
  dark_bg_color: "#0f172a",
  support_email: "",
  support_phone: "",
  sender_name: "Konekt",
};

const BrandingContext = createContext({ ...FALLBACK, loading: true });

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/api/public/branding`)
      .then((res) => {
        if (!cancelled) setBranding({ ...FALLBACK, ...(res.data || {}) });
      })
      .catch(() => {
        /* keep fallback values */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <BrandingContext.Provider value={{ ...branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
