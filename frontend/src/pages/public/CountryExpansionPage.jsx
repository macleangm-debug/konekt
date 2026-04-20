import React, { useState } from "react";
import { MapPin, Send, CheckCircle, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const COUNTRY_INFO = {
  KE: { name: "Kenya", flag: "\u{1F1F0}\u{1F1EA}", currency: "KES", city: "Nairobi" },
  UG: { name: "Uganda", flag: "\u{1F1FA}\u{1F1EC}", currency: "UGX", city: "Kampala" },
};

export default function CountryExpansionPage({ countryCode = "KE" }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("customer");
  const [submitted, setSubmitted] = useState(false);

  const info = COUNTRY_INFO[countryCode] || COUNTRY_INFO.KE;

  const submit = async () => {
    if (!email) { toast.error("Please enter your email"); return; }
    try {
      await api.post("/api/feedback", {
        category: "feature_request",
        description: `Country expansion interest — ${info.name}: ${name} (${email}), Type: ${type}`,
        user_email: email,
        user_name: name,
        user_role: type,
        page_url: window.location.href,
      });
      setSubmitted(true);
    } catch {
      toast.error("Failed to register interest");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#20364D] to-[#0f1f33] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You're on the list!</h1>
          <p className="text-slate-300">We'll notify you as soon as Konekt launches in {info.name}. Thank you for your interest.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#20364D] to-[#0f1f33] flex items-center justify-center px-6" data-testid="expansion-page">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-4">{info.flag}</div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Konekt is coming to {info.name}
        </h1>
        <p className="text-slate-300 mb-8">
          We're expanding our B2B procurement platform to {info.city}. Register your interest to be among the first to join.
        </p>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase">I am a...</label>
            <div className="flex gap-2 mt-2">
              {[
                { key: "customer", label: "Business / Buyer" },
                { key: "vendor", label: "Vendor / Supplier" },
                { key: "sales", label: "Sales Agent" },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${type === t.key ? "bg-[#D4A843] text-[#17283C]" : "bg-white/10 text-white hover:bg-white/20"}`}
                  data-testid={`type-${t.key}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name or company name"
              className="w-full mt-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50"
              data-testid="expansion-name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full mt-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50"
              data-testid="expansion-email"
            />
          </div>
          <button
            onClick={submit}
            className="w-full py-3 rounded-xl bg-[#D4A843] text-[#17283C] font-bold text-sm hover:bg-[#c49a3d] transition flex items-center justify-center gap-2"
            data-testid="expansion-submit"
          >
            <Send className="w-4 h-4" /> Register My Interest
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          Already operating in Tanzania {"\u{1F1F9}\u{1F1FF}"}
        </p>
      </div>
    </div>
  );
}
