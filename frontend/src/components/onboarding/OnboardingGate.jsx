import React, { useEffect, useState } from "react";
import OnboardingWizard from "../growth/OnboardingWizard";

export default function OnboardingGate({ user, orderCount = 0, children }) {
  const [showWizard, setShowWizard] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the wizard
    const wasDismissed = localStorage.getItem(`onboarding_dismissed_${user?.id}`);
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show wizard for first login or users with no orders
    const isFirstLogin = !!user?.first_login;
    const hasNoOrders = Number(orderCount || 0) === 0;
    
    if (isFirstLogin || hasNoOrders) {
      setShowWizard(true);
    }
  }, [user, orderCount]);

  const handleWizardDone = () => {
    setShowWizard(false);
    setDismissed(true);
    if (user?.id) {
      localStorage.setItem(`onboarding_dismissed_${user.id}`, "true");
    }
  };

  if (showWizard && !dismissed) {
    return (
      <div className="p-6" data-testid="onboarding-gate">
        <OnboardingWizard onDone={handleWizardDone} />
      </div>
    );
  }

  return children;
}
