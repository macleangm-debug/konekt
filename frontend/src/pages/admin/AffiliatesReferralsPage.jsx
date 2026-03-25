import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { Megaphone, Users, DollarSign, Wallet, ToggleLeft, ToggleRight, CheckCircle } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

const TABS = [
  { key: "affiliates", label: "Affiliates", icon: Megaphone },
  { key: "referrals", label: "Referrals", icon: Users },
  { key: "commissions", label: "Commissions", icon: DollarSign },
  { key: "payouts", label: "Payouts", icon: Wallet },
];

export default function AffiliatesReferralsPage() {
  const [tab, setTab] = useState("affiliates");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { search: search || undefined };
    const fetcher = tab === "affiliates" ? adminApi.getAffiliatesList(params)
      : tab === "referrals" ? adminApi.getReferralsList()
      : tab === "commissions" ? adminApi.getCommissionsList(params)
      : adminApi.getPayoutsList();
    fetcher
      .then((res) => {
        if (tab === "referrals") {
          const d = res.data || {};
          setRows([...(d.events || []), ...(d.codes || [])]);
        } else {
          setRows(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const handleToggleAffiliate = async (id) => {
    setActionLoading(true);
    try { await adminApi.toggleAffiliateStatus(id); setSelected(null); load(); }
    catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  const handleApprovePayout = async (id) => {
    setActionLoading(true);
    try { await adminApi.approvePayout(id); setSelected(null); load(); }
    catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  return (
    <div data-testid="affiliates-referrals-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Affiliates & Referrals</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage affiliate partners, customer referrals, commissions, and payouts.</p>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" data-testid="affiliate-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-[#20364D] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            data-testid={`tab-${t.key}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {(tab === "affiliates" || tab === "commissions") && <FilterBar search={search} onSearchChange={setSearch} />}

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid={`${tab}-table`}>
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  {tab === "affiliates" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Code</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                  </>)}
                  {tab === "referrals" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Code / Event</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                  </>)}
                  {tab === "commissions" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Recipient</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Order</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                  </>)}
                  {tab === "payouts" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Recipient</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                  </>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} onClick={() => setSelected(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`${tab}-row-${idx}`}>
                    {tab === "affiliates" && (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{row.name || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.email || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.code || "-"}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                    </>)}
                    {tab === "referrals" && (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{row.code || row.referral_code || row.event_type || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.user_email || row.referrer_email || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.type || row.event_type || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                    </>)}
                    {tab === "commissions" && (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{row.recipient_name || row.type || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.order_id?.slice(0,12) || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{money(row.amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                    </>)}
                    {tab === "payouts" && (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{row.recipient_name || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{money(row.amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                    </>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={TABS.find(t => t.key === tab)?.icon || Megaphone} title={`No ${tab} found`} description={`${tab.charAt(0).toUpperCase() + tab.slice(1)} data will appear here.`} />
      )}

      <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title={`${tab.charAt(0).toUpperCase() + tab.slice(1)} Detail`}>
        {selected && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
              {Object.entries(selected).filter(([k]) => !["_id","id"].includes(k)).slice(0,8).map(([k,v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500 capitalize">{k.replace(/_/g," ")}</span>
                  <span className="font-medium text-[#20364D] text-right max-w-[200px] truncate">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "-")}</span>
                </div>
              ))}
            </div>
            {tab === "affiliates" && selected.id && (
              <button onClick={() => handleToggleAffiliate(selected.id)} disabled={actionLoading} data-testid="toggle-affiliate-btn"
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2">
                {selected.status === "active" ? <><ToggleLeft size={16} /> Deactivate</> : <><ToggleRight size={16} /> Activate</>}
              </button>
            )}
            {tab === "payouts" && selected.status !== "approved" && selected.id && (
              <button onClick={() => handleApprovePayout(selected.id)} disabled={actionLoading} data-testid="approve-payout-btn"
                className="w-full rounded-xl bg-green-600 text-white px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <CheckCircle size={16} /> Approve Payout
              </button>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
