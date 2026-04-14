import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/PublicFooter";
import SoftLeadCaptureModal from "../../components/auth/SoftLeadCaptureModal";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Check } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ServiceDetailLeadAwarePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_prefix: "+255",
    phone: "",
    company_name: "",
    need_summary: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  
  const isLoggedIn = useMemo(() => Boolean(localStorage.getItem("konekt_token") || localStorage.getItem("token")), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Try multiple endpoints
        let found = null;
        
        // Try service catalog
        try {
          const res = await fetch(`${API_URL}/api/service-catalog/services`);
          if (res.ok) {
            const services = await res.json();
            found = services.find((x) => x.slug === slug);
          }
        } catch (err) {
          console.log("Service catalog not available");
        }

        // Try public services endpoint
        if (!found) {
          try {
            const res = await fetch(`${API_URL}/api/public-services/types`);
            if (res.ok) {
              const services = await res.json();
              found = services.find((x) => x.slug === slug || x.key === slug);
            }
          } catch (err) {
            console.log("Public services not available");
          }
        }

        if (found) {
          setService({
            key: found.slug || found.key,
            name: found.name,
            description: found.description || found.short_description,
            features: found.features || [],
            pricing_note: found.pricing_note,
            category: found.category || found.group_name,
          });
        }
      } catch (err) {
        console.error("Failed to load service:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const goAccountRequest = () => {
    navigate(`/request-quote?type=service_quote&service=${encodeURIComponent(service?.name || slug)}&category=${encodeURIComponent(service?.category || '')}`);
  };

  const requestBusinessQuote = () => {
    navigate(`/request-quote?type=business_pricing&service=${encodeURIComponent(service?.name || slug)}`);
  };

  const submitGuestLead = async (e) => {
    e.preventDefault();
    
    if (!leadForm.first_name || !leadForm.last_name || !leadForm.email) {
      toast.error("Please fill in name and email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/public-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_type: "service_quote",
          guest_name: [leadForm.first_name, leadForm.last_name].filter(Boolean).join(" "),
          first_name: leadForm.first_name,
          last_name: leadForm.last_name,
          guest_email: leadForm.email,
          phone_prefix: leadForm.phone_prefix,
          phone: leadForm.phone,
          company_name: leadForm.company_name,
          service_name: service?.name || slug,
          service_slug: service?.key || slug,
          source_page: `/service/${slug}`,
          notes: leadForm.need_summary,
          details: {
            service_key: service?.key || slug,
            service_name: service?.name,
            service_category: service?.category,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      const data = await res.json();
      setSubmitted(data);
      toast.success(`Request submitted: ${data.request_number}`);
    } catch (err) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNavbarV2 />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNavbarV2 />
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-bold text-[#20364D]">Service Not Found</h1>
          <p className="text-slate-600 mt-3">The service you're looking for doesn't exist or has been removed.</p>
          <Link 
            to="/services-discover" 
            className="inline-flex items-center gap-2 mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="service-detail-lead-aware-page">
      <PublicNavbarV2 />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link 
            to="/services-discover" 
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
        </div>

        <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-10">
          {/* Left - Service Details */}
          <div className="space-y-8">
            <div className="rounded-[2rem] border bg-white p-8">
              {service.category && (
                <div className="rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs font-semibold w-fit mb-4">
                  {service.category}
                </div>
              )}
              
              <h1 className="text-4xl font-bold text-[#20364D]">{service.name}</h1>
              <p className="text-slate-600 mt-4 text-lg leading-7">{service.description}</p>

              {service.features && service.features.length > 0 && (
                <div className="mt-8">
                  <div className="text-lg font-bold text-[#20364D] mb-4">What's included</div>
                  <div className="space-y-3">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {service.pricing_note && (
                <div className="mt-8 rounded-2xl bg-[#F4E7BF] p-5 text-[#8B6A10]">
                  <div className="font-bold">Pricing Note</div>
                  <p className="text-sm mt-1">{service.pricing_note}</p>
                </div>
              )}
            </div>

            {/* Action Options for All Users */}
            <div className="rounded-[2rem] border bg-white p-8">
              <div className="text-2xl font-bold text-[#20364D] mb-6">How do you want to proceed?</div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <div className="font-bold text-[#20364D]">Submit Full Request</div>
                  <p className="text-slate-600 mt-2 text-sm">
                    {isLoggedIn 
                      ? "Complete a structured request inside your account for better tracking."
                      : "Login to submit a detailed request with full tracking."}
                  </p>
                  <button
                    type="button"
                    onClick={goAccountRequest}
                    data-testid="start-service-request-btn"
                    className="mt-4 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283c] transition"
                  >
                    Start Service Request
                  </button>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <div className="font-bold text-[#20364D]">Business Pricing</div>
                  <p className="text-slate-600 mt-2 text-sm">
                    For broader commercial support, request a business pricing conversation.
                  </p>
                  <button
                    type="button"
                    onClick={requestBusinessQuote}
                    data-testid="request-business-quote-btn"
                    className="mt-4 rounded-xl border px-5 py-3 font-semibold text-[#20364D] hover:bg-white transition"
                  >
                    Request Business Quote
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Guest Request Form or Success/LoggedIn */}
          {submitted ? (
            <div className="rounded-[2rem] border bg-white p-8 h-fit text-center" data-testid="service-request-success">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-[#20364D]">Request Received</h2>
              <p className="text-slate-600 mt-2">Reference: <span className="font-semibold">{submitted.request_number}</span></p>
              <p className="text-slate-500 text-sm mt-1">Our team will review your request and get back to you within 24 hours.</p>
              {submitted.account_invite && (
                <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-left" data-testid="service-activation-banner">
                  <p className="font-bold text-blue-900 text-sm">Your account has been created</p>
                  <p className="text-blue-800 text-xs mt-1">Activate it to track requests, quotes, invoices, and orders.</p>
                  <a href={submitted.account_invite.invite_url} className="inline-block mt-3 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition">Create Account to Track Order</a>
                </div>
              )}
              <button onClick={() => setSubmitted(null)} className="mt-6 text-[#20364D] font-medium underline text-sm">Submit another request</button>
            </div>
          ) : !isLoggedIn ? (
            <form onSubmit={submitGuestLead} className="rounded-[2rem] border bg-white p-8 h-fit" data-testid="guest-lead-form">
              <div className="text-2xl font-bold text-[#20364D]">Quick Service Request</div>
              <p className="text-slate-600 mt-3">
                Leave your details and we'll prepare a quote for this service.
              </p>

              <div className="grid gap-4 mt-6">
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                    placeholder="First name *" 
                    value={leadForm.first_name} 
                    onChange={(e) => setLeadForm({ ...leadForm, first_name: e.target.value })}
                    required
                    data-testid="lead-first-name"
                  />
                  <input 
                    className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                    placeholder="Last name *" 
                    value={leadForm.last_name} 
                    onChange={(e) => setLeadForm({ ...leadForm, last_name: e.target.value })}
                    required
                    data-testid="lead-last-name"
                  />
                </div>
                <input 
                  className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                  placeholder="Email *" 
                  type="email"
                  value={leadForm.email} 
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  required
                  data-testid="lead-email"
                />
                <PhoneNumberField
                  prefix={leadForm.phone_prefix}
                  number={leadForm.phone}
                  onPrefixChange={(v) => setLeadForm({ ...leadForm, phone_prefix: v })}
                  onNumberChange={(v) => setLeadForm({ ...leadForm, phone: v })}
                  testIdPrefix="lead-phone"
                />
                <input 
                  className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                  placeholder="Company name (optional)" 
                  value={leadForm.company_name} 
                  onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                  data-testid="lead-company"
                />
                <textarea 
                  className="border rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                  placeholder="Briefly describe what you need" 
                  value={leadForm.need_summary} 
                  onChange={(e) => setLeadForm({ ...leadForm, need_summary: e.target.value })}
                  data-testid="lead-summary"
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                data-testid="submit-lead-btn"
                className="mt-6 w-full rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link to="/login" className="text-[#20364D] font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <div className="rounded-[2rem] border bg-white p-8 h-fit" data-testid="logged-in-notice">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-[#20364D] text-center">You're signed in</div>
              <p className="text-slate-600 mt-3 text-center">
                Use the actions on the left to submit a structured service request or ask for business pricing.
                All your requests will be tracked in your account.
              </p>
              <div className="mt-6 text-center">
                <Link
                  to="/account/service-requests"
                  className="text-[#20364D] font-semibold hover:underline"
                >
                  View my service requests →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />

      {/* Soft Lead Capture Modal (alternate trigger) */}
      <SoftLeadCaptureModal
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        onSubmitted={() => {
          setShowLeadModal(false);
          toast.success("Lead captured!");
        }}
        intentType="service_interest"
        intentPayload={{ service_key: service?.key, service_name: service?.name }}
      />
    </div>
  );
}
