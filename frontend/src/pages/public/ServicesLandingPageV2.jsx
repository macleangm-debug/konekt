import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Printer, Package, Palette, Wrench, Building2, Users, FileText, ArrowRight } from "lucide-react";
import RequireLoginActionButton from "../../components/auth/RequireLoginActionButton";

const API = process.env.REACT_APP_BACKEND_URL;

const groupIcons = {
  printing: Printer,
  promotional: Package,
  creative: Palette,
  equipment: Wrench,
  installation: Building2,
  facilities: Building2,
  business: FileText,
  custom: Users,
};

function ServiceGroupCard({ group, services }) {
  const Icon = groupIcons[group.key] || Package;
  
  return (
    <div className="rounded-3xl border bg-white p-6 hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#D4A843]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-[#D4A843]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-[#20364D]">{group.name}</h3>
          <p className="text-slate-600 mt-2 text-sm">{group.description}</p>
        </div>
      </div>
      
      {services.length > 0 && (
        <div className="mt-5 space-y-2">
          {services.slice(0, 4).map((service) => (
            <Link
              key={service.id}
              to={`/services/${service.slug}`}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition group"
            >
              <span className="text-slate-700">{service.name}</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D4A843] transition" />
            </Link>
          ))}
          {services.length > 4 && (
            <div className="text-sm text-slate-500 px-3 pt-2">
              +{services.length - 4} more services
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ServicesLandingPageV2() {
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isLoggedIn = useMemo(() => Boolean(localStorage.getItem("token")), []);

  useEffect(() => {
    const load = async () => {
      try {
        const [groupsRes, typesRes] = await Promise.all([
          fetch(`${API}/api/public-services/groups`),
          fetch(`${API}/api/public-services/types`),
        ]);
        if (groupsRes.ok) setGroups(await groupsRes.json());
        if (typesRes.ok) setTypes(await typesRes.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const popularServices = types.slice(0, 6);

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="services-landing-page">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0E1A2B] to-[#20364D] text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Business services, clearly organized
            </h1>
            <p className="text-slate-200 mt-6 text-lg md:text-xl">
              Find the service you need, understand how it works, then sign in to submit your request.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <a
                href="#services"
                className="rounded-xl bg-[#D4A843] px-6 py-3 font-semibold text-[#17283C] hover:bg-[#c49a3d] transition"
              >
                Browse Services
              </a>
              <RequireLoginActionButton
                isLoggedIn={isLoggedIn}
                nextPath="/dashboard/services"
                className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10 transition"
              >
                Request Quote
              </RequireLoginActionButton>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      {popularServices.length > 0 && (
        <section className="py-12 border-b bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-lg font-semibold text-slate-500 mb-6">Popular Services</h2>
            <div className="flex flex-wrap gap-3">
              {popularServices.map((service) => (
                <Link
                  key={service.id}
                  to={`/services/${service.slug}`}
                  className="px-4 py-2 rounded-full border bg-slate-50 hover:bg-[#D4A843]/10 hover:border-[#D4A843]/30 text-slate-700 font-medium transition"
                >
                  {service.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Service Groups */}
      <section id="services" className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-[#20364D] mb-10">
            All Service Categories
          </h2>

          {loading ? (
            <div className="text-slate-500">Loading services...</div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {groups.map((group) => {
                const groupServices = types.filter((x) => x.group_key === group.key);
                return (
                  <ServiceGroupCard
                    key={group.id}
                    group={group}
                    services={groupServices}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white border-t">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#20364D] text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl font-bold text-[#D4A843]">1</span>
              </div>
              <h3 className="text-xl font-bold text-[#20364D]">Choose Service</h3>
              <p className="text-slate-600 mt-3">Browse categories and find the service that matches your business need.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl font-bold text-[#D4A843]">2</span>
              </div>
              <h3 className="text-xl font-bold text-[#20364D]">Submit Details</h3>
              <p className="text-slate-600 mt-3">Sign in and fill out the structured request form inside your account.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl font-bold text-[#D4A843]">3</span>
              </div>
              <h3 className="text-xl font-bold text-[#20364D]">Track Progress</h3>
              <p className="text-slate-600 mt-3">Konekt coordinates delivery and keeps you updated every step of the way.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Business Pricing CTA */}
      <section className="py-16 bg-[#20364D] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Need business pricing?</h2>
          <p className="text-slate-200 mt-4 text-lg">
            Bulk requests, recurring support, and company accounts may qualify for stronger commercial terms.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              to="/request-quote"
              className="rounded-xl bg-[#D4A843] px-6 py-3 font-semibold text-[#17283C] hover:bg-[#c49a3d] transition"
            >
              Request Quote
            </Link>
            <Link
              to="/contact"
              className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10 transition"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
