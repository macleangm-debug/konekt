import React, { useEffect, useState, useCallback } from "react";
import { DollarSign, Check, X, Clock, CreditCard, Loader2, Search } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AffiliatePayoutsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPayout, setSelectedPayout] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/admin/affiliate-payouts" : `/api/admin/affiliate-payouts?status=${filter}`;
      const res = await api.get(url);
      setItems(res.data || []);
    } catch { toast.error("Failed to load payouts"); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try { await api.post(`/api/admin/affiliate-payouts/${id}/approve`, { note: "" }); toast.success("Approved"); load(); setSelectedPayout(null); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed to approve"); }
  };

  const reject = async (id) => {
    const note = window.prompt("Rejection reason (optional)");
    try { await api.post(`/api/admin/affiliate-payouts/${id}/reject`, { note: note || "" }); toast.success("Rejected"); load(); setSelectedPayout(null); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed to reject"); }
  };

  const markPaid = async (id) => {
    const reference = window.prompt("Enter payment reference");
    if (!reference) return;
    try {
      await api.post(`/api/admin/affiliate-payouts/${id}/mark-paid`, { payment_reference: reference, payment_method: "bank_transfer", note: "" });
      toast.success("Marked as paid"); load(); setSelectedPayout(null);
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const filtered = items.filter((i) =>
    !search || [i.affiliate_name, i.affiliate_email].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  const filters = ["all", "pending", "approved", "paid", "rejected"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="affiliate-payouts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Affiliate Payouts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review, approve, and complete payout requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`filter-${f}`}>
              {f === "all" ? `All (${items.length})` : f}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" data-testid="search-payouts" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="payouts-empty">
          <DollarSign className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No payout requests found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="payouts-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Affiliate</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Requested</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedPayout(item)} data-testid={`payout-row-${item.id}`}>
                    <td className="px-4 py-3 font-medium text-[#20364D]">{item.affiliate_name}</td>
                    <td className="px-4 py-3 text-slate-500">{item.affiliate_email}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#20364D]">TZS {Number(item.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${STATUS_STYLES[item.status] || "bg-slate-100 text-slate-600"} hover:opacity-90`}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      {item.status === "pending" && (
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => approve(item.id)} data-testid={`approve-btn-${item.id}`}>Approve</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => reject(item.id)} data-testid={`reject-btn-${item.id}`}>Reject</Button>
                        </div>
                      )}
                      {item.status === "approved" && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600 hover:bg-blue-50" onClick={() => markPaid(item.id)} data-testid={`mark-paid-btn-${item.id}`}>
                            <CreditCard className="w-3 h-3 mr-1" /> Mark Paid
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100">
            {filtered.length} payout{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <StandardDrawerShell
        open={!!selectedPayout}
        onClose={() => setSelectedPayout(null)}
        title={selectedPayout?.affiliate_name || "Payout Details"}
        subtitle="Payout request"
        badge={selectedPayout && <Badge className={`${STATUS_STYLES[selectedPayout.status] || "bg-slate-100 text-slate-600"} capitalize`}>{selectedPayout.status}</Badge>}
        testId="payout-detail-drawer"
        footer={selectedPayout && (
          <div className="flex items-center gap-2 justify-end">
            {selectedPayout.status === "pending" && (
              <>
                <Button size="sm" onClick={() => approve(selectedPayout.id)} data-testid="drawer-approve-btn">Approve</Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => reject(selectedPayout.id)} data-testid="drawer-reject-btn">Reject</Button>
              </>
            )}
            {selectedPayout.status === "approved" && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markPaid(selectedPayout.id)} data-testid="drawer-mark-paid-btn">
                <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Mark as Paid
              </Button>
            )}
          </div>
        )}
      >
        {selectedPayout && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">Requested Amount</div>
              <div className="text-2xl font-bold text-[#20364D]">TZS {Number(selectedPayout.amount || 0).toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Affiliate</div>
                <div className="text-sm font-medium text-[#20364D] mt-0.5">{selectedPayout.affiliate_name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Email</div>
                <div className="text-sm text-slate-600 mt-0.5">{selectedPayout.affiliate_email}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Requested</div>
                <div className="text-sm text-slate-600 mt-0.5">{selectedPayout.created_at ? new Date(selectedPayout.created_at).toLocaleString() : "-"}</div>
              </div>
              {selectedPayout.payment_reference && (
                <div>
                  <div className="text-xs text-slate-500">Payment Ref</div>
                  <div className="text-sm font-mono text-slate-600 mt-0.5">{selectedPayout.payment_reference}</div>
                </div>
              )}
            </div>
            {selectedPayout.note && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Notes</div>
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selectedPayout.note}</div>
              </div>
            )}
          </div>
        )}
      </StandardDrawerShell>
    </div>
  );
}
