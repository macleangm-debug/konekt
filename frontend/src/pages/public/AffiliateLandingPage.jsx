import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Link2, ShoppingBag, Wallet,
  BarChart3, Shield, Users, TrendingUp,
  CheckCircle2,
} from "lucide-react";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PremiumFooterV2 from "../../components/public/PremiumFooterV2";

export default function AffiliateLandingPage() {
  return (
    <div className="min-h-screen bg-white" data-testid="affiliate-landing-page">
      <PublicNavbarV2 />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0E1A2B] text-white" data-testid="affiliate-hero">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A843]/15 border border-[#D4A843]/30 px-4 py-1.5">
              <Wallet className="w-4 h-4 text-[#D4A843]" />
              <span className="text-[#D4A843] text-sm font-semibold">Affiliate Program</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.15] tracking-tight" data-testid="affiliate-headline">
              Earn with Konekt
              <span className="text-[#D4A843]"> — Share Products Businesses Already Need</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Promote real business products and services through your network. Earn commission on every qualifying order — with full transparency on your campaigns and earnings.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/register/affiliate"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-bold hover:bg-[#c49a3d] transition"
                data-testid="join-affiliate-btn"
              >
                Join as Affiliate <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 font-semibold hover:bg-white/10 transition"
                data-testid="affiliate-login-btn"
              >
                Affiliate Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-16 md:py-20" data-testid="affiliate-how-it-works">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">How It Works</h2>
            <p className="text-slate-600 mt-3 text-base md:text-lg">
              Three simple steps to start earning with Konekt.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                num: "1", Icon: Link2,
                title: "Share Your Link",
                text: "Get your unique affiliate link and share it with colleagues, businesses, and your network. Use campaign links for specific promotions.",
              },
              {
                num: "2", Icon: ShoppingBag,
                title: "They Order",
                text: "When someone places a qualifying order through your link, the system automatically tracks the attribution to your account.",
              },
              {
                num: "3", Icon: Wallet,
                title: "Earn Commission",
                text: "Earn commission on every valid, completed sale. Track your earnings clearly in your affiliate dashboard.",
              },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl bg-white border p-6 hover:shadow-lg transition-shadow group" data-testid={`step-${step.num}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-full bg-[#20364D] text-white flex items-center justify-center text-sm font-bold">
                    {step.num}
                  </span>
                  <step.Icon className="w-5 h-5 text-[#D4A843] group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-lg font-bold text-[#20364D] mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-16 md:py-20" data-testid="affiliate-why-join">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">Why Join the Konekt Affiliate Program?</h2>
            <p className="text-slate-600 mt-3 text-base md:text-lg">
              Real products, transparent earnings, and a program built for serious promoters.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { Icon: ShoppingBag, title: "Real Products", text: "Promote actual business products and services that companies use every day." },
              { Icon: BarChart3, title: "Clear Dashboard", text: "Track campaigns, clicks, conversions, and earnings in one transparent dashboard." },
              { Icon: Shield, title: "No Inventory Risk", text: "Share links and earn. Konekt handles orders, payment, and delivery." },
              { Icon: TrendingUp, title: "Recurring Revenue", text: "Build a portfolio of referral clients. Earn on ongoing orders from your network." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border bg-white p-6" data-testid={`benefit-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                  <item.Icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-[#20364D] mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section className="bg-slate-50 py-16 md:py-20" data-testid="affiliate-who-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">Who Is This For?</h2>
              <p className="text-slate-600 mt-3 text-base md:text-lg leading-relaxed">
                Anyone with a network of businesses who need products and services. From sales professionals to business consultants — if you know people who buy, you can earn with Konekt.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Sales professionals and business consultants",
                  "Industry connectors and procurement advisors",
                  "Social media marketers and content creators",
                  "Business community leaders and associations",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#0E1A2B] text-white p-8 md:p-10">
              <h3 className="text-xl font-bold mb-4">Program Guidelines</h3>
              <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                <p>
                  Affiliate commissions are governed by Konekt's margin protection rules. This ensures promotional activity supports business growth without impacting pricing integrity.
                </p>
                <p>
                  Commissions are paid only on valid, completed orders. Your dashboard shows real-time attribution so there are no surprises.
                </p>
                <p>
                  All affiliates must comply with Konekt's promotional guidelines. Misleading claims or unauthorized branding will result in account suspension.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20" data-testid="affiliate-cta-section">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D] mb-3">
            Ready to Start Earning?
          </h2>
          <p className="text-slate-600 text-base md:text-lg max-w-xl mx-auto mb-8">
            Join the Konekt affiliate program and start earning commission on qualifying business orders today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register/affiliate"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-bold hover:bg-[#c49a3d] transition"
              data-testid="cta-join-affiliate-btn"
            >
              Join as Affiliate <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#20364D] text-[#20364D] px-7 py-3.5 font-semibold hover:bg-[#20364D] hover:text-white transition"
              data-testid="cta-browse-products-btn"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>

      <PremiumFooterV2 />
    </div>
  );
}
