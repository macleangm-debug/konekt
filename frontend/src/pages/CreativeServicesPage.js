import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wand2, ArrowRight, Clock3, Layers3, Star } from "lucide-react";
import { motion } from "framer-motion";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreativeServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products?branch=Creative+Services`);
        const data = await res.json();
        setServices(data.products || []);
      } catch (error) {
        console.error("Failed to fetch creative services", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#2D3E50] via-[#243243] to-[#1A2430] text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm mb-6">
              <Wand2 className="w-4 h-4 text-[#D4A843]" />
              Creative Services
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Remote Graphic Design
              <span className="text-[#D4A843] block mt-2">for Businesses Anywhere</span>
            </h1>
            <p className="mt-6 max-w-2xl text-slate-200 text-lg leading-relaxed">
              Order logos, flyers, brochures, company profiles, posters and banners online.
              Submit your brief, review drafts, request revisions, and receive final files — 
              all without visiting the office.
            </p>
            
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#services"
                className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#bf953b] text-slate-900 font-semibold px-6 py-3 rounded-full transition-all"
              >
                Browse Services <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 border border-white/20 bg-white/10 hover:bg-white/15 px-6 py-3 rounded-full transition-all"
              >
                My Projects
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-12 border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Choose Service", desc: "Select logo, brochure, or other design" },
              { step: "2", title: "Submit Brief", desc: "Tell us about your brand and requirements" },
              { step: "3", title: "Review Drafts", desc: "We send concepts for your feedback" },
              { step: "4", title: "Get Finals", desc: "Receive print-ready and digital files" },
            ].map((item, idx) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#2D3E50] text-white flex items-center justify-center font-semibold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
                {idx < 3 && <div className="hidden md:block flex-1 border-t border-dashed border-slate-300 mt-5 ml-4" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Available Design Services</h2>
            <p className="text-slate-600 mt-2">
              Choose a service, pick your package, and submit your project brief online.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border p-6 animate-pulse">
                <div className="h-48 bg-slate-100 rounded-xl" />
                <div className="h-5 bg-slate-100 rounded mt-4 w-2/3" />
                <div className="h-4 bg-slate-100 rounded mt-3 w-full" />
                <div className="h-4 bg-slate-100 rounded mt-2 w-4/5" />
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16">
            <Wand2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="mt-4 text-xl font-semibold">No services available</h3>
            <p className="text-slate-500 mt-2">Check back soon for new design services.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {services.map((service, idx) => {
              const packages = service.packages || [];
              const lowestPrice = packages.length > 0
                ? Math.min(...packages.map((pkg) => pkg.price))
                : service.base_price;

              const fastestDelivery = packages.length > 0
                ? Math.min(...packages.map((pkg) => pkg.delivery_days))
                : service.delivery_days || 3;

              return (
                <motion.div
                  key={service.id || service.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:border-[#D4A843]/30 transition-all overflow-hidden"
                >
                  <div className="h-52 bg-slate-100 relative overflow-hidden">
                    <img
                      src={service.image_url || "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800"}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium shadow-sm">
                        <Layers3 className="w-3 h-3" />
                        {service.category || "Design Service"}
                      </span>
                    </div>
                    {service.is_featured && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#D4A843] px-3 py-1 text-xs font-medium text-slate-900">
                          <Star className="w-3 h-3 fill-current" />
                          Popular
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-semibold group-hover:text-[#2D3E50]">{service.name}</h3>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                      {service.description?.substring(0, 120)}...
                    </p>

                    <div className="mt-4 flex items-center justify-between text-sm border-t pt-4">
                      <div>
                        <div className="text-slate-500">Starting from</div>
                        <div className="font-semibold text-lg text-[#D4A843]">
                          TZS {lowestPrice?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-500 inline-flex items-center gap-1">
                          <Clock3 className="w-4 h-4" />
                          Delivery
                        </div>
                        <div className="font-medium">{fastestDelivery} days</div>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <Link
                        to={`/services/${service.id}`}
                        data-testid={`service-view-${service.id}`}
                        className="flex-1 bg-[#2D3E50] text-white text-center rounded-xl px-4 py-3 font-semibold hover:bg-[#3d5166] transition-all"
                      >
                        View Service
                      </Link>
                      <Link
                        to={`/services/${service.id}?start=brief`}
                        data-testid={`service-start-${service.id}`}
                        className="flex-1 bg-[#D4A843] text-slate-900 text-center rounded-xl px-4 py-3 font-semibold hover:bg-[#bf953b] transition-all"
                      >
                        Start Project
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Why Konekt */}
      <section className="bg-[#2D3E50] text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Why businesses choose Konekt for design</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Remote-First Workflow", desc: "Order design services from anywhere without visiting our office. Everything is done online." },
              { title: "Clear Package Pricing", desc: "No hidden costs. Choose a package that fits your budget and timeline upfront." },
              { title: "Professional Quality", desc: "Our designers create polished, brand-aligned work with structured revision processes." },
            ].map((item) => (
              <div key={item.title} className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="mt-3 text-slate-300 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold">Ready to start your design project?</h2>
          <p className="mt-4 text-slate-600">
            Choose a service above, or talk to our AI assistant for guidance.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#services"
              className="bg-[#2D3E50] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#3d5166] transition-all"
            >
              Browse Services
            </a>
            <Link
              to="/products"
              className="border border-slate-300 px-8 py-4 rounded-full font-semibold hover:bg-slate-50 transition-all"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
