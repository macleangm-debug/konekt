import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Gift, FileText, Users } from "lucide-react";
import BrandLogo from "../branding/BrandLogo";
import { useMarketSettings } from "../../hooks/useMarketSettings";

export default function PremiumFooterV2() {
  const market = useMarketSettings();
  return (
    <footer className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white" data-testid="premium-footer">
      <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 xl:grid-cols-5 gap-10">
        <div className="xl:col-span-2">
          <BrandLogo size="lg" variant="light" className="mb-4" />
          <p className="text-white/60 mt-0 max-w-md leading-relaxed text-sm">
            Business products, services, and fulfillment support through one connected ecosystem.
          </p>
          <div className="flex gap-4 mt-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition cursor-pointer">
              <Mail className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition cursor-pointer">
              <Phone className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div>
          <div className="font-bold mb-4">Marketplace</div>
          <div className="space-y-3 text-slate-300">
            <Link to="/marketplace" className="block hover:text-white transition">Browse listings</Link>
            <Link to="/services" className="block hover:text-white transition">Services</Link>
            <Link to="/request-quote" className="block hover:text-white transition flex items-center gap-2">
              <FileText className="w-4 h-4" /> Request Quote
            </Link>
            <Link to="/track-order" className="block hover:text-white transition">Track order</Link>
          </div>
        </div>

        <div>
          <div className="font-bold mb-4">Business</div>
          <div className="space-y-3 text-slate-300">
            <Link to="/account/referrals" className="block hover:text-[#D4A843] transition flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#D4A843]" /> Referrals & Rewards
            </Link>
            <Link to="/launch-country" className="block hover:text-white transition">Country expansion</Link>
            <Link to="/login" className="block hover:text-white transition">Partner portal</Link>
            <Link to="/dashboard" className="block hover:text-white transition">Customer account</Link>
          </div>
        </div>

        <div>
          <div className="font-bold mb-4">Support</div>
          <div className="space-y-3 text-slate-300">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {market.email}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {market.phone}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {market.address}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <Link to="/staff-login" className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> Staff Portal
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 text-sm text-slate-400 flex flex-col md:flex-row gap-3 justify-between">
          <div>© {new Date().getFullYear()} Konekt. All rights reserved.</div>
          <div>Built for modern African business operations.</div>
        </div>
      </div>
    </footer>
  );
}
