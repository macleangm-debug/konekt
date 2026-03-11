import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Clock3, ArrowRight, FileText, Upload, ArrowLeft, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import DesignBriefForm from "@/components/DesignBriefForm";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ServiceDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);

  const startBrief = searchParams.get("start") === "brief";

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/${id}`);
        const data = await res.json();
        setService(data);
        if (data?.packages?.length) {
          setSelectedPackage(data.packages[0]);
        }
      } catch (error) {
        console.error("Failed to fetch service", error);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  const includedFeatures = useMemo(() => {
    if (!selectedPackage) return [];
    return selectedPackage.features || [];
  }, [selectedPackage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-10 animate-pulse">
            <div className="h-[420px] bg-slate-100 rounded-3xl" />
            <div>
              <div className="h-8 bg-slate-100 rounded w-2/3" />
              <div className="h-5 bg-slate-100 rounded mt-4 w-full" />
              <div className="h-5 bg-slate-100 rounded mt-2 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold">Service not found</h1>
          <p className="mt-4 text-slate-600">The requested service could not be found.</p>
          <Link to="/creative-services" className="mt-6 inline-flex items-center gap-2 text-[#D4A843] font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Services
          </Link>
        </div>
      </div>
    );
  }

  const packages = service.packages || [];
  const fastestDelivery = packages.length > 0 
    ? Math.min(...packages.map((p) => p.delivery_days)) 
    : service.delivery_days || 3;

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/creative-services" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#2D3E50]">
            <ArrowLeft className="w-4 h-4" /> Back to Creative Services
          </Link>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-start">
          {/* Left Column - Service Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="rounded-3xl overflow-hidden border bg-slate-50 shadow-sm">
              <img
                src={service.image_url || "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800"}
                alt={service.name}
                className="w-full h-[380px] object-cover"
              />
            </div>

            <div className="mt-8">
              <div className="inline-flex rounded-full bg-purple-50 text-purple-700 px-4 py-1 text-sm font-medium">
                {service.category || "Creative Service"}
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-bold">{service.name}</h1>
              <p className="mt-4 text-slate-600 text-lg leading-relaxed">
                {service.description}
              </p>

              {/* Quick Stats */}
              <div className="mt-8 grid md:grid-cols-3 gap-4">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <Clock3 className="w-5 h-5 text-[#D4A843]" />
                  <div className="mt-3 text-sm text-slate-500">Fastest delivery</div>
                  <div className="font-semibold text-lg">{fastestDelivery} days</div>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <FileText className="w-5 h-5 text-[#D4A843]" />
                  <div className="mt-3 text-sm text-slate-500">Project flow</div>
                  <div className="font-semibold">Brief → Draft → Final</div>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <Upload className="w-5 h-5 text-[#D4A843]" />
                  <div className="mt-3 text-sm text-slate-500">Accepted files</div>
                  <div className="font-semibold">PNG, JPG, PDF, SVG</div>
                </div>
              </div>

              {/* What You'll Need */}
              <div className="mt-10">
                <h2 className="text-2xl font-bold">What you'll need to provide</h2>
                <ul className="mt-4 space-y-3">
                  {[
                    "Company name and brand direction",
                    "Any existing logo or reference files",
                    "Preferred colors and style",
                    "Text/content to include",
                    "Target audience or campaign goal",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-[#D4A843] flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Why Choose */}
              <div className="mt-10">
                <h2 className="text-2xl font-bold">Why businesses choose this service</h2>
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  {[
                    "Professional remote design workflow",
                    "Clear package pricing upfront",
                    "Structured revisions process",
                    "Fast turnaround for campaigns",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border p-5 bg-slate-50">
                      <CheckCircle2 className="w-5 h-5 text-[#D4A843] mb-2" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Package Selection */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:sticky lg:top-24"
          >
            <div className="rounded-3xl border bg-white p-6 shadow-lg">
              <h2 className="text-2xl font-bold">Choose a package</h2>
              <p className="text-sm text-slate-500 mt-1">Select the option that fits your needs</p>
              
              <div className="mt-6 space-y-4">
                {packages.length > 0 ? packages.map((pkg) => {
                  const active = selectedPackage?.name === pkg.name;
                  return (
                    <button
                      key={pkg.name}
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      data-testid={`package-${pkg.name.toLowerCase()}`}
                      className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${
                        active 
                          ? "border-[#D4A843] bg-[#D4A843]/5 shadow-md" 
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-lg">{pkg.name}</div>
                          <div className="text-sm text-slate-500 mt-1">
                            {pkg.delivery_days} days delivery • {pkg.revisions} revision{pkg.revisions !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-[#D4A843]">
                            TZS {pkg.price?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {active && (
                        <div className="mt-3 pt-3 border-t border-dashed">
                          <ul className="space-y-1">
                            {(pkg.features || []).map((f) => (
                              <li key={f} className="text-sm text-slate-600 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#D4A843]" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </button>
                  );
                }) : (
                  <div className="text-center py-8 text-slate-500">
                    Contact us for custom pricing
                  </div>
                )}
              </div>

              {selectedPackage && (
                <div className="mt-6 rounded-2xl bg-slate-50 p-5 border">
                  <h3 className="font-semibold">Package includes</h3>
                  <ul className="mt-3 space-y-2">
                    {includedFeatures.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-[#D4A843]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/services/${id}?start=brief`)}
                  data-testid="start-project-btn"
                  className="w-full rounded-xl bg-[#2D3E50] text-white px-5 py-4 font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#3d5166] transition-all"
                >
                  Start Project <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  className="w-full rounded-xl bg-[#D4A843] text-slate-900 px-5 py-4 font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#bf953b] transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  Talk to AI Assistant
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-500 text-center">
                Need help choosing? Our AI assistant can guide you.
              </p>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* Design Brief Form Section */}
      {startBrief && (
        <section className="border-t bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-5xl mx-auto px-6 py-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold">Start your project</h2>
              <p className="mt-3 text-slate-600 text-lg">
                Fill in your project brief and upload reference files. Your selected package will be attached to the order.
              </p>

              <div className="mt-8">
                <DesignBriefForm service={service} selectedPackage={selectedPackage} />
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
}
