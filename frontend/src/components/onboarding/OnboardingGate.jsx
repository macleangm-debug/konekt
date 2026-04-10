import React, { useEffect, useState, useCallback } from "react";
import OnboardingWizard from "./OnboardingWizard";
import api from "../../lib/api";

export default function OnboardingGate({ children }) {
  const [show, setShow] = useState(false);
  const [role, setRole] = useState("customer");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const token = localStorage.getItem("konekt_token") || localStorage.getItem("konekt_admin_token") || localStorage.getItem("partner_token");
        if (!token) { setChecking(false); return; }

        const res = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        const user = res.data;
        if (!user) { setChecking(false); return; }

        const userRole = user.role || "customer";
        setRole(userRole);

        // Backend is the source of truth
        if (user.onboarding_completed) {
          setChecking(false);
          return;
        }

        // Show onboarding
        setShow(true);
      } catch {
        // If auth check fails, don't block the app
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  const completeOnboarding = useCallback(async () => {
    setShow(false);
    try {
      const token = localStorage.getItem("konekt_token") || localStorage.getItem("konekt_admin_token") || localStorage.getItem("partner_token");
      await api.post("/api/auth/onboarding-complete", {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // Non-critical — UI already dismissed
    }
  }, []);

  if (checking) return children;

  return (
    <>
      {show && (
        <OnboardingWizard
          role={role}
          onDone={completeOnboarding}
          onSkip={completeOnboarding}
        />
      )}
      {children}
    </>
  );
}
