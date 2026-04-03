import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PublicFooter from "../../components/public/PublicFooter";
import ServicePageTemplate from "../../components/services/ServicePageTemplate";
import api from "../../lib/api";

export default function DynamicServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [showGuestLead, setShowGuestLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    country: "Tanzania",
    region: "",
    need_summary: "",
  });
  const isLoggedIn = useMemo(() => Boolean(localStorage.getItem("token")), []);

  useEffect(() => {
    const load = async () => {
      const res = await api.get("/api/public-services/types");
      const found = (res.data || []).find((x) => x.slug === slug);
      if (found) setService(found);
    };
    load();
  }, [slug]);

  const submitGuestLead = async (e) => {
    e.preventDefault();
    await api.post("/api/guest-leads", {
      lead_type: "service_interest",
      service_key: service.key,
      source: "website",
      ...leadForm,
    });
    alert("Your interest has been captured. Konekt can follow up with you.");
    setShowGuestLead(false);
  };

  if (!service) return <div className="p-10">Loading service...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbarV2 />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <ServicePageTemplate
          service={service}
          isLoggedIn={isLoggedIn}
          onGuestLeadClick={() => setShowGuestLead(true)}
          accountMode={false}
        />

        {showGuestLead ? (
          <form onSubmit={submitGuestLead} className="rounded-[2rem] border bg-white p-8 mt-8">
            <div className="text-2xl font-bold text-[#20364D]">Leave your details</div>
            <p className="text-slate-600 mt-3">
              Not ready to create an account yet? Leave your details and Konekt can follow up on this service need.
            </p>

            <div className="grid gap-4 mt-6">
              <input className="border rounded-xl px-4 py-3" placeholder="Full name" value={leadForm.full_name} onChange={(e) => setLeadForm({ ...leadForm, full_name: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Phone" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Company name (optional)" value={leadForm.company_name} onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Country" value={leadForm.country} onChange={(e) => setLeadForm({ ...leadForm, country: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Region / city" value={leadForm.region} onChange={(e) => setLeadForm({ ...leadForm, region: e.target.value })} />
              <textarea className="border rounded-xl px-4 py-3 min-h-[120px]" placeholder="Briefly describe what you need" value={leadForm.need_summary} onChange={(e) => setLeadForm({ ...leadForm, need_summary: e.target.value })} />
            </div>

            <button type="submit" className="mt-6 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold">
              Submit Details
            </button>
          </form>
        ) : null}
      </main>
      <PublicFooter />
    </div>
  );
}
