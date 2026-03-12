import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Palette, Search, ArrowRight, Star, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";

export default function CreativeServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/creative-services-v2");
        setServices(res.data || []);
      } catch (error) {
        console.error("Failed to load services", error);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  const categories = useMemo(() => {
    return [...new Set(services.map(s => s.category).filter(Boolean))].sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      if (selectedCategory && service.category !== selectedCategory) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          service.title?.toLowerCase().includes(term) ||
          service.description?.toLowerCase().includes(term) ||
          service.category?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [services, searchTerm, selectedCategory]);

  // Group by category
  const servicesByCategory = useMemo(() => {
    const grouped = {};
    filteredServices.forEach(service => {
      const cat = service.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(service);
    });
    return grouped;
  }, [filteredServices]);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="creative-services-page">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#22364d] to-[#1b2f44] text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 text-[#D4A843]" />
              Professional Design Services
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Creative Services
            </h1>
            <p className="text-slate-200 text-lg mt-4 leading-relaxed">
              From logo design to company profiles, our creative team delivers professional 
              design solutions tailored to your brand. Submit your brief and receive drafts 
              within days.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory("")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !selectedCategory 
                    ? "bg-[#2D3E50] text-white" 
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat 
                      ? "bg-[#2D3E50] text-white" 
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-slate-500">Loading services...</div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20">
            <Palette className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">No services found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
              <div key={category}>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">{category}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryServices.map(service => (
                    <Link
                      key={service.id}
                      to={`/creative-services/${service.slug}`}
                      className="group rounded-2xl border bg-white p-6 hover:shadow-lg transition-all hover:border-[#D4A843]/30"
                      data-testid={`service-card-${service.slug}`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[#D4A843]/10 flex items-center justify-center group-hover:bg-[#D4A843]/20 transition-colors">
                          <Palette className="w-6 h-6 text-[#D4A843]" />
                        </div>
                        {(service.addons || []).filter(a => a.is_active).length > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            +{service.addons.filter(a => a.is_active).length} add-ons
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#2D3E50]">
                        {service.title}
                      </h3>
                      
                      {service.description && (
                        <p className="text-slate-600 text-sm mt-2 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">Starting from</p>
                          <p className="text-lg font-bold text-[#D4A843]">
                            {formatMoney(service.base_price, service.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-[#2D3E50] group-hover:text-[#D4A843] transition-colors">
                          Start Brief
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA Section */}
        {!loading && filteredServices.length > 0 && (
          <div className="mt-16 rounded-2xl bg-gradient-to-r from-[#2D3E50] to-[#3d5166] p-8 text-white text-center">
            <h3 className="text-2xl font-bold">Need a custom service?</h3>
            <p className="text-slate-200 mt-2 max-w-lg mx-auto">
              Can't find exactly what you need? Contact us for a custom quote on any design 
              or creative project.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 mt-6 bg-[#D4A843] text-[#2D3E50] px-6 py-3 rounded-xl font-semibold hover:bg-[#c49933] transition-colors"
            >
              Contact Us
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
