import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { heroBannerApi } from "../lib/heroBannerApi";

const fallbackSlides = [
  {
    id: "fallback-1",
    badge_text: "Built for modern business branding",
    title: "Design, Customize & Order Business Branding Online",
    subtitle: "Promotional materials, office equipment, and creative services",
    description:
      "We help businesses anywhere in the world order branded merchandise, office equipment, and design services without visiting the office.",
    primary_cta_label: "Explore Products",
    primary_cta_url: "/products",
    secondary_cta_label: "Start a Design Project",
    secondary_cta_url: "/creative-services",
    quick_steps: [
      "Choose product or service",
      "Customize or upload brief",
      "Approve quote or design",
      "Track production and delivery",
    ],
  },
  {
    id: "fallback-2",
    badge_text: "Creative services",
    title: "Remote Graphic Design for Businesses Anywhere",
    subtitle: "Logo, flyer, brochure, company profile, banner and more",
    description:
      "Submit your brief, upload files, receive drafts, request revisions, and get final files from anywhere.",
    primary_cta_label: "Browse Services",
    primary_cta_url: "/creative-services",
    secondary_cta_label: "My Projects",
    secondary_cta_url: "/account/designs",
    quick_steps: [
      "Choose service",
      "Submit brief",
      "Review drafts",
      "Receive final files",
    ],
  },
  {
    id: "fallback-3",
    badge_text: "KonektSeries",
    title: "Exclusive Ready-To-Buy Lifestyle Branding Products",
    subtitle: "Premium apparel and accessories",
    description:
      "Shop KonektSeries products directly or mix them with your branded orders.",
    primary_cta_label: "Shop Collection",
    primary_cta_url: "/products?branch=KonektSeries",
    secondary_cta_label: "View Products",
    secondary_cta_url: "/products",
    quick_steps: [
      "Browse collection",
      "Choose size and quantity",
      "Checkout online",
      "Track your order",
    ],
  },
];

export default function UnifiedHero() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await heroBannerApi.getActiveHeroBanners();
        const banners = res.data?.banners || [];
        const items = banners.map((item) => ({
          ...item,
          quick_steps: item.quick_steps || [
            "Choose product/service",
            "Customize or upload brief",
            "Get approval / quote",
            "Track production & delivery",
          ],
        }));
        setSlides(items.length ? items : fallbackSlides);
      } catch (error) {
        console.error("Failed to load hero banners", error);
        setSlides(fallbackSlides);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  const active = useMemo(() => slides[index] || fallbackSlides[0], [slides, index]);

  const goToPrev = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goToNext = () => setIndex((prev) => (prev + 1) % slides.length);

  return (
    <section 
      className="relative overflow-hidden bg-gradient-to-br from-[#2D3E50] via-[#243243] to-[#1A2430] text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="unified-hero"
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#D4A843,_transparent_25%)]" />
      
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_420px] gap-10 items-center">
          {/* Left Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl"
            >
              {active.badge_text && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 backdrop-blur px-4 py-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-[#D4A843]" />
                  {active.badge_text}
                </div>
              )}

              <h1 className="mt-6 text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                {active.title}
              </h1>

              {active.subtitle && (
                <div className="mt-4 text-lg md:text-2xl text-slate-200">
                  {active.subtitle}
                </div>
              )}

              {active.description && (
                <p className="mt-6 text-base md:text-lg text-slate-300 max-w-xl leading-relaxed">
                  {active.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mt-8">
                {active.primary_cta_label && active.primary_cta_url && (
                  <Link
                    to={active.primary_cta_url}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] hover:bg-[#bf953b] text-slate-900 px-6 py-3.5 font-semibold transition-all shadow-lg hover:shadow-xl"
                    data-testid="hero-primary-cta"
                  >
                    {active.primary_cta_label}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                {active.secondary_cta_label && active.secondary_cta_url && (
                  <Link
                    to={active.secondary_cta_url}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 backdrop-blur px-6 py-3.5 font-medium hover:bg-white/20 transition-all"
                    data-testid="hero-secondary-cta"
                  >
                    {active.secondary_cta_label}
                  </Link>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right Card - Quick Journey */}
          <div className="hidden lg:block">
            <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-sm p-5 shadow-2xl">
              <div className="rounded-[24px] bg-white text-slate-900 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-[#2D3E50]">Quick Journey</h2>
                  <span className="rounded-full bg-[#f6e7bb] px-3 py-1 text-xs font-medium text-[#9a6d00]">
                    B2B Optimized
                  </span>
                </div>

                <div className="space-y-4 mt-6">
                  {(active.quick_steps || fallbackSlides[0].quick_steps).map((step, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-[#2D3E50] text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="text-sm text-slate-700">{step}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mt-6">
                  <div className="text-sm text-slate-500">Need design help first?</div>
                  <Link
                    to="/creative-services"
                    className="inline-flex items-center gap-1 mt-2 text-[#2D3E50] font-semibold text-sm hover:underline"
                  >
                    Explore design and copywriting services
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Dots */}
              {slides.length > 1 && (
                <div className="flex justify-center gap-2 mt-5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === index ? "bg-white scale-110" : "bg-white/40 hover:bg-white/60"
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
