import React, { useEffect, useMemo, useState } from "react";
import partnerApi from "../../lib/partnerApi";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { toast } from "sonner";
import { FileText, Clock, Check, X, Trophy, Send, AlertTriangle, Search } from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const STATUS_CONFIG = {
  awaiting_response: { label: "Awaiting your quote", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  quoted: { label: "Quoted — pending review", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Send },
  awarded: { label: "Won", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Trophy },
  not_selected: { label: "Not selected", color: "bg-slate-100 text-slate-600 border-slate-200", icon: X },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: X },
  expired: { label: "Expired", color: "bg-red-50 text-red-600 border-red-200", icon: AlertTriangle },
  declined_by_vendor: { label: "You declined", color: "bg-slate-100 text-slate-500 border-slate-200", icon: X },
};

export default function VendorQuoteRequestsPage() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("awaiting");
  const [searchQ, setSearchQ] = useState("");
  const [drawerFor, setDrawerFor] = useState(null);
  const [form, setForm] = useState({ base_price: "", lead_time: "", notes: "", decline_reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ awaiting: 0, quoted: 0, won: 0, lost: 0, expired: 0 });

  const load = async () => {
    try {
      const [rfqR, statR] = await Promise.all([
        partnerApi.get(`/api/vendor/quote-requests?tab=${tab}`),
        partnerApi.get(`/api/vendor/quote-requests/stats`),
      ]);
      setRfqs(rfqR.data?.quote_requests || []);
      setStats(statR.data || stats);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load quote requests");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const visible = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return rfqs;
    return rfqs.filter(r => (r.product_or_service || "").toLowerCase().includes(q) || (r.category || "").toLowerCase().includes(q));
  }, [rfqs, searchQ]);

  const openDrawer = (r) => {
    setDrawerFor(r);
    setForm({
      base_price: r.my_quote?.base_price || "",
      lead_time: r.my_quote?.lead_time || (r.default_lead_time_days ? `${r.default_lead_time_days} days` : ""),
      notes: r.my_quote?.notes || "",
      decline_reason: "",
    });
  };

  const submitQuote = async () => {
    if (!form.base_price || Number(form.base_price) <= 0) {
      toast.error("Enter a valid base price");
      return;
    }
    setSubmitting(true);
    try {
      await partnerApi.post(`/api/vendor/quote-requests/${drawerFor.id}/respond`, {
        base_price: Number(form.base_price),
        lead_time: form.lead_time,
        notes: form.notes,
      });
      toast.success("Quote submitted — Ops will review shortly");
      setDrawerFor(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to submit quote");
    } finally {
      setSubmitting(false);
    }
  };

  const declineQuote = async () => {
    setSubmitting(true);
    try {
      await partnerApi.post(`/api/vendor/quote-requests/${drawerFor.id}/decline`, {
        reason: form.decline_reason,
      });
      toast.success("Declined");
      setDrawerFor(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to decline");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto" data-testid="vendor-rfq-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#20364D] flex items-center gap-2"><FileText className="w-6 h-6" /> Quote Requests</h1>
        <p className="text-sm text-slate-500 mt-1">Incoming price requests from Konekt Operations. Submit your best price and lead time — Ops will review and get back to you.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-amber-600">{stats.awaiting || 0}</div><div className="text-xs text-slate-500">Awaiting you</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-blue-600">{stats.quoted || 0}</div><div className="text-xs text-slate-500">Quoted</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-emerald-600">{stats.won || 0}</div><div className="text-xs text-slate-500">Won</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-slate-500">{stats.lost || 0}</div><div className="text-xs text-slate-500">Not selected</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-red-500">{stats.expired || 0}</div><div className="text-xs text-slate-500">Expired</div></div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-white border rounded-xl p-1" data-testid="rfq-tabs">
          {[
            { k: "awaiting", label: `Awaiting (${stats.awaiting || 0})`, warn: (stats.awaiting || 0) > 0 },
            { k: "quoted", label: `Quoted (${stats.quoted || 0})` },
            { k: "won", label: `Won (${stats.won || 0})` },
            { k: "lost", label: `Lost (${stats.lost || 0})` },
            { k: "expired", label: `Expired (${stats.expired || 0})` },
            { k: "all", label: "All" },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              data-testid={`rfq-tab-${t.k}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === t.k ? "bg-[#20364D] text-white"
                  : t.warn ? "text-amber-600 hover:bg-amber-50" : "text-slate-600 hover:bg-slate-50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9 h-9 text-sm" placeholder="Search RFQs..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} data-testid="rfq-search" />
        </div>
      </div>

      {/* List — desktop table + mobile cards */}
      {loading ? <div className="p-8 text-center text-slate-500">Loading...</div> :
       visible.length === 0 ? <div className="bg-white rounded-xl border p-8 text-center text-slate-400">No quote requests in this tab.</div> : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm" data-testid="rfq-table">
              <thead className="bg-slate-50 border-b">
                <tr className="text-xs uppercase tracking-wider text-slate-500">
                  <th className="text-left py-2.5 px-4 font-semibold">Product / Service</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Category</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Qty</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Your Quote</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Status</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Received</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const s = r.my_quote?.status || "awaiting_response";
                  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.awaiting_response;
                  const Icon = cfg.icon;
                  return (
                    <tr key={r.id} onClick={() => openDrawer(r)}
                      className="border-b last:border-0 cursor-pointer hover:bg-slate-50 transition"
                      data-testid={`rfq-row-${r.id}`}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#20364D] truncate max-w-[280px]">{r.product_or_service}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[280px]">{(r.description || "").slice(0, 80)}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">{r.category || "—"}</td>
                      <td className="py-3 px-3 text-right">{r.quantity} {r.unit_of_measurement}</td>
                      <td className="py-3 px-3 text-right font-semibold">{r.my_quote?.base_price ? money(r.my_quote.base_price) : <span className="text-slate-300">—</span>}</td>
                      <td className="py-3 px-3">
                        <Badge className={`${cfg.color} border font-semibold`}><Icon className="w-3 h-3 mr-1" /> {cfg.label}</Badge>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {visible.map(r => {
              const s = r.my_quote?.status || "awaiting_response";
              const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.awaiting_response;
              return (
                <button key={r.id} onClick={() => openDrawer(r)}
                  className="w-full text-left bg-white rounded-xl border p-3.5 hover:border-[#20364D]/40 transition"
                  data-testid={`rfq-card-${r.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#20364D] truncate">{r.product_or_service}</div>
                      <div className="text-[11px] text-slate-400">{r.category} • {r.quantity} {r.unit_of_measurement}</div>
                    </div>
                    <Badge className={`${cfg.color} border text-[10px]`}>{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-slate-500">{r.my_quote?.base_price ? `Your quote: ${money(r.my_quote.base_price)}` : "Awaiting your quote"}</span>
                    <span className="text-[#20364D] font-semibold">Tap →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Drawer — respond to RFQ */}
      <Dialog open={!!drawerFor} onOpenChange={v => !v && setDrawerFor(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="rfq-drawer">
          {drawerFor && (() => {
            const s = drawerFor.my_quote?.status || "awaiting_response";
            const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.awaiting_response;
            const canRespond = s === "awaiting_response";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {drawerFor.product_or_service}
                    <Badge className={`${cfg.color} border text-[10px] font-semibold ml-2`}>{cfg.label}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {drawerFor.category} • Qty {drawerFor.quantity} {drawerFor.unit_of_measurement} • Sourcing: {drawerFor.sourcing_mode || "preferred"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {drawerFor.description && (
                    <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700">{drawerFor.description}</div>
                  )}
                  {drawerFor.notes_from_konekt && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                      <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold mb-1">Notes from Konekt</div>
                      <div className="text-blue-900 text-sm">{drawerFor.notes_from_konekt}</div>
                    </div>
                  )}

                  {canRespond ? (
                    <div className="border rounded-xl p-4 space-y-3" data-testid="respond-form">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Submit your quote</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Unit base price (TZS) *</Label>
                          <Input type="number" step="0.01" min="0" value={form.base_price}
                            onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))}
                            placeholder="e.g. 85000" data-testid="input-base-price" />
                          {form.base_price > 0 && (
                            <div className="text-[11px] text-slate-500 mt-1">Total: {money(Number(form.base_price) * drawerFor.quantity)}</div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Lead time</Label>
                          <Input value={form.lead_time}
                            onChange={e => setForm(p => ({ ...p, lead_time: e.target.value }))}
                            placeholder={`e.g. ${drawerFor.default_lead_time_days || 3} days`} data-testid="input-lead-time" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Notes (optional)</Label>
                        <textarea rows={3} value={form.notes}
                          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                          placeholder="Specs, quality, delivery conditions…"
                          className="w-full mt-1 border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                          data-testid="input-notes" />
                      </div>
                      <div className="bg-amber-50 border-l-4 border-amber-300 p-3 rounded text-[11px] text-amber-900">
                        Your price will be reviewed by Konekt Ops against our pricing source of truth. You'll be notified when the RFQ is awarded.
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button variant="outline" onClick={() => setDrawerFor(null)}>Close</Button>
                        <Button onClick={declineQuote} disabled={submitting} variant="outline" className="text-red-600 border-red-200" data-testid="decline-btn">
                          <X className="w-3.5 h-3.5 mr-1" /> Decline
                        </Button>
                        <Button onClick={submitQuote} disabled={submitting || !form.base_price} className="bg-[#20364D] hover:bg-[#17283C]" data-testid="submit-quote-btn">
                          <Send className="w-3.5 h-3.5 mr-1" /> Submit Quote
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-xl p-4 space-y-2" data-testid="submitted-quote">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Your quote</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><div className="text-[10px] text-slate-400">Unit price</div><div className="font-bold">{money(drawerFor.my_quote?.base_price)}</div></div>
                        <div><div className="text-[10px] text-slate-400">Total</div><div className="font-bold">{money((drawerFor.my_quote?.base_price || 0) * drawerFor.quantity)}</div></div>
                        <div><div className="text-[10px] text-slate-400">Lead time</div><div>{drawerFor.my_quote?.lead_time || "—"}</div></div>
                        <div><div className="text-[10px] text-slate-400">Submitted</div><div>{drawerFor.my_quote?.submitted_at ? new Date(drawerFor.my_quote.submitted_at).toLocaleString() : "—"}</div></div>
                      </div>
                      {drawerFor.my_quote?.notes && <div className="bg-slate-50 rounded p-2 text-xs text-slate-600 mt-2">{drawerFor.my_quote.notes}</div>}
                      {s === "awarded" && (
                        <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded text-sm text-emerald-900 font-semibold flex items-center gap-2 mt-2">
                          <Trophy className="w-4 h-4" /> Congratulations! You won this RFQ. Konekt will now place an order with you.
                        </div>
                      )}
                      {(s === "not_selected" || s === "rejected") && (
                        <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded text-xs text-slate-600 mt-2">Another vendor was selected for this RFQ.</div>
                      )}
                      {s === "expired" && (
                        <div className="bg-red-50 border-l-4 border-red-300 p-3 rounded text-xs text-red-700 mt-2">This RFQ expired before a response was received.</div>
                      )}
                      <div className="flex justify-end pt-2 border-t">
                        <Button variant="outline" onClick={() => setDrawerFor(null)}>Close</Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
