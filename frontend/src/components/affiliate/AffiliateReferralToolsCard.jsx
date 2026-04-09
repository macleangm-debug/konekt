import React from "react";

export default function AffiliateReferralToolsCard({ referralLink, promoCode }) {
  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      alert("Copied successfully.");
    } catch {
      alert("Copy failed.");
    }
  };

  const shareWhatsapp = () => {
    const text = encodeURIComponent(`Check out this platform using my link: ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="rounded-[2rem] border bg-white p-8">
      <div className="text-2xl font-bold text-[#20364D]">Referral Tools</div>

      <div className="space-y-4 mt-6">
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Referral Link</div>
          <div className="font-semibold text-[#20364D] mt-2 break-all">{referralLink}</div>
          <button type="button" onClick={() => copyText(referralLink)} className="mt-4 rounded-xl border px-4 py-2 font-semibold text-[#20364D]">
            Copy Link
          </button>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Promo Code</div>
          <div className="font-semibold text-[#20364D] mt-2">{promoCode}</div>
          <button type="button" onClick={() => copyText(promoCode)} className="mt-4 rounded-xl border px-4 py-2 font-semibold text-[#20364D]">
            Copy Code
          </button>
        </div>
      </div>

      <button type="button" onClick={shareWhatsapp} className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
        Share on WhatsApp
      </button>
    </div>
  );
}
