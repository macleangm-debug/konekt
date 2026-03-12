import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import { heroBannerApi } from "../lib/heroBannerApi";

export default function HeroCarousel() {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await heroBannerApi.getActiveHeroBanners();
        setBanners(res.data?.banners || []);
      } catch (error) {
        console.error("Failed to load hero banners", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  const active = useMemo(() => banners[index], [banners, index]);

  const goToPrev = () => {
    setIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setIndex((prev) => (prev + 1) % banners.length);
  };

  // If no banners, don't render anything (fallback to static hero)
  if (loading || !active) return null;

  const isDark = active.theme === "dark";

  return (
    <section 
      className="relative overflow-hidden rounded-[24px] min-h-[480px] md:min-h-[560px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="hero-carousel"
    >
      {/* Background Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img
            src={active.image_url}
            alt={active.title}
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 ${isDark ? 'bg-slate-950/60' : 'bg-white/40'}`} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-20 min-h-[480px] md:min-h-[560px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl"
          >
            {/* Badge */}
            {active.badge_text && (
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-6 ${
                isDark 
                  ? 'bg-white/15 backdrop-blur text-white' 
                  : 'bg-slate-900/10 text-slate-900'
              }`}>
                <Sparkles className="w-4 h-4 text-[#D4A843]" />
                {active.badge_text}
              </div>
            )}

            {/* Title */}
            <h1 className={`text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {active.title}
            </h1>

            {/* Subtitle */}
            {active.subtitle && (
              <div className={`text-xl md:text-2xl mt-4 ${
                isDark ? 'text-slate-100' : 'text-slate-700'
              }`}>
                {active.subtitle}
              </div>
            )}

            {/* Description */}
            {active.description && (
              <p className={`text-base md:text-lg mt-6 max-w-xl leading-7 ${
                isDark ? 'text-slate-200' : 'text-slate-600'
              }`}>
                {active.description}
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mt-8">
              {active.primary_cta_label && active.primary_cta_url && (
                <Link
                  to={active.primary_cta_url}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] hover:bg-[#bf953b] text-slate-900 px-6 py-3.5 font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  data-testid="hero-primary-cta"
                >
                  {active.primary_cta_label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              {active.secondary_cta_label && active.secondary_cta_url && (
                <Link
                  to={active.secondary_cta_url}
                  className={`inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-medium transition-all ${
                    isDark 
                      ? 'border border-white/30 bg-white/10 backdrop-blur text-white hover:bg-white/20' 
                      : 'border border-slate-300 bg-white/80 text-slate-900 hover:bg-white'
                  }`}
                  data-testid="hero-secondary-cta"
                >
                  {active.secondary_cta_label}
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isDark 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900'
            }`}
            aria-label="Previous slide"
            data-testid="hero-prev-btn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className={`absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isDark 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900'
            }`}
            aria-label="Next slide"
            data-testid="hero-next-btn"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === index 
                  ? (isDark ? 'bg-white scale-110' : 'bg-slate-900 scale-110') 
                  : (isDark ? 'bg-white/40 hover:bg-white/60' : 'bg-slate-900/30 hover:bg-slate-900/50')
              }`}
              aria-label={`Go to slide ${i + 1}`}
              data-testid={`hero-dot-${i}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
