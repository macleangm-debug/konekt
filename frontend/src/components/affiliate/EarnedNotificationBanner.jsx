import React, { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EarnedNotificationBanner({ token }) {
  const [earnings, setEarnings] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    if (!token) return;
    
    const fetchRecentEarnings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/affiliate/recent-earnings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEarnings(data);
        }
      } catch (err) {
        console.error("Failed to fetch recent earnings:", err);
      }
    };

    fetchRecentEarnings();
  }, [token]);

  const handleDismiss = (id) => {
    setDismissed(prev => [...prev, id]);
  };

  const visibleEarnings = earnings.filter(e => !dismissed.includes(e.id));

  if (visibleEarnings.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="earned-notification-banner">
      {visibleEarnings.map((earning) => (
        <div
          key={earning.id}
          className="relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#D4A843]/10 to-[#C49A3A]/10 border border-[#D4A843]/20 animate-pulse-once"
        >
          <div className="w-12 h-12 rounded-full bg-[#D4A843] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-[#20364D]">
              You just earned {earning.currency} {earning.amount.toLocaleString()}!
            </div>
            <div className="text-sm text-slate-600">
              {earning.commission_type === "affiliate" 
                ? "From your affiliate referral" 
                : "From your sales commission"}
            </div>
          </div>
          <button
            onClick={() => handleDismiss(earning.id)}
            className="absolute top-3 right-3 p-1 hover:bg-white/50 rounded-full transition"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      ))}
    </div>
  );
}
