import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Palette,
  ShoppingBag,
  Briefcase,
  Sparkles,
  Truck,
  ShieldCheck,
  Users,
  Wand2,
  MessageSquare,
  Star,
  Clock,
  Globe,
} from "lucide-react";
import HeroCarousel from "../components/HeroCarousel";

const categories = [
  {
    title: "Promotional Materials",
    description: "T-shirts, caps, mugs, notebooks, banners and more — all customizable with your brand.",
    cta: "Customize Products",
    href: "/products?branch=Promotional+Materials",
    icon: <Palette className="w-6 h-6" />,
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Office Equipment",
    description: "Reliable office tools and accessories for modern teams and workspaces.",
    cta: "Browse Equipment",
    href: "/products?branch=Office+Equipment",
    icon: <Briefcase className="w-6 h-6" />,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Creative Services",
    description: "Logo, flyer, brochure, company profile, poster and banner design — all remote.",
    cta: "Start a Design Project",
    href: "/products?branch=Creative+Services",
    icon: <Wand2 className="w-6 h-6" />,
    color: "from-purple-500 to-purple-600",
  },
  {
    title: "KonektSeries",
    description: "Exclusive ready-to-buy Konekt branded lifestyle products and apparel.",
    cta: "Shop KonektSeries",
    href: "/products?branch=KonektSeries",
    icon: <ShoppingBag className="w-6 h-6" />,
    color: "from-amber-500 to-amber-600",
  },
];

const features = [
  { text: "Customize products online", icon: <Palette className="w-4 h-4" /> },
  { text: "Order from anywhere in the world", icon: <Globe className="w-4 h-4" /> },
  { text: "Track orders in real time", icon: <Clock className="w-4 h-4" /> },
  { text: "Request graphic design remotely", icon: <Wand2 className="w-4 h-4" /> },
  { text: "AI assistant for instant support", icon: <MessageSquare className="w-4 h-4" /> },
  { text: "Fast quote and reorder experience", icon: <ArrowRight className="w-4 h-4" /> },
];

const steps = [
  {
    num: "01",
    title: "Choose a product or service",
    text: "Browse promotional items, office equipment, or creative design services.",
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    num: "02",
    title: "Customize or submit requirements",
    text: "Upload your logo, select options, or send your design brief.",
    icon: <Palette className="w-5 h-5" />,
  },
  {
    num: "03",
    title: "Approve and pay",
    text: "Review previews, confirm details, and proceed with confidence.",
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  {
    num: "04",
    title: "Production and delivery",
    text: "We produce, track, and deliver to you wherever you are.",
    icon: <Truck className="w-5 h-5" />,
  },
];

const popularProducts = [
  { 
    name: "Custom T-Shirts", 
    price: "From TZS 8,000", 
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
    badge: "Customizable"
  },
  { 
    name: "Branded Mugs", 
    price: "From TZS 5,000", 
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800",
    badge: "Popular"
  },
  { 
    name: "Logo Design", 
    price: "From TZS 75,000", 
    image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800",
    badge: "Service"
  },
  { 
    name: "Roll-Up Banner", 
    price: "From TZS 45,000", 
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    badge: "Quick Turnaround"
  },
];

const creativeServices = [
  { name: "Logo Design", delivery: "2-5 days", from: "TZS 75,000" },
  { name: "Company Profile", delivery: "3-7 days", from: "TZS 150,000" },
  { name: "Brochure Design", delivery: "3-5 days", from: "TZS 100,000" },
  { name: "Flyer Design", delivery: "1-3 days", from: "TZS 50,000" },
];

const testimonials = [
  {
    name: "Amina K.",
    company: "Mwanzo Holdings",
    quote: "Konekt made it easy for us to order branded materials without sending anyone physically to the office. The online customization is fantastic.",
    rating: 5,
  },
  {
    name: "David S.",
    company: "Peakline Africa",
    quote: "The design-to-delivery flow is smooth, professional, and perfect for business orders. We've been using them for all our corporate events.",
    rating: 5,
  },
  {
    name: "Grace M.",
    company: "TechHub Tanzania",
    quote: "Their AI chat helped me choose the right products for our tech conference. The quality exceeded our expectations!",
    rating: 5,
  },
];

const trustPoints = [
  { icon: <Truck className="w-7 h-7" />, title: "Nationwide Delivery", text: "We deliver to all regions across Tanzania and can arrange international shipping." },
  { icon: <ShieldCheck className="w-7 h-7" />, title: "Quality Guaranteed", text: "Every order goes through quality checks before dispatch. Not satisfied? We'll make it right." },
  { icon: <Users className="w-7 h-7" />, title: "500+ Happy Clients", text: "From startups to enterprises, businesses trust Konekt for their branding needs." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [showStaticHero, setShowStaticHero] = useState(true);

  return (
    <div className="bg-white text-slate-900">
      {/* Dynamic Hero Carousel - Will display if banners exist */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <HeroCarousel onHasContent={(has) => setShowStaticHero(!has)} />
      </div>

      {/* Static Fallback Hero Section - Shows when no banners */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2D3E50] via-[#243243] to-[#1A2430] text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#D4A843,_transparent_25%)]" />
        
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm mb-6">
                <Sparkles className="w-4 h-4 text-[#D4A843]" />
                Built for modern business branding
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Design, Customize & Order
                <span className="text-[#D4A843] block mt-2">Business Branding</span>
                Online
              </h1>

              <p className="mt-6 text-lg text-slate-200 max-w-xl leading-relaxed">
                Konekt helps businesses anywhere in the world order branded merchandise,
                office equipment, and graphic design services — all without visiting our office.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/products"
                  data-testid="hero-explore-products-btn"
                  className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#bf953b] text-slate-900 font-semibold px-8 py-4 rounded-full transition-all shadow-lg shadow-[#D4A843]/20 hover:shadow-[#D4A843]/40 hover:-translate-y-0.5"
                >
                  Explore Products <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/products?branch=Creative+Services"
                  data-testid="hero-design-project-btn"
                  className="inline-flex items-center gap-2 border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/15 px-8 py-4 rounded-full transition-all"
                >
                  <Wand2 className="w-4 h-4" />
                  Start a Design Project
                </Link>
              </div>

              <div className="mt-10 grid sm:grid-cols-2 gap-3">
                {features.map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#D4A843]">
                      {item.icon}
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="bg-white/10 border border-white/15 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
                <div className="rounded-2xl bg-white text-slate-900 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-semibold">Quick Order Journey</h3>
                    <span className="text-xs bg-[#D4A843]/10 text-[#D4A843] px-3 py-1 rounded-full font-medium">
                      B2B Optimized
                    </span>
                  </div>

                  <div className="space-y-4">
                    {["Choose product/service", "Customize or upload brief", "Get approval / quote", "Track production & delivery"].map((step, idx) => (
                      <div key={step} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D3E50] to-[#3d5166] text-white flex items-center justify-center font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div className="text-sm font-medium">{step}</div>
                        {idx < 3 && <div className="flex-1 h-px bg-slate-200" />}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-700 font-medium">
                          Need a logo or company profile first?
                        </p>
                        <Link
                          to="/products?branch=Creative+Services"
                          className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#2D3E50] hover:text-[#D4A843] transition-colors"
                        >
                          Order design services <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything your business needs in one place</h2>
          <p className="mt-4 text-slate-600 text-lg">
            From merchandise and office essentials to remote graphic design — Konekt helps teams move faster.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mt-12">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <Link
                to={cat.href}
                data-testid={`category-${cat.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-[#D4A843]/30 transition-all h-full"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-lg`}>
                  {cat.icon}
                </div>
                <h3 className="mt-5 text-xl font-semibold group-hover:text-[#2D3E50]">{cat.title}</h3>
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">{cat.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#D4A843] group-hover:gap-3 transition-all">
                  {cat.cta} <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular Products */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold">Popular products & services</h2>
              <p className="mt-3 text-slate-600">
                High-demand items businesses order most often.
              </p>
            </div>
            <Link 
              to="/products" 
              className="text-sm font-semibold text-[#2D3E50] hover:text-[#D4A843] transition-colors flex items-center gap-2"
            >
              View all products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mt-10">
            {popularProducts.map((item, idx) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all"
              >
                <div className="h-52 bg-slate-100 relative overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-700 shadow-sm">
                      {item.badge}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-sm text-[#D4A843] font-medium mt-1">{item.price}</p>
                  <button
                    onClick={() => navigate('/products')}
                    className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-medium hover:bg-[#2D3E50] hover:text-white hover:border-[#2D3E50] transition-all"
                  >
                    View Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Creative Services Highlight */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 px-4 py-2 text-sm font-medium mb-4">
              <Wand2 className="w-4 h-4" />
              New: Remote Design Services
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Professional graphic design without visiting our office
            </h2>
            <p className="mt-4 text-slate-600 text-lg leading-relaxed">
              Need a logo, company profile, brochure, or marketing materials? 
              Our design team works remotely to deliver professional results.
            </p>
            
            <div className="mt-8 space-y-4">
              {creativeServices.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <h4 className="font-medium">{service.name}</h4>
                    <p className="text-sm text-slate-500">Delivery: {service.delivery}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#D4A843]">{service.from}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/products?branch=Creative+Services"
              className="mt-8 inline-flex items-center gap-2 bg-[#2D3E50] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
            >
              Explore Design Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-3xl blur-2xl opacity-50" />
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <h3 className="text-xl font-semibold mb-6">How design services work</h3>
              <div className="space-y-6">
                {[
                  { step: "1", title: "Choose service & package", desc: "Select logo, brochure, or other design service" },
                  { step: "2", title: "Submit your brief", desc: "Tell us about your brand, preferences, and requirements" },
                  { step: "3", title: "Review concepts", desc: "We send design drafts for your feedback" },
                  { step: "4", title: "Get final files", desc: "Receive print-ready and digital formats" },
                ].map((item, idx) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#2D3E50] text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">How Konekt works</h2>
            <p className="mt-4 text-slate-300">
              A smooth online flow designed for businesses that need speed, quality, and confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#D4A843] flex items-center justify-center text-[#2D3E50]">
                      {step.icon}
                    </div>
                    <span className="text-3xl font-bold text-white/20">{step.num}</span>
                  </div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="mt-2 text-slate-300 text-sm leading-relaxed">{step.text}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-white/20" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Points */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {trustPoints.map((point, idx) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#D4A843]/10 flex items-center justify-center text-[#D4A843] mx-auto">
                {point.icon}
              </div>
              <h3 className="mt-5 text-xl font-semibold">{point.title}</h3>
              <p className="mt-2 text-slate-600">{point.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold">What customers are saying</h2>
            <p className="mt-3 text-slate-600">Professional service, simplified online.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {testimonials.map((t, idx) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#D4A843] text-[#D4A843]" />
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed">"{t.quote}"</p>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-slate-500">{t.company}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to brand your business professionally?
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            Start with products, creative services, or a custom request — all online.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/products"
              data-testid="cta-explore-products-btn"
              className="bg-[#2D3E50] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#3d5166] transition-all shadow-lg"
            >
              Explore Products
            </Link>
            <Link
              to="/products?branch=Creative+Services"
              data-testid="cta-design-project-btn"
              className="bg-[#D4A843] text-slate-900 px-8 py-4 rounded-full font-semibold hover:bg-[#bf953b] transition-all shadow-lg"
            >
              Start a Design Project
            </Link>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Have questions? <Link to="/contact" className="text-[#D4A843] font-medium hover:underline">Talk to our AI assistant</Link> or call us directly.
          </p>
        </div>
      </section>
    </div>
  );
}
