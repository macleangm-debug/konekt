import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "konekt_referral";
const TTL_DAYS = 30;
const VALID_RX = /^[A-Z0-9_]{2,20}$/i;

/**
 * Reads `?ref=<code>` from the URL on every navigation and stores it in
 * localStorage with a 30-day TTL. The checkout / order endpoints can then
 * read `localStorage.konekt_referral` to attribute the order to the
 * affiliate / sales rep — even if the customer browsed several pages
 * between the QR scan and the actual order.
 */
export default function ReferralAttribution() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = (params.get("ref") || "").trim().toUpperCase();
    if (!ref || !VALID_RX.test(ref)) return;
    const payload = {
      code: ref,
      expires_at: Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000,
      first_seen: new Date().toISOString(),
      landing_path: location.pathname,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch { /* private mode / quota — silent */ }
  }, [location.search, location.pathname]);

  return null;
}

/** Helper used by checkout to fetch the live referral code (or null) */
export function readReferralCode() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.code || !data.expires_at) return null;
    if (Date.now() > data.expires_at) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data.code;
  } catch { return null; }
}
