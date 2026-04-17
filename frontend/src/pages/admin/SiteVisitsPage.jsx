import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Clock, CheckCircle, FileText, DollarSign, User, ChevronRight, AlertTriangle, Eye } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const STAGES = {
  pending_visit_fee_payment: { label: "Awaiting Fee Payment", color: "bg-amber-100 text-amber-800", icon: DollarSign },
  visit_scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800", icon: Clock },
  visit_in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-800", icon: MapPin },
  visit_completed: { label: "Visit Done", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  service_quoted: { label: "Service Quoted", color: "bg-teal-100 text-teal-800", icon: FileText },
  service_accepted: { label: "Service Accepted", color: "bg-green-100 text-green-800", icon: CheckCircle },
};

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};
const fmtMoney = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

export default function SiteVisitsPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStage, setFilterStage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/site-visits");
      setVisits(Array.isArray(res.data) ? res.data : []);
    } catch { setVisits([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStage ? visits.filter(v => v.stage === filterStage) : visits;

  return (
    <div className="space-y-6" data-testid="site-visits-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Site Visit Management</h1>
        <p className="text-sm text-slate-500 mt-1">Track and manage site visit assessments — 2-stage service quote workflow</p>
      </div>

      {/* Stage Pipeline */}
      <div className="flex gap-2 overflow-x-auto pb-2" data-testid="stage-filters">
        <button onClick={() => setFilterStage("")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!filterStage ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          All ({visits.length})
        </button>
        {Object.entries(STAGES).map(([key, cfg]) => {
          const count = visits.filter(v => v.stage === key).length;
          return (
            <button key={key} onClick={() => setFilterStage(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterStage === key ? "bg-[#20364D] text-white" : `${cfg.color} hover:opacity-80`}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading site visits...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-2xl">
          <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-600">No site visits</h3>
          <p className="text-sm text-slate-400 mt-1">Site visits will appear here when service requests require on-site assessment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => {
            const stage = STAGES[v.stage] || STAGES.pending_visit_fee_payment;
            const StageIcon = stage.icon;
            return (
              <div key={v.id} className="bg-white border rounded-xl p-4 hover:shadow-sm transition cursor-pointer" onClick={() => setSelected(v)} data-testid={`visit-${v.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <StageIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#20364D]">{v.category_name || v.service_name || "Service Visit"}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <User className="w-3 h-3 inline mr-1" />{v.customer_name || v.customer_email || "-"}
                        {v.location && <span className="ml-3"><MapPin className="w-3 h-3 inline mr-1" />{v.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${stage.color}`}>{stage.label}</span>
                    <span className="text-xs text-slate-400">{fmtDate(v.created_at)}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 flex gap-1">
                  {Object.keys(STAGES).map((s, i) => (
                    <div key={s} className={`h-1 flex-1 rounded-full ${Object.keys(STAGES).indexOf(v.stage) >= i ? "bg-[#D4A843]" : "bg-slate-100"}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <SiteVisitDetailDrawer visit={selected} onClose={() => setSelected(null)} onUpdate={() => { load(); setSelected(null); }} />
      )}
    </div>
  );
}


function SiteVisitDetailDrawer({ visit, onClose, onUpdate }) {
  const [findings, setFindings] = useState(visit.findings || "");
  const [actualCost, setActualCost] = useState(visit.actual_service_cost || 0);
  const [saving, setSaving] = useState(false);
  const v = visit;
  const stage = STAGES[v.stage] || STAGES.pending_visit_fee_payment;

  const advanceStage = async (newStage, extra = {}) => {
    setSaving(true);
    try {
      await api.patch(`/api/site-visits/${v.id}/status`, { stage: newStage, ...extra });
      toast.success(`Visit moved to: ${STAGES[newStage]?.label || newStage}`);
      onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update");
    }
    setSaving(false);
  };

  const submitFindings = async () => {
    setSaving(true);
    try {
      await api.post(`/api/site-visits/${v.id}/submit-findings`, {
        findings,
        actual_service_cost: actualCost,
      });
      toast.success("Findings submitted");
      onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit findings");
    }
    setSaving(false);
  };

  const generateServiceQuote = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/api/site-visits/${v.id}/generate-service-quote`, {});
      toast.success(`Service quote created: ${res.data?.service_quote?.quote_number}`);
      onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to generate quote");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="site-visit-drawer">
        <div className="p-6 border-b bg-[#20364D] text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Site Visit Details</h2>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl">&times;</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${stage.color}`}>{stage.label}</span>
            <span className="text-sm text-slate-300">{v.category_name || v.service_name}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer */}
          <section>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2">Customer</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-medium">{v.customer_name || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium">{v.customer_email || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd className="font-medium">{v.customer_phone || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Location</dt><dd className="font-medium">{v.location || v.address || "-"}</dd></div>
            </dl>
          </section>

          {/* Visit Details */}
          <section>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2">Visit Info</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">Visit Fee</dt><dd className="font-bold text-[#D4A843]">{fmtMoney(v.visit_fee)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Fee Paid</dt><dd className={`font-semibold ${v.fee_paid ? "text-emerald-600" : "text-red-500"}`}>{v.fee_paid ? "Yes" : "No"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Scheduled</dt><dd>{v.scheduled_date || "-"} {v.scheduled_time || ""}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Vendor</dt><dd>{v.assigned_vendor_name || "Unassigned"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd>{fmtDate(v.created_at)}</dd></div>
            </dl>
          </section>

          {/* Stage-specific actions */}
          {v.stage === "pending_visit_fee_payment" && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-semibold">Waiting for visit fee payment</span>
              </div>
              <p className="text-xs text-amber-700 mb-3">Client needs to pay the site visit fee ({fmtMoney(v.visit_fee)}) before scheduling.</p>
              <button onClick={() => advanceStage("visit_scheduled", { fee_paid: true })} disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50" data-testid="mark-fee-paid">
                {saving ? "Saving..." : "Confirm Fee Paid & Schedule"}
              </button>
            </div>
          )}

          {v.stage === "visit_scheduled" && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-700 mb-3">Visit is scheduled. Mark as in progress when the technician arrives on site.</p>
              <button onClick={() => advanceStage("visit_in_progress")} disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" data-testid="mark-in-progress">
                {saving ? "Saving..." : "Mark In Progress"}
              </button>
            </div>
          )}

          {v.stage === "visit_in_progress" && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3">
              <p className="text-xs text-purple-700">Technician is on-site. Submit findings and actual cost when done.</p>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Findings / Assessment Notes</label>
                <textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={3} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Describe site condition, required work..." data-testid="findings-input" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Actual Service Cost (Base/Vendor)</label>
                <input type="number" value={actualCost} onChange={(e) => setActualCost(parseFloat(e.target.value) || 0)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" data-testid="actual-cost-input" />
                <p className="text-[10px] text-slate-400 mt-0.5">The pricing engine will calculate the sell price from this base cost</p>
              </div>
              <button onClick={submitFindings} disabled={saving || !findings} className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50" data-testid="submit-findings">
                {saving ? "Saving..." : "Submit Findings & Complete Visit"}
              </button>
            </div>
          )}

          {v.stage === "visit_completed" && !v.service_quote_id && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="text-sm font-semibold text-emerald-800">Visit Completed</div>
              {v.findings && <p className="text-xs text-emerald-700"><strong>Findings:</strong> {v.findings}</p>}
              {v.actual_service_cost > 0 && <p className="text-xs text-emerald-700"><strong>Base Cost:</strong> {fmtMoney(v.actual_service_cost)}</p>}
              <button onClick={generateServiceQuote} disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" data-testid="generate-service-quote">
                {saving ? "Generating..." : "Generate Service Quote"}
              </button>
            </div>
          )}

          {v.stage === "service_quoted" && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
              <div className="flex items-center gap-2 text-teal-800 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-semibold">Service Quote Sent</span>
              </div>
              <p className="text-xs text-teal-700">The service quote has been generated and sent to the client for approval.</p>
              {v.service_quote_id && <p className="text-xs text-teal-600 mt-1">Quote ID: {v.service_quote_id}</p>}
            </div>
          )}

          {/* Notes */}
          {v.notes && (
            <section>
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2">Notes</h3>
              <p className="text-sm text-slate-600">{v.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
