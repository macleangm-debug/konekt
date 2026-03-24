import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function AffiliatePromoBenefitEditor({ affiliateId }) {
  const [form, setForm] = useState({ headline: "", description: "", cta_label: "Use this link" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!affiliateId) return;
    api.get(`/api/payment-submission-fixes/affiliate-promo-benefit?affiliate_id=${encodeURIComponent(affiliateId)}`)
      .then((res) => setForm(res.data || { headline: "", description: "", cta_label: "Use this link" }))
      .catch(() => {});
  }, [affiliateId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/payment-submission-fixes/affiliate-promo-benefit", {
        affiliate_id: affiliateId,
        ...form,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setSaving(false);
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-4" data-testid="affiliate-promo-benefit-editor">
      <h2 className="text-lg font-bold text-[#20364D]">Promo Benefit</h2>
      <p className="text-slate-500 text-sm">Define the benefit the user sees when using this affiliate link/code.</p>

      <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Headline (e.g., Get 10% off!)" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} data-testid="promo-headline-input" />
      <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[100px] focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Description of the benefit" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="promo-description-input" />
      <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="CTA Label" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} data-testid="promo-cta-input" />

      <button onClick={save} disabled={saving} data-testid="save-promo-benefit-btn"
        className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50">
        {saving ? "Saving..." : saved ? "Saved!" : "Save Benefit"}
      </button>
    </div>
  );
}
