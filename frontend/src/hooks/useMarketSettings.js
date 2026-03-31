import { useState, useEffect } from "react";

const API = process.env.REACT_APP_BACKEND_URL;

let cachedSettings = null;

export function useMarketSettings() {
  const [settings, setSettings] = useState(cachedSettings || {
    phone: "+255 759 110 453",
    email: "sales@konekt.co.tz",
    currency_code: "TZS",
    currency_symbol: "TZS",
    date_format: "DD/MM/YYYY",
    default_phone_prefix: "+255",
    default_phone_prefix_label: "TZ +255",
    business_hours: "Mon-Fri, 9am - 6pm EAT",
    address: "Dar es Salaam, Tanzania",
    company_name: "Konekt",
  });

  useEffect(() => {
    if (cachedSettings) return;
    fetch(`${API}/api/market-settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.phone) {
          cachedSettings = data;
          setSettings(data);
        }
      })
      .catch(() => {});
  }, []);

  return settings;
}
