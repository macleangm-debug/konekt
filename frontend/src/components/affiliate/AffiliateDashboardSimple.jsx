import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Link2, MousePointer, Users, DollarSign } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function AffiliateDashboardSimple({ affiliateId = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!affiliateId) { setLoading(false); return; }
    api.get(`/api/referral-commission/affiliate/dashboard?affiliate_id=${encodeURIComponent(affiliateId)}`)
      .then((res) => setData(res.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [affiliateId]);

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-24 bg-slate-100 rounded-[2rem]" /><div className="grid md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}</div></div>;
  if (!data) return <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500">No affiliate data available.</div>;

  const stats = [
    { label: "Clicks", value: data.stats.clicks, icon: MousePointer, color: "text-blue-600 bg-blue-50" },
    { label: "Leads", value: data.stats.leads, icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "Sales", value: data.stats.sales, icon: DollarSign, color: "text-green-600 bg-green-50" },
    { label: "Unpaid Commission", value: money(data.stats.unpaid_commission), icon: DollarSign, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-6" data-testid="affiliate-dashboard-simple">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-[#20364D]">{data.affiliate.name}</h1>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
          <span>Promo Code: <strong className="font-mono text-[#20364D]">{data.affiliate.promo_code}</strong></span>
          <span className="flex items-center gap-1"><Link2 size={14} /> {data.affiliate.referral_link}</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${data.affiliate.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>{data.affiliate.status}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><s.icon size={18} /></div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-[#20364D] mt-0.5">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
