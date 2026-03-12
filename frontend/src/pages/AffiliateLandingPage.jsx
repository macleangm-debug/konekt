import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, ArrowRight, ShoppingBag, Sparkles, Percent } from "lucide-react";
import { affiliateApi } from "../lib/affiliateApi";

export default function AffiliateLandingPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await affiliateApi.getAffiliateByCode(code);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || "Invalid affiliate code");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Partner Code</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all"
          >
            Go to Homepage <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="affiliate-landing-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2D3E50] via-[#243243] to-[#1A2430]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#D4A843,_transparent_25%)]" />
        
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white mb-6">
              <Sparkles className="w-4 h-4 text-[#D4A843]" />
              Partner Offer
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Exclusive Offer from
              <span className="text-[#D4A843] block mt-2">{data.name || 'Konekt Partner'}</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-200 max-w-2xl mx-auto">
              {data.message}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Promo Code Card */}
      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Promo Info */}
              <div>
                <div className="inline-flex items-center gap-2 bg-[#D4A843]/10 text-[#D4A843] px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Percent className="w-4 h-4" />
                  Partner Discount
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                  Use this promo code
                </h2>
                
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-6">
                  <div className="text-sm text-slate-500 mb-2">Promo Code</div>
                  <div className="text-3xl md:text-4xl font-bold font-mono text-primary tracking-wider" data-testid="affiliate-code-display">
                    {data.affiliate_code}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/products?affiliate=${encodeURIComponent(data.affiliate_code)}`}
                    className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#bf953b] text-slate-900 px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                    data-testid="shop-with-code-btn"
                  >
                    Shop with Code <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 px-6 py-3.5 rounded-xl font-medium transition-all"
                  >
                    Browse Products
                  </Link>
                </div>
              </div>

              {/* Right: Benefits */}
              <div className="bg-slate-50 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">
                  What you'll get
                </h3>
                
                <div className="space-y-4">
                  {[
                    { icon: <Gift className="w-5 h-5" />, text: "Special partner pricing" },
                    { icon: <ShoppingBag className="w-5 h-5" />, text: "Quality branded merchandise" },
                    { icon: <Sparkles className="w-5 h-5" />, text: "Professional design services" },
                  ].map((benefit, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#D4A843]">
                        {benefit.icon}
                      </div>
                      <span className="text-slate-700">{benefit.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-slate-600 mb-8">
            Use promo code <span className="font-bold text-primary">{data.affiliate_code}</span> at checkout
          </p>
          <Link
            to={`/products?affiliate=${encodeURIComponent(data.affiliate_code)}`}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg"
          >
            Start Shopping <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
