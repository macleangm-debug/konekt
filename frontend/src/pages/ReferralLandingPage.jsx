import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, ArrowRight, Users, ShoppingBag, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { referralApi } from "../lib/referralApi";

export default function ReferralLandingPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await referralApi.getReferralByCode(code);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || "Invalid referral code");
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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Referral Code</h1>
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

  const benefits = [
    { icon: <Gift className="w-5 h-5" />, text: `Save TZS ${Number(data.discount_amount || 5000).toLocaleString("en-US")} on your first order` },
    { icon: <ShoppingBag className="w-5 h-5" />, text: "Access to premium branded products" },
    { icon: <Users className="w-5 h-5" />, text: "Join 500+ happy businesses" },
  ];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="referral-landing-page">
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
              Referral Invitation
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              You've been invited to
              <span className="text-[#D4A843] block mt-2">Konekt</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-200 max-w-2xl mx-auto">
              {data.referrer_name} shared a special invitation with you.
              Sign up now and <span className="font-bold text-[#D4A843]">save TZS {Number(data.discount_amount || 5000).toLocaleString("en-US")}</span> on your first order!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Referral Card */}
      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Referral Info */}
              <div>
                <div className="inline-flex items-center gap-2 bg-[#D4A843]/10 text-[#D4A843] px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Gift className="w-4 h-4" />
                  Your Exclusive Referral
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                  Use this code at signup
                </h2>
                
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-6">
                  <div className="text-sm text-slate-500 mb-2">Referral Code</div>
                  <div className="text-3xl md:text-4xl font-bold font-mono text-primary tracking-wider" data-testid="referral-code-display">
                    {data.referral_code}
                  </div>
                </div>

                <p className="text-slate-600 mb-6">
                  {data.message}
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/auth?ref=${encodeURIComponent(data.referral_code)}`}
                    className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#bf953b] text-slate-900 px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                    data-testid="create-account-btn"
                  >
                    Create Account <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 px-6 py-3.5 rounded-xl font-medium transition-all"
                  >
                    Explore Products
                  </Link>
                </div>
              </div>

              {/* Right: Benefits */}
              <div className="bg-slate-50 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">
                  What you'll get with Konekt
                </h3>
                
                <div className="space-y-4">
                  {benefits.map((benefit, idx) => (
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

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-slate-600">
                      Trusted by businesses across Tanzania
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            Why businesses choose Konekt
          </h2>
          <p className="mt-3 text-slate-600">
            Everything your business needs for branded merchandise and design services
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Promotional Materials",
              desc: "T-shirts, caps, mugs, notebooks, banners — all customizable with your brand.",
              color: "from-blue-500 to-blue-600",
            },
            {
              title: "Creative Services",
              desc: "Logo design, company profiles, brochures, flyers — all delivered remotely.",
              color: "from-purple-500 to-purple-600",
            },
            {
              title: "Office Equipment",
              desc: "Reliable office tools and accessories for modern teams and workspaces.",
              color: "from-emerald-500 to-emerald-600",
            },
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4`}>
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-slate-600 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#2D3E50] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-slate-300 mb-8">
            Use your referral code and enjoy {data.discount_percent || 10}% off your first order
          </p>
          <Link
            to={`/auth?ref=${encodeURIComponent(data.referral_code)}`}
            className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#bf953b] text-slate-900 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg"
          >
            Create Your Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
