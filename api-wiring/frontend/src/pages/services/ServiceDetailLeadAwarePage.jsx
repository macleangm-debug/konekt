import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

export default function ServiceDetailLeadAwarePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
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
      const listRes = await api.get("/api/public-services/types");
      const found = (listRes.data || []).find((x) => x.slug === slug);
      if (!found) return;
      const detailRes = await api.get(`/api/public-services/types/${found.key}`);
      setService(detailRes.data);
    };
    load();
  }, [slug]);

  const goAccountRequest = () => {
    const nextPath = `/dashboard/service-requests/new?service=${service.key}`;
    if (!isLoggedIn) {
      navigate(`/login/customer?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    navigate(nextPath);
  };

  const requestBusinessQuote = () => {
    const nextPath = `/dashboard/business-pricing?service=${service.key}`;
    if (!isLoggedIn) {
      navigate(`/login/customer?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    navigate(nextPath);
  };

  const submitGuestLead = async (e) => {
    e.preventDefault();
    await api.post("/api/guest-leads", {
      lead_type: "service_interest",
      service_key: service.key,
      ...leadForm,
      source: "website",
    });
    alert("Thanks. Your interest has been captured and our team can follow up.");
  };

  if (!service) return <div className="p-10">Loading service...</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        title={service.name}
        subtitle="Guests can leave their contacts for follow-up. Logged-in users complete the full request inside their account."
      />

      <div className="grid xl:grid-cols-[1fr_0.95fr] gap-6">
        <SurfaceCard>
          <div className="text-3xl font-bold text-[#20364D]">{service.name}</div>
          <p className="text-slate-600 mt-4 leading-7">{service.description}</p>

          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="font-bold text-[#20364D]">Logged-in flow</div>
              <p className="text-slate-600 mt-2 text-sm">
                Submit the full structured request inside your account.
              </p>
              <button
                type="button"
                onClick={goAccountRequest}
                className="mt-4 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
              >
                Start Service Request
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="font-bold text-[#20364D]">Business pricing path</div>
              <p className="text-slate-600 mt-2 text-sm">
                For broader commercial support, request a business pricing conversation.
              </p>
              <button
                type="button"
                onClick={requestBusinessQuote}
                className="mt-4 rounded-xl border px-5 py-3 font-semibold text-[#20364D]"
              >
                Request Business Quote
              </button>
            </div>
          </div>
        </SurfaceCard>

        {!isLoggedIn ? (
          <form onSubmit={submitGuestLead} className="rounded-[2rem] border bg-white p-8">
            <div className="text-2xl font-bold text-[#20364D]">Not ready to create an account?</div>
            <p className="text-slate-600 mt-3">
              Leave your details and Konekt can follow up on this service need.
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
        ) : (
          <SurfaceCard>
            <div className="text-2xl font-bold text-[#20364D]">You are signed in</div>
            <p className="text-slate-600 mt-3">
              Use the account-mode actions on the left to submit a structured request or ask for business pricing.
            </p>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
