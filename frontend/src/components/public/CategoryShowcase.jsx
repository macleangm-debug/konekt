import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Printer, Briefcase, Palette, Wrench, Gift, ArrowRight, Sparkles } from "lucide-react";

export default function CategoryShowcase() {
  const [activeIndex, setActiveIndex] = useState(null);

  const items = [
    {
      title: "Promotional Products",
      description: "Branded corporate gifts, apparel, giveaways, and event materials that make your brand memorable.",
      href: "/marketplace?category=promotional",
      icon: Gift,
      color: "from-amber-500 to-orange-600",
      stats: "500+ items",
    },
    {
      title: "Office Equipment",
      description: "Machines, devices, supplies, and accessories for productive and modern workspaces.",
      href: "/marketplace?category=office_equipment",
      icon: Briefcase,
      color: "from-blue-500 to-indigo-600",
      stats: "300+ items",
    },
    {
      title: "Printing & Branding",
      description: "Professional printing for brochures, business cards, banners, packaging, and branded documents.",
      href: "/services?category=printing",
      icon: Printer,
      color: "from-emerald-500 to-teal-600",
      stats: "50+ services",
    },
    {
      title: "Creative & Design",
      description: "Expert design, copywriting, branding strategy, and content creation for your business.",
      href: "/services?category=creative",
      icon: Palette,
      color: "from-purple-500 to-pink-600",
      stats: "25+ services",
    },
    {
      title: "Facilities Services",
      description: "Cleaning, maintenance, security, and workspace management to keep your operations running.",
      href: "/services?category=facilities",
      icon: Wrench,
      color: "from-slate-600 to-slate-800",
      stats: "30+ services",
    },
    {
      title: "Custom Solutions",
      description: "Tailored solutions for complex requirements. Tell us what you need and we'll make it happen.",
      href: "/services",
      icon: Sparkles,
      color: "from-rose-500 to-red-600",
      stats: "Unlimited",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-20 space-y-10" data-testid="category-showcase">
      <div className="max-w-3xl text-center mx-auto">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#20364D]/10 text-[#20364D] font-medium text-sm mb-4">
          <Package className="w-4 h-4" /> Products & Services
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-[#20364D]">
          Everything businesses need
        </h2>
        <p className="text-slate-600 mt-4 text-lg max-w-2xl mx-auto">
          From products to services, Konekt helps businesses order faster, operate better, and scale smarter across Africa.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;
          return (
            <Link
              key={item.title}
              to={item.href}
              className="group relative rounded-3xl bg-white border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              data-testid={`category-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {/* Gradient accent */}
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${item.color} transform origin-left transition-transform duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0'}`} />
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg transform transition-transform duration-300 ${isActive ? 'scale-110 rotate-3' : ''}`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    {item.stats}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-[#20364D] mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
                
                <div className={`mt-5 flex items-center gap-2 font-semibold text-[#20364D] transition-all duration-300 ${isActive ? 'translate-x-2' : ''}`}>
                  Explore <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'translate-x-1' : ''}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center pt-6">
        <Link 
          to="/marketplace"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#20364D] text-white font-semibold hover:bg-[#2a4a66] transition shadow-lg shadow-[#20364D]/20"
        >
          Browse All Categories <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  );
}
