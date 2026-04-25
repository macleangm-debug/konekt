import React, { useEffect, useState, useCallback } from "react";
import { Users, Loader2, Search, CheckCircle, XCircle, Send, RefreshCw, ExternalLink } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const ACTIVATION_STYLES = {
  not_sent: "bg-slate-100 text-slate-500",
  sent: "bg-blue-100 text-blue-700",
  activated: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-600",
};

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return "—"; }
}
function fmtTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function fitScore(app) {
  let score = 0;
  const aud = app.audience_size || "";
  if (aud.includes("5,000")) score += 3;
  else if (aud.includes("1,000")) score += 2;
  else if (aud.includes("500")) score += 1;
  if (app.prior_experience) score += 2;
  if (parseInt(app.expected_monthly_sales) >= 20) score += 2;
  else if (parseInt(app.expected_monthly_sales) >= 10) score += 1;
  if (app.willing_to_promote_weekly) score += 1;
  if (score >= 6) return { label: "High", color: "text-emerald-600 bg-emerald-50" };
  if (score >= 3) return { label: "Medium", color: "text-amber-600 bg-amber-50" };
  return { label: "Low", color: "text-red-600 bg-red-50" };
}

export default function AffiliateApplicationsPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, statsRes] = await Promise.all([
        api.get(filter === "all" ? "/api/affiliate-applications" : `/api/affiliate-applications?status=${filter}`),
        api.get("/api/affiliate-applications/stats"),
      ]);
      // Always sort newest-first regardless of API order, so the latest
      // application is on top.
      const apps = (appRes.data?.applications || []).slice().sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return tb - ta;
      });
      setItems(apps);
      setStats(statsRes.data || {});
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Load canonical rejection reasons once
  useEffect(() => {
    api.get("/api/affiliate-applications/rejection-reasons")
      .then((r) => setRejectionReasons(r.data?.reasons || []))
      .catch(() => {});
  }, []);

  const openDetail = (item) => { setSelected(item); setAdminNotes(item.admin_notes || ""); };
  const openReject = () => { setRejectReason(""); setRejectNote(""); setRejectOpen(true); };

  const approve = async (id) => {
    try {
      const res = await api.post(`/api/affiliate-applications/${id}/approve`, { admin_notes: adminNotes });
      toast.success("Approved! Activation link sent.");
      if (res.data?.whatsapp_link) {
        setSelected((prev) => prev ? { ...prev, status: "approved", whatsapp_link: res.data.whatsapp_link, activation_link: res.data.activation_link } : prev);
      } else {
        setSelected(null);
      }
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const confirmReject = async () => {
    if (!rejectReason) { toast.error("Please pick a rejection reason"); return; }
    try {
      const res = await api.post(`/api/affiliate-applications/${selected.id}/reject`, {
        rejection_reason: rejectReason,
        admin_notes: rejectNote.trim(),
      });
      toast.success("Application rejected — applicant has been notified.");
      // Optionally surface the WhatsApp link so admin can also DM if needed
      if (res.data?.whatsapp_link) {
        window.open(res.data.whatsapp_link, "_blank");
      }
      setRejectOpen(false);
      setSelected(null);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const resendActivation = async (id) => {
    try {
      const res = await api.post(`/api/affiliate-applications/${id}/resend-activation`);
      toast.success("Activation link resent!");
      if (res.data?.whatsapp_link) {
        setSelected((prev) => prev ? { ...prev, whatsapp_link: res.data.whatsapp_link, activation_link: res.data.activation_link } : prev);
      }
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const openWhatsApp = async (app) => {
    const link = app.whatsapp_link || selected?.whatsapp_link;
    if (link) {
      window.open(link, "_blank");
      try { await api.post(`/api/affiliate-applications/${app.id}/mark-whatsapp-sent`); } catch {}
    }
  };

  const filtered = items.filter((i) =>
    !search || [i.full_name, i.email, i.primary_platform, i.location].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="affiliate-applications-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Affiliate Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review qualification data and manage approvals</p>
        </div>
        {stats.pending > 0 && <Badge className="bg-amber-100 text-amber-700" data-testid="pending-badge">{stats.pending} Pending</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="app-stats">
        <StatCard label="Pending" value={stats.pending || 0} color="text-amber-600" />
        <StatCard label="Approved" value={stats.approved || 0} color="text-emerald-600" />
        <StatCard label="Rejected" value={stats.rejected || 0} color="text-red-600" />
        <StatCard label="Active" value={stats.active_affiliates || 0} color="text-blue-600" />
        <StatCard label="Slots" value={stats.max_affiliates > 0 ? `${stats.slots_remaining}/${stats.max_affiliates}` : "Unlimited"} color="text-slate-600" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`filter-${f}`}>{f}</button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" data-testid="search-applications" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed rounded-xl"><Users className="w-12 h-12 mx-auto text-slate-200 mb-3" /><p className="text-sm text-slate-500">{search ? "No matches" : "No applications"}</p></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" data-testid="applications-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Platform</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Audience</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Monthly Sales</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Fit</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const fit = fitScore(item);
                  return (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition" onClick={() => openDetail(item)} data-testid={`app-row-${item.id}`}>
                      <td className="px-4 py-3 whitespace-nowrap"><div className="text-xs font-medium text-[#20364D]">{fmtDate(item.created_at)}</div><div className="text-[10px] text-slate-400 mt-0.5">{fmtTime(item.created_at)}</div></td>
                      <td className="px-4 py-3"><div className="font-medium text-[#20364D]">{item.full_name}</div><div className="text-[10px] text-slate-400">{item.email}</div></td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.primary_platform || "\u2014"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.audience_size || "\u2014"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.expected_monthly_sales || "\u2014"}</td>
                      <td className="px-4 py-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${fit.color}`}>{fit.label}</span></td>
                      <td className="px-4 py-3 text-center"><Badge className={`${STATUS_STYLES[item.status] || STATUS_STYLES.pending} capitalize`}>{item.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-xs text-slate-400 border-t">{filtered.length} application{filtered.length !== 1 ? "s" : ""}</div>
        </div>
      )}

      <StandardDrawerShell
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.full_name || "Application"}
        subtitle="Affiliate Application Review"
        badge={selected && <Badge className={`${STATUS_STYLES[selected.status] || STATUS_STYLES.pending} capitalize`}>{selected.status}</Badge>}
        testId="application-detail-drawer"
        footer={selected && selected.status === "pending" ? (
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={openReject} data-testid="drawer-reject-btn"><XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(selected.id)} data-testid="drawer-approve-btn"><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve</Button>
          </div>
        ) : null}
      >
        {selected && (
          <div className="space-y-5">
            {/* Qualification Summary */}
            {(() => { const fit = fitScore(selected); return (
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="qualification-summary">
                <div className="text-center"><p className="text-[10px] font-semibold text-slate-500 uppercase">Audience</p><p className="text-sm font-bold text-[#20364D] mt-0.5">{selected.audience_size || "\u2014"}</p></div>
                <div className="text-center"><p className="text-[10px] font-semibold text-slate-500 uppercase">Platform</p><p className="text-sm font-bold text-[#20364D] mt-0.5">{selected.primary_platform || "\u2014"}</p></div>
                <div className="text-center"><p className="text-[10px] font-semibold text-slate-500 uppercase">Monthly Sales</p><p className="text-sm font-bold text-[#20364D] mt-0.5">{selected.expected_monthly_sales || "\u2014"}</p></div>
                <div className="text-center"><p className="text-[10px] font-semibold text-slate-500 uppercase">Experience</p><p className="text-sm font-bold text-[#20364D] mt-0.5">{selected.prior_experience ? "Yes" : "No"}</p></div>
                <div className="text-center"><p className="text-[10px] font-semibold text-slate-500 uppercase">Fit</p><p className={`text-sm font-bold mt-0.5 ${fit.color} inline-block px-2 py-0.5 rounded-full`}>{fit.label}</p></div>
              </div>
            ); })()}

            {/* Identity Verification — surfaced for admin review */}
            {(selected.gender || selected.date_of_birth || selected.id_number || selected.id_document_url) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3" data-testid="identity-section">
                <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Identity</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {selected.gender && <div><div className="text-slate-500">Gender</div><div className="text-sm font-medium text-[#20364D] mt-0.5">{selected.gender}</div></div>}
                  {selected.date_of_birth && <div><div className="text-slate-500">Date of Birth</div><div className="text-sm font-medium text-[#20364D] mt-0.5">{selected.date_of_birth}</div></div>}
                  {selected.id_type && <div><div className="text-slate-500">ID Type</div><div className="text-sm font-medium text-[#20364D] mt-0.5 capitalize">{selected.id_type.replace("_", " ")}</div></div>}
                  {selected.id_number && <div><div className="text-slate-500">ID Number</div><div className="text-sm font-medium text-[#20364D] mt-0.5 font-mono">{selected.id_number}</div></div>}
                </div>
                {selected.id_document_url && (
                  <a href={selected.id_document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900" data-testid="id-document-link">
                    <ExternalLink className="w-3 h-3" /> View ID document
                  </a>
                )}
              </div>
            )}

            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-xs text-slate-500">Full Name</div><div className="text-sm font-medium text-[#20364D] mt-0.5">{selected.full_name}</div></div>
              <div><div className="text-xs text-slate-500">Email</div><div className="text-sm text-slate-600 mt-0.5">{selected.email}</div></div>
              <div><div className="text-xs text-slate-500">Phone</div><div className="text-sm text-slate-600 mt-0.5">{selected.phone || "\u2014"}</div></div>
              <div><div className="text-xs text-slate-500">Location</div><div className="text-sm text-slate-600 mt-0.5">{selected.location || "\u2014"}</div></div>
            </div>

            {/* Online Presence */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Online Presence</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selected.social_instagram && <div className="text-slate-600">IG: {selected.social_instagram}</div>}
                {selected.social_tiktok && <div className="text-slate-600">TT: {selected.social_tiktok}</div>}
                {selected.social_facebook && <div className="text-slate-600">FB: {selected.social_facebook}</div>}
                {selected.social_website && <div className="text-slate-600">Web: {selected.social_website}</div>}
              </div>
            </div>

            {/* Strategy */}
            {selected.promotion_strategy && (
              <div><div className="text-xs text-slate-500 mb-1">Promotion Strategy</div><div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selected.promotion_strategy}</div></div>
            )}
            {selected.why_join && (
              <div><div className="text-xs text-slate-500 mb-1">Why They Want to Join</div><div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selected.why_join}</div></div>
            )}
            {selected.prior_experience && selected.experience_description && (
              <div><div className="text-xs text-slate-500 mb-1">Prior Experience</div><div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selected.experience_description}</div></div>
            )}

            {/* Activation Status */}
            {selected.status === "approved" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3" data-testid="activation-section">
                <h3 className="text-sm font-semibold text-emerald-800">Approved \u2014 Activation Status</h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selected.activation_email_sent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    Email {selected.activation_email_sent ? "Sent" : "Not Sent"}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selected.activation_whatsapp_opened ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    WhatsApp {selected.activation_whatsapp_opened ? "Opened" : "Not Sent"}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTIVATION_STYLES[selected.activation_status] || ACTIVATION_STYLES.not_sent}`}>
                    {(selected.activation_status || "not_sent").replace("_", " ")}
                  </span>
                  {selected.setup_completed && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Setup Done</span>}
                </div>
                <div className="flex gap-2">
                  {!selected.account_activated && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => resendActivation(selected.id)} data-testid="resend-activation-btn">
                        <RefreshCw className="w-3 h-3 mr-1" /> Resend Activation
                      </Button>
                      <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => openWhatsApp(selected)} data-testid="whatsapp-activation-btn">
                        <Send className="w-3 h-3 mr-1" /> Send via WhatsApp
                      </Button>
                    </>
                  )}
                  {selected.activation_link && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { navigator.clipboard.writeText(selected.activation_link); toast.success("Link copied"); }}>
                      <ExternalLink className="w-3 h-3 mr-1" /> Copy Link
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {selected.status === "pending" && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Admin Notes</div>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add notes..." className="min-h-[60px]" data-testid="admin-notes-input" />
              </div>
            )}

            {selected.status === "rejected" && selected.admin_notes && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-red-700">Rejected</div>
                <div className="text-xs text-red-600 mt-1">{selected.admin_notes}</div>
              </div>
            )}
          </div>
        )}
      </StandardDrawerShell>

      {/* Rejection Dialog with canonical reasons */}
      {rejectOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setRejectOpen(false)} data-testid="reject-dialog">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b">
              <h3 className="text-base font-semibold text-[#20364D]">Reject Application</h3>
              <p className="text-xs text-slate-500 mt-0.5">{selected.full_name} · {selected.email}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Reason *</label>
                <div className="mt-2 space-y-1.5">
                  {rejectionReasons.map((r) => (
                    <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition ${rejectReason === r ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <input type="radio" name="reject-reason" value={r} checked={rejectReason === r} onChange={(e) => setRejectReason(e.target.value)} className="accent-red-600" data-testid={`reject-reason-${r.toLowerCase().replace(/\s+/g, "-")}`} />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Custom note (optional)</label>
                <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Add a personalized message to the applicant…" className="mt-1.5 min-h-[70px]" data-testid="reject-note-input" />
              </div>
            </div>
            <div className="px-5 py-3 border-t flex items-center justify-end gap-2 bg-slate-50/60 rounded-b-2xl">
              <Button size="sm" variant="outline" onClick={() => setRejectOpen(false)} data-testid="reject-cancel-btn">Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" disabled={!rejectReason} onClick={confirmReject} data-testid="reject-confirm-btn">
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Send Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white border rounded-xl p-3 text-center">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
