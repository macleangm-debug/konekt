import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle, Clock, MapPin, Truck } from "lucide-react";
import RequireLoginActionButton from "../../components/auth/RequireLoginActionButton";

const API = process.env.REACT_APP_BACKEND_URL;

function FeaturePill({ label, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-700">
      {Icon && <Icon className="w-4 h-4 text-slate-500" />}
      {label}
    </div>
  );
}

export default function ServiceDetailPageV2() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  const isLoggedIn = useMemo(() => Boolean(localStorage.getItem("token")), []);

  useEffect(() => {
    const load = async () => {
      try {
        const typesRes = await fetch(`${API}/api/public-services/types`);
        const allTypes = await typesRes.json();
        const found = (allTypes || []).find((x) => x.slug === slug);
        
        if (!found) {
          setLoading(false);
          return;
        }

        const detailRes = await fetch(`${API}/api/public-services/types/${found.key}`);
        const detailed = await detailRes.json();
        setService(detailed);

        const relatedServices = allTypes
          .filter((x) => x.group_key === found.group_key && x.slug !== found.slug)
          .slice(0, 3);
        setRelated(relatedServices);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading service...</div>;
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Service not found</p>
        <Link to="/services" className="text-[#D4A843] font-semibold hover:underline">
          Browse all services
        </Link>
      </div>
    );
  }

  const nextPath = `/dashboard/service-requests/new?service=${service.key}`;

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="service-detail-page">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
          {/* Left - Service Info */}
          <div>
            <div className="text-xs tracking-[0.25em] uppercase text-slate-500 font-semibold">
              {service.group_name || "Service"}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-[#20364D] mt-4 leading-tight">
              {service.name}
            </h1>

            <p className="text-slate-600 mt-5 text-lg max-w-3xl leading-relaxed">
              {service.description}
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <FeaturePill label={service.service_mode || "Request"} icon={Clock} />
              <FeaturePill label={service.pricing_mode || "Quote-based"} />
              {service.site_visit_required && <FeaturePill label="Site Visit" icon={MapPin} />}
              {service.delivery_required && <FeaturePill label="Delivery Included" icon={Truck} />}
            </div>

            {/* Value Props */}
            <div className="grid md:grid-cols-3 gap-5 mt-10">
              <div className="rounded-2xl border bg-white p-5">
                <CheckCircle className="w-6 h-6 text-green-500 mb-3" />
                <div className="font-bold text-[#20364D]">Clear Request Flow</div>
                <p className="text-slate-600 mt-2 text-sm">Submit structured service details and keep everything tracked in one place.</p>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <CheckCircle className="w-6 h-6 text-green-500 mb-3" />
                <div className="font-bold text-[#20364D]">Business-Ready</div>
                <p className="text-slate-600 mt-2 text-sm">Ideal for companies, institutions, and repeat business operations.</p>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <CheckCircle className="w-6 h-6 text-green-500 mb-3" />
                <div className="font-bold text-[#20364D]">Progress Visibility</div>
                <p className="text-slate-600 mt-2 text-sm">Once submitted, your request remains visible inside your account.</p>
              </div>
            </div>
          </div>

          {/* Right - CTA Card */}
          <div className="rounded-[2rem] bg-gradient-to-br from-[#0E1A2B] to-[#20364D] text-white p-8 sticky top-6">
            <div className="text-2xl font-bold">Ready to proceed?</div>
            <p className="text-slate-200 mt-4 leading-relaxed">
              Browse freely. When you're ready to submit the request, sign in and continue inside your dashboard.
            </p>

            <div className="flex flex-col gap-3 mt-8">
              <RequireLoginActionButton
                isLoggedIn={isLoggedIn}
                nextPath={nextPath}
                className="rounded-xl bg-[#D4A843] px-5 py-3 font-semibold text-[#17283C] hover:bg-[#c49a3d] transition text-center"
              >
                Start this service request
              </RequireLoginActionButton>

              <Link
                to="/request-quote"
                className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white text-center hover:bg-white/10 transition"
              >
                Request quote instead
              </Link>
            </div>

            <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="font-semibold">Need better pricing?</div>
              <p className="text-slate-200 mt-2 text-sm">
                Bulk requests, recurring support, and company accounts may qualify for stronger commercial terms.
              </p>
            </div>
          </div>
        </section>

        {/* Related Services */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl md:text-3xl font-bold text-[#20364D] mb-6">
              Related Services
            </h2>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/services/${item.slug}`}
                  className="rounded-2xl border bg-white p-6 hover:shadow-md hover:border-[#D4A843]/30 transition group"
                >
                  <div className="text-xl font-bold text-[#20364D]">{item.name}</div>
                  <p className="text-slate-600 mt-3">{item.short_description}</p>
                  <div className="mt-5 text-sm font-semibold text-[#D4A843] group-hover:underline">
                    Explore →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
