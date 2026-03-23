import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import { 
  Package, Palette, Building, ArrowRight, ArrowLeft,
  CheckCircle, Sparkles, Target
} from "lucide-react";

const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "needs", title: "What do you need?" },
  { id: "business", title: "Business Type" },
  { id: "complete", title: "All Set!" },
];

const BUSINESS_TYPES = [
  { id: "corporate", label: "Corporate / Enterprise", icon: Building },
  { id: "sme", label: "Small/Medium Business", icon: Target },
  { id: "startup", label: "Startup", icon: Sparkles },
  { id: "ngo", label: "NGO / Government", icon: Building },
  { id: "individual", label: "Individual / Freelancer", icon: Package },
];

const NEEDS_OPTIONS = [
  { id: "products", label: "Products", description: "Office supplies, promotional items, equipment", icon: Package },
  { id: "services", label: "Services", description: "Design, printing, branding services", icon: Palette },
  { id: "both", label: "Both Products & Services", description: "Complete branding solutions", icon: Sparkles },
];

/**
 * Onboarding Wizard - First-time user guidance
 */
export default function OnboardingWizard({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState({
    needs: null,
    businessType: null,
    companyName: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const currentStep = STEPS[step];

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save preferences to user profile
      await api.patch("/api/auth/me", {
        preferences: preferences,
        onboarding_completed: true,
      });
      
      toast.success("Welcome to Konekt! Let's get started.");
      
      // Navigate based on selected needs
      if (preferences.needs === "products") {
        navigate("/account/marketplace");
      } else if (preferences.needs === "services") {
        navigate("/account/services");
      } else {
        navigate("/dashboard");
      }
      
      if (onComplete) onComplete();
    } catch (err) {
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem("onboarding_skipped", "true");
    if (onComplete) onComplete();
    navigate("/dashboard");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="onboarding-wizard">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-slate-100">
          <div 
            className="h-full bg-[#20364D] transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step: Welcome */}
          {currentStep.id === "welcome" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-[#20364D] flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-[#20364D]">Welcome to Konekt!</h1>
              <p className="text-slate-600 text-lg max-w-md mx-auto">
                Your one-stop platform for promotional materials, office supplies, and creative services.
              </p>
              <p className="text-slate-500">
                Let's personalize your experience. This takes less than a minute.
              </p>
            </div>
          )}

          {/* Step: What do you need? */}
          {currentStep.id === "needs" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#20364D]">What do you need?</h2>
                <p className="text-slate-500 mt-2">Select what you're looking for</p>
              </div>
              
              <div className="grid gap-4">
                {NEEDS_OPTIONS.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = preferences.needs === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => setPreferences({ ...preferences, needs: option.id })}
                      className={`p-4 rounded-2xl border-2 text-left transition flex items-center gap-4 ${
                        isSelected 
                          ? 'border-[#20364D] bg-[#20364D]/5' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-[#20364D] text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold ${isSelected ? 'text-[#20364D]' : 'text-slate-800'}`}>
                          {option.label}
                        </div>
                        <div className="text-sm text-slate-500">{option.description}</div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-6 h-6 text-[#20364D]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Business Type */}
          {currentStep.id === "business" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#20364D]">Tell us about your business</h2>
                <p className="text-slate-500 mt-2">This helps us show you relevant options</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {BUSINESS_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = preferences.businessType === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => setPreferences({ ...preferences, businessType: type.id })}
                      className={`p-4 rounded-xl border-2 transition ${
                        isSelected 
                          ? 'border-[#20364D] bg-[#20364D]/5' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <IconComponent className={`w-6 h-6 mx-auto mb-2 ${
                        isSelected ? 'text-[#20364D]' : 'text-slate-400'
                      }`} />
                      <div className={`text-sm font-medium ${
                        isSelected ? 'text-[#20364D]' : 'text-slate-700'
                      }`}>
                        {type.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Optional: Company name */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">Company Name (Optional)</label>
                <input
                  type="text"
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Your company name"
                  value={preferences.companyName}
                  onChange={(e) => setPreferences({ ...preferences, companyName: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step: Complete */}
          {currentStep.id === "complete" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-[#20364D]">You're All Set!</h2>
              <p className="text-slate-600 text-lg max-w-md mx-auto">
                We've personalized your experience. Let's start exploring!
              </p>
              
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <button
                  onClick={() => navigate("/account/marketplace")}
                  className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <Package className="w-8 h-8 text-[#20364D] mx-auto mb-2" />
                  <div className="font-medium text-[#20364D]">Browse Products</div>
                </button>
                <button
                  onClick={() => navigate("/account/services")}
                  className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <Palette className="w-8 h-8 text-[#20364D] mx-auto mb-2" />
                  <div className="font-medium text-[#20364D]">Request Service</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <div>
            {step > 0 && step < STEPS.length - 1 && (
              <button 
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {step === 0 && (
              <button 
                onClick={skipOnboarding}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                Skip for now
              </button>
            )}
          </div>
          
          <div>
            {step < STEPS.length - 1 ? (
              <button 
                onClick={handleNext}
                disabled={step === 1 && !preferences.needs}
                className="flex items-center gap-2 bg-[#20364D] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#2a4563] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2 bg-[#20364D] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#2a4563] transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Get Started"}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if onboarding should be shown
 */
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      const skipped = localStorage.getItem("onboarding_skipped");
      if (skipped) return;

      try {
        const res = await api.get("/api/auth/me");
        if (!res.data?.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (err) {
        // Not logged in or error
      }
    };
    checkOnboarding();
  }, []);

  return [showOnboarding, setShowOnboarding];
}
