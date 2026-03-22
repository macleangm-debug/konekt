import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";

export default function AffiliatePartnerDetailPage() {
  const { affiliateId } = useParams();
  const [data, setData] = useState(null);

  const load = async () => {
    const res = await api.get(`/api/admin/affiliates/${affiliateId}`);
    setData(res.data);
  };

  useEffect(() => { load(); }, [affiliateId]);

  const updateStatus = async (affiliate_status) => {
    await api.put(`/api/admin/affiliates/${affiliateId}/status`, { affiliate_status });
    await load();
  };

  const updatePromo = async () => {
    const promo_code = prompt("Enter new promo code", data?.promo_code || "");
    if (!promo_code) return;
    await api.put(`/api/admin/affiliates/${affiliateId}/promo-code`, { promo_code });
    await load();
  };

  if (!data) return <div className="p-10">Loading affiliate detail...</div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">{data.name}</div>
        <div className="text-slate-600 mt-2">{data.email}</div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Clicks</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.clicks}</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Sales</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.sales}</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Commission</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.total_commission}</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Promo Code</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.promo_code}</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Status</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.affiliate_status}</div></div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => updateStatus("active")} className="rounded-xl border px-4 py-3 font-semibold text-[#20364D]">Activate</button>
        <button onClick={() => updateStatus("watchlist")} className="rounded-xl border px-4 py-3 font-semibold text-[#20364D]">Watchlist</button>
        <button onClick={() => updateStatus("paused")} className="rounded-xl border px-4 py-3 font-semibold text-[#20364D]">Pause</button>
        <button onClick={() => updateStatus("suspended")} className="rounded-xl border px-4 py-3 font-semibold text-[#20364D]">Suspend</button>
        <button onClick={updatePromo} className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold">Edit Promo Code</button>
      </div>

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Masked Sales</div>
        <div className="space-y-4 mt-6">
          {data.masked_sales.map((row, idx) => (
            <div key={idx} className="rounded-2xl border bg-slate-50 p-4">
              <div className="font-semibold text-[#20364D]">{row.customer_masked}</div>
              <div className="text-sm text-slate-500 mt-1">Order {row.order_id} • Amount {row.amount} • {row.status}</div>
            </div>
          ))}
          {!data.masked_sales.length ? <div className="text-slate-600">No sales yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
