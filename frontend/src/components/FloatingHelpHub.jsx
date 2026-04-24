import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircle, Sparkles, MessageSquare, X } from "lucide-react";
import AIChatWidget from "@/components/AIChatWidget";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";

// Pages where the floating hub should NOT appear at all
const HIDDEN_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/staff-login",
  "/partner-login",
  "/checkout",
  "/account/checkout",
];

/**
 * FloatingHelpHub — single animated FAB that expands into two choices:
 *   1. Chat with Mr. Konekt (AI assistant)
 *   2. Give us Feedback
 *
 * Visual style: HelpCircle with pulsing aura rings + bouncing accent dot.
 * Animation style is retained from the legacy Feedback widget trigger.
 */
export default function FloatingHelpHub() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const containerRef = useRef(null);

  // Sync cart drawer state — hide hub when cart is open (matches prior AI widget behaviour)
  useEffect(() => {
    const handler = (e) => setCartOpen(e.detail?.open ?? false);
    window.addEventListener("konekt-cart-state", handler);
    return () => window.removeEventListener("konekt-cart-state", handler);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const currentPath = location.pathname;
  const hidden = HIDDEN_PATHS.some((p) => currentPath === p || currentPath.startsWith(p + "/"));
  // Hide when a child panel is open — their own panels take over
  const anyPanelOpen = chatOpen || feedbackOpen;

  const openChat = () => {
    setMenuOpen(false);
    setFeedbackOpen(false);
    setChatOpen(true);
  };
  const openFeedback = () => {
    setMenuOpen(false);
    setChatOpen(false);
    setFeedbackOpen(true);
  };

  return (
    <>
      {/* Controlled child panels — trigger-less */}
      <AIChatWidget
        controlled
        hideTrigger
        isOpen={chatOpen}
        onOpenChange={setChatOpen}
      />
      <FeedbackWidget
        controlled
        hideTrigger
        isOpen={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />

      {/* Floating hub launcher */}
      {!hidden && !cartOpen && !anyPanelOpen && (
        <div
          ref={containerRef}
          className="fixed bottom-6 left-6 z-[9998]"
          data-testid="floating-help-hub"
        >
          {/* Speed-dial options */}
          <div
            className={`absolute bottom-20 left-0 flex flex-col items-start gap-3 transition-all duration-300 ${
              menuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <button
              onClick={openChat}
              data-testid="help-hub-option-chat"
              className="group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full bg-white shadow-xl border border-slate-200 hover:border-[#D4A843] hover:shadow-2xl transition-all duration-200"
              style={{ transitionDelay: menuOpen ? "120ms" : "0ms" }}
            >
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#20364D] to-[#17283C] text-[#D4A843] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4" strokeWidth={2.25} />
              </span>
              <span className="text-xs font-semibold text-[#20364D] whitespace-nowrap">
                Chat with Mr. Konekt
              </span>
            </button>

            <button
              onClick={openFeedback}
              data-testid="help-hub-option-feedback"
              className="group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full bg-white shadow-xl border border-slate-200 hover:border-[#D4A843] hover:shadow-2xl transition-all duration-200"
              style={{ transitionDelay: menuOpen ? "60ms" : "0ms" }}
            >
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#20364D] to-[#17283C] text-[#D4A843] flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" strokeWidth={2.25} />
              </span>
              <span className="text-xs font-semibold text-[#20364D] whitespace-nowrap">
                Give us Feedback
              </span>
            </button>
          </div>

          {/* Main trigger — retains the Feedback widget animated style */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            data-testid="help-hub-trigger"
            aria-label={menuOpen ? "Close help menu" : "Open help menu"}
            aria-expanded={menuOpen}
            className="relative group feedback-launcher"
          >
            {/* Pulse aura rings — attention */}
            {!menuOpen && (
              <>
                <span className="absolute inset-0 rounded-full bg-[#D4A843]/30 animate-ping" aria-hidden="true" />
                <span className="absolute inset-0 rounded-full bg-[#D4A843]/20 animate-pulse" aria-hidden="true" />
              </>
            )}
            {/* Orbiting accent dot */}
            {!menuOpen && (
              <span
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4A843] border-2 border-white shadow-sm animate-bounce"
                aria-hidden="true"
              />
            )}
            {/* Main button */}
            <span
              className={`relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#20364D] to-[#17283C] text-white shadow-xl transition-all duration-300 ${
                menuOpen ? "scale-105 rotate-180" : "group-hover:scale-110 group-hover:shadow-2xl"
              }`}
            >
              {menuOpen ? (
                <X className="w-6 h-6" strokeWidth={2.5} />
              ) : (
                <HelpCircle
                  className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300"
                  strokeWidth={2.25}
                />
              )}
            </span>
            {/* Expanding label on hover (only when closed) */}
            {!menuOpen && (
              <span className="absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#20364D] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
                Need help?
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
}
