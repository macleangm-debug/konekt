import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import BrandLogoV2 from './branding/BrandLogoV2';

export default function Footer() {
  return (
    <footer className="bg-primary text-white mt-auto" data-testid="footer">
      <div className="container mx-auto px-6 md:px-12 lg:px-24 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand - LIGHT logo on dark footer */}
          <div>
            <BrandLogoV2 variant="light" kind="full" size="lg" className="mb-4" />
            <p className="text-white/70 text-sm mb-4 leading-relaxed">
              Connecting the Future, Today. Premium promotional products with professional quality and AI-powered design assistance.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-bold mb-4 text-lg">Products</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li><Link to="/products?category=Apparel" className="hover:text-white transition-colors">Corporate Apparel</Link></li>
              <li><Link to="/products?category=Drinkware" className="hover:text-white transition-colors">Branded Drinkware</Link></li>
              <li><Link to="/products?category=Stationery" className="hover:text-white transition-colors">Office Stationery</Link></li>
              <li><Link to="/products?category=Signage" className="hover:text-white transition-colors">Event Signage</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold mb-4 text-lg">Company</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Quality Guarantee</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4 text-lg">Contact</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-secondary" />
                <span>+255 XXX XXX XXX</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-secondary" />
                <span>hello@konekt.co.tz</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-secondary mt-0.5" />
                <span>Dar es Salaam, Tanzania</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-white/50">
          <p>© {new Date().getFullYear()} Konekt Limited. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
