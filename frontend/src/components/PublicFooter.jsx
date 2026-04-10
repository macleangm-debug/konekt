import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { useMarketSettings } from "../hooks/useMarketSettings";
import { useBranding } from "../contexts/BrandingContext";

export default function PublicFooter() {
  const market = useMarketSettings();
  const { brand_name, legal_name } = useBranding();
  return (
    <footer className="bg-[#20364D] text-white mt-20" data-testid="public-footer">
      {/* Pre-footer CTA strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap gap-4 items-center justify-between">
          <div className="font-semibold">Need a custom quote or service request?</div>
          <div className="flex gap-3 flex-wrap">
            <Link 
              to="/services" 
              className="rounded-xl bg-[#D4A843] text-[#20364D] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition-colors"
              data-testid="footer-start-request-btn"
            >
              Start a Request
            </Link>
            <Link 
              to="/account/referrals" 
              className="rounded-xl border border-white/20 px-5 py-3 font-semibold hover:bg-white/5 transition-colors"
              data-testid="footer-refer-earn-btn"
            >
              Refer & Earn
            </Link>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 xl:grid-cols-5 gap-8">
        {/* Brand */}
        <div>
          <div className="text-2xl font-bold">{brand_name}</div>
          <p className="text-slate-300 mt-4 text-sm leading-relaxed">
            Custom branding, office solutions, creative services, maintenance support, and business operations tools.
          </p>
        </div>

        {/* Products & Services */}
        <div>
          <div className="font-semibold mb-4">Products & Services</div>
          <div className="space-y-3 text-slate-300 text-sm">
            <Link to="/products" className="block hover:text-white transition-colors">Promotional Materials</Link>
            <Link to="/products" className="block hover:text-white transition-colors">Office Equipment</Link>
            <Link to="/services" className="block hover:text-white transition-colors">Creative Services</Link>
            <Link to="/services/maintenance" className="block hover:text-white transition-colors">Maintenance & Support</Link>
            <Link to="/services" className="block hover:text-white transition-colors">Copywriting</Link>
          </div>
        </div>

        {/* Company */}
        <div>
          <div className="font-semibold mb-4">Company</div>
          <div className="space-y-3 text-slate-300 text-sm">
            <Link to="/about" className="block hover:text-white transition-colors">About Us</Link>
            <Link to="/how-it-works" className="block hover:text-white transition-colors">How It Works</Link>
            <Link to="/contact" className="block hover:text-white transition-colors">Contact</Link>
            <Link to="/partners/apply" className="block hover:text-white transition-colors">Partner Program</Link>
            <Link to="/account/referrals" className="block hover:text-white transition-colors">Referral Program</Link>
          </div>
        </div>

        {/* Support */}
        <div>
          <div className="font-semibold mb-4">Support</div>
          <div className="space-y-3 text-slate-300 text-sm">
            <Link to="/track-order" className="block hover:text-white transition-colors">Track Order</Link>
            <Link to="/payment-info" className="block hover:text-white transition-colors">Payment Options</Link>
            <Link to="/delivery-info" className="block hover:text-white transition-colors">Delivery Information</Link>
            <Link to="/privacy" className="block hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="block hover:text-white transition-colors">Terms & Conditions</Link>
          </div>
        </div>

        {/* Contact */}
        <div>
          <div className="font-semibold mb-4">Get in Touch</div>
          <div className="space-y-3 text-slate-300 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>{market.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{market.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{market.address}</span>
            </div>
            <a 
              href="https://wa.me/" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:bg-[#1fb855] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 text-sm text-slate-300 flex flex-wrap gap-3 justify-between">
          <div>&copy; {new Date().getFullYear()} {legal_name || brand_name}. All rights reserved.</div>
          <div>Built for world-class ordering, branding, and business support.</div>
        </div>
      </div>
    </footer>
  );
}
