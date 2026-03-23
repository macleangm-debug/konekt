import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const DEFAULTS = {
  company_name: "Konekt",
  logo_url: "/branding/konekt-logo-full.png",
  icon_url: "/branding/konekt-icon.png",
  company_email: "hello@konekt.co.tz",
  company_phone: "+255 000 000 000",
  company_address: "Dar es Salaam, Tanzania",
};

export default function useBrandingSettings() {
  const [data, setData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/admin/branding-settings`)
      .then((res) => setData({ ...DEFAULTS, ...(res.data || {}) }))
      .catch(() => setData(DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
