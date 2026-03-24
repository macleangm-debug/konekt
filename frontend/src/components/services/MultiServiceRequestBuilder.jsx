import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Plus, Trash2, FileText, Layers } from "lucide-react";

function emptyLine() {
  return { group_key: "", subgroup: "", notes: "" };
}

export default function MultiServiceRequestBuilder({ customerId = "demo-customer", onSubmitted }) {
  const [taxonomy, setTaxonomy] = useState([]);
  const [lines, setLines] = useState([emptyLine()]);
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get("/api/multi-request/service-taxonomy")
      .then((res) => setTaxonomy(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((line, i) => i === idx ? { ...line, ...patch } : line));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    const validLines = lines.filter(l => l.group_key);
    if (validLines.length === 0) return alert("Please select at least one service");
    setSubmitting(true);
    try {
      const enrichedLines = validLines.map(l => {
        const group = taxonomy.find(g => g.group_key === l.group_key);
        return { ...l, group_name: group?.group_name || l.group_key };
      });
      await api.post("/api/multi-request/service-bundle", {
        customer_id: customerId,
        services: enrichedLines,
        brief,
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center space-y-4" data-testid="service-bundle-success">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <FileText size={28} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#20364D]">Service Request Sent</h2>
        <p className="text-slate-600">Our team will review your {lines.filter(l => l.group_key).length} service line(s) and prepare a quote.</p>
        <button onClick={() => { setSubmitted(false); setLines([emptyLine()]); setBrief(""); }} data-testid="service-bundle-reset"
          className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">New Request</button>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-5" data-testid="multi-service-builder">
      <div>
        <h2 className="text-2xl font-bold text-[#20364D]">Request Multiple Services</h2>
        <p className="text-slate-500 mt-1 text-sm">Bundle several services into one request and one quote process.</p>
      </div>

      {lines.map((line, idx) => {
        const group = taxonomy.find((g) => g.group_key === line.group_key);
        return (
          <div key={idx} className="rounded-2xl border border-slate-200 p-4 space-y-3" data-testid={`service-line-${idx}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Service {idx + 1}</span>
              {lines.length > 1 && (
                <button onClick={() => removeLine(idx)} data-testid={`remove-service-line-${idx}`}
                  className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <select className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" value={line.group_key}
                onChange={(e) => updateLine(idx, { group_key: e.target.value, subgroup: "" })}
                data-testid={`service-group-select-${idx}`}>
                <option value="">Select Service Group</option>
                {taxonomy.map((g) => <option key={g.group_key} value={g.group_key}>{g.group_name}</option>)}
              </select>
              <select className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" value={line.subgroup}
                onChange={(e) => updateLine(idx, { subgroup: e.target.value })}
                data-testid={`service-subgroup-select-${idx}`}>
                <option value="">Select Subgroup</option>
                {(group?.subgroups || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[70px] focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Notes for this service (optional)" value={line.notes} onChange={(e) => updateLine(idx, { notes: e.target.value })} data-testid={`service-notes-${idx}`} />
          </div>
        );
      })}

      <button onClick={addLine} data-testid="add-service-line-btn"
        className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-[#20364D] hover:border-[#20364D] hover:bg-slate-50 transition-colors w-full justify-center">
        <Plus size={16} /> Add Another Service
      </button>

      <div>
        <p className="text-sm font-medium text-slate-500 mb-2">Overall Brief / Shared Requirements</p>
        <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[100px] focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Describe your overall requirements — timelines, preferences, budget, etc." value={brief} onChange={(e) => setBrief(e.target.value)} data-testid="service-brief" />
      </div>

      <button onClick={submit} disabled={submitting} data-testid="submit-service-bundle-btn"
        className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        <Layers size={16} /> {submitting ? "Submitting..." : "Submit Service Request"}
      </button>
    </div>
  );
}
