import React from "react";
import { Link } from "react-router-dom";
import { Package, Palette, Truck, MessageCircle, HelpCircle, Phone } from "lucide-react";

export default function HelpPageV3() {
  return (
    <div className="max-w-6xl mx-auto space-y-10" data-testid="help-page-v3">
      {/* Hero Section */}
      <div className="rounded-[2.5rem] bg-[#20364D] text-white p-10">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-[#F4E7BF] mb-3">SUPPORT CENTER</div>
          <h1 className="text-4xl font-bold">How can we help you?</h1>
          <p className="mt-4 text-slate-200 text-lg">
            Order products, request services, or let our team assist you — all in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link 
              to="/account/marketplace" 
              className="flex items-center gap-2 bg-white text-[#20364D] px-6 py-3 rounded-xl font-semibold hover:bg-slate-100 transition"
              data-testid="browse-products-btn"
            >
              <Package className="w-5 h-5" />
              Browse Products
            </Link>
            <Link 
              to="/account/services" 
              className="flex items-center gap-2 bg-[#F4E7BF] text-[#8B6A10] px-6 py-3 rounded-xl font-semibold hover:bg-[#e8dbb3] transition"
              data-testid="request-service-btn"
            >
              <Palette className="w-5 h-5" />
              Request Service
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Help Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-2xl bg-white hover:shadow-lg transition group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-lg text-[#20364D]">Ordering Products</h3>
          <p className="text-sm text-slate-600 mt-2 mb-4">
            Browse our marketplace, add items to cart, complete checkout, and track your delivery.
          </p>
          <Link to="/account/marketplace" className="text-[#20364D] font-semibold hover:underline flex items-center gap-1">
            Go to Marketplace
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="p-6 border rounded-2xl bg-white hover:shadow-lg transition group">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition">
            <Palette className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-lg text-[#20364D]">Requesting Services</h3>
          <p className="text-sm text-slate-600 mt-2 mb-4">
            Fill a quick request form or let our sales team prepare a custom quote for you.
          </p>
          <Link to="/account/services" className="text-[#20364D] font-semibold hover:underline flex items-center gap-1">
            Request Service
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="p-6 border rounded-2xl bg-white hover:shadow-lg transition group">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4 group-hover:bg-green-100 transition">
            <Truck className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-lg text-[#20364D]">Payments & Tracking</h3>
          <p className="text-sm text-slate-600 mt-2 mb-4">
            Review and approve quotes, pay via bank transfer, and track your order progress.
          </p>
          <Link to="/account/orders" className="text-[#20364D] font-semibold hover:underline flex items-center gap-1">
            Track Orders
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-2xl bg-white">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-5 h-5 text-[#20364D]" />
            <h3 className="font-bold text-[#20364D]">Frequently Asked Questions</h3>
          </div>
          <div className="space-y-4">
            <div className="pb-4 border-b">
              <div className="font-medium text-slate-800">How long does delivery take?</div>
              <div className="text-sm text-slate-500 mt-1">Standard delivery is 3-5 business days within Dar es Salaam.</div>
            </div>
            <div className="pb-4 border-b">
              <div className="font-medium text-slate-800">What payment methods do you accept?</div>
              <div className="text-sm text-slate-500 mt-1">Bank transfer, mobile money, and corporate invoicing.</div>
            </div>
            <div>
              <div className="font-medium text-slate-800">Can I get a custom quote?</div>
              <div className="text-sm text-slate-500 mt-1">Yes! Use our "Request Service" or "Talk to Sales" options.</div>
            </div>
          </div>
        </div>

        <div className="p-6 border rounded-2xl bg-white">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-5 h-5 text-[#20364D]" />
            <h3 className="font-bold text-[#20364D]">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            <Link to="/dashboard/quotes" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
              <span className="text-slate-700">View My Quotes</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/dashboard/invoices" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
              <span className="text-slate-700">View My Invoices</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/account/orders" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
              <span className="text-slate-700">Track My Orders</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="rounded-2xl border p-8 bg-gradient-to-br from-slate-50 to-white text-center">
        <div className="w-16 h-16 rounded-full bg-[#20364D] flex items-center justify-center mx-auto mb-4">
          <Phone className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-[#20364D]">
          Still need help?
        </h2>
        <p className="text-slate-600 mt-2 max-w-md mx-auto">
          Our sales team is ready to assist you with custom orders, bulk pricing, or any questions you may have.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mt-6">
          <Link 
            to="/account/assisted-quote" 
            className="inline-flex items-center gap-2 bg-[#20364D] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#2a4563] transition"
            data-testid="talk-to-sales-btn"
          >
            <MessageCircle className="w-5 h-5" />
            Talk to Sales
          </Link>
          <a 
            href="mailto:support@konekt.co.tz" 
            className="inline-flex items-center gap-2 border border-[#20364D] text-[#20364D] px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
}
