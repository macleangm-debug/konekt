import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

export default function AffiliatePartnerManagerPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await api.get(`/api/admin/affiliates${q}`);
    setRows(res.data || []);
  };

  useEffect(() => { load(); }, [status]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-4xl font-bold text-[#20364D]">Affiliate Partner Manager</div>
          <div className="text-slate-600 mt-2">Manage affiliates as a structured growth channel.</div>
        </div>
        <select className="border rounded-xl px-4 py-3" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">all statuses</option>
          <option value="active">active</option>
          <option value="watchlist">watchlist</option>
          <option value="paused">paused</option>
          <option value="suspended">suspended</option>
        </select>
      </div>

      <div className="rounded-[2rem] border bg-white p-8 space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border bg-slate-50 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-[#20364D]">{row.name}</div>
                <div className="text-sm text-slate-500 mt-1">{row.email}</div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">Code {row.promo_code}</span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">Clicks {row.clicks}</span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">Sales {row.sales}</span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">Commission {row.total_commission}</span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-700">{row.affiliate_status}</span>
                </div>
              </div>
              <Link to={`/admin/affiliate-partners/${row.id}`} className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold text-center">
                View Detail
              </Link>
            </div>
          </div>
        ))}
        {!rows.length ? <div className="text-slate-600">No affiliates found.</div> : null}
      </div>
    </div>
  );
}
