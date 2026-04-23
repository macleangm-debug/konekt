import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, CheckCircle2, FileText, Download, AlertCircle, Loader2, RefreshCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

const API = process.env.REACT_APP_BACKEND_URL || "";

export default function AdminVendorAgreementsPage() {
  const [stats, setStats] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [showBumpModal, setShowBumpModal] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [bumpReason, setBumpReason] = useState("");
  const [bumping, setBumping] = useState(false);
  const [nudging, setNudging] = useState(false);

  const nudgeUnsigned = async () => {
    if (!window.confirm("Send a reminder email to every vendor that has NOT signed the current agreement?")) return;
    setNudging(true);
    try {
      const r = await api.post("/api/admin/vendor-agreements/nudge-unsigned");
      if (r.data.unsigned_count === 0) {
        toast.success("All vendors have already signed. No emails sent.");
      } else {
        toast.success(`Nudged ${r.data.sent} of ${r.data.unsigned_count} unsigned vendors${(r.data.failed || []).length ? ` · ${r.data.failed.length} failed` : ""}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Nudge failed");
    }
    setNudging(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        api.get("/api/admin/vendor-agreements/stats"),
        api.get("/api/admin/vendor-agreements"),
      ]);
      setStats(s.data);
      setDocs(d.data || []);
    } catch {
      toast.error("Failed to load");
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = docs.filter((d) =>
    !q || [d.vendor_display_name, d.signatory_name, d.signatory_email].some((f) => (f || "").toLowerCase().includes(q.toLowerCase()))
  );

  const bumpVersion = async () => {
    if (!newVersion.trim()) { toast.error("Enter a new version (e.g. 1.1)"); return; }
    if (!window.confirm(`Bump to v${newVersion}? Every vendor will be blocked from the portal until they re-sign. This cannot be undone.`)) return;
    setBumping(true);
    try {
      await api.post("/api/admin/vendor-agreements/bump-version", { new_version: newVersion, reason: bumpReason });
      toast.success(`Bumped to v${newVersion}. Vendors will re-sign on next login.`);
      setShowBumpModal(false);
      setNewVersion("");
      setBumpReason("");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to bump version");
    }
    setBumping(false);
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-vendor-agreements-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Vendor Supply Agreements</h1>
          <p className="text-sm text-slate-500 mt-1">Track which vendors have signed the current contract version.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={nudgeUnsigned} disabled={nudging} data-testid="nudge-unsigned-btn">
            {nudging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertCircle className="w-4 h-4 mr-2" />}
            {nudging ? "Sending…" : "Nudge unsigned vendors"}
          </Button>
          <Button variant="outline" onClick={() => setShowBumpModal(true)} data-testid="bump-version-btn">
            <RefreshCcw className="w-4 h-4 mr-2" /> Bump contract version
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5">
            <div className="text-xs uppercase font-semibold text-emerald-600">Signed (current)</div>
            <div className="text-2xl font-bold mt-1 text-[#20364D]" data-testid="stat-signed">{stats.signed_current_version}</div>
          </div>
          <div className="bg-gradient-to-b from-slate-50 to-white border rounded-2xl p-5">
            <div className="text-xs uppercase font-semibold text-slate-500">Total vendors</div>
            <div className="text-2xl font-bold mt-1 text-[#20364D]" data-testid="stat-total">{stats.total_vendors}</div>
          </div>
          <div className="bg-gradient-to-b from-indigo-50 to-white border border-indigo-200 rounded-2xl p-5">
            <div className="text-xs uppercase font-semibold text-indigo-600">Coverage</div>
            <div className="text-2xl font-bold mt-1 text-[#20364D]" data-testid="stat-coverage">{stats.coverage_pct}%</div>
          </div>
          <div className="bg-gradient-to-b from-amber-50 to-white border border-amber-200 rounded-2xl p-5">
            <div className="text-xs uppercase font-semibold text-amber-600">Current version</div>
            <div className="text-2xl font-bold mt-1 text-[#20364D]" data-testid="stat-version">v{stats.current_version}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#20364D]" />
            <h2 className="font-bold text-[#20364D]">Signed agreements</h2>
          </div>
          <Input placeholder="Search vendor or signatory…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" data-testid="agreements-search" />
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm text-slate-500">No agreements signed yet.</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Vendor</th>
                <th className="text-left px-4 py-3">Signatory</th>
                <th className="text-left px-4 py-3">Version</th>
                <th className="text-left px-4 py-3">Signed at</th>
                <th className="text-left px-4 py-3">IP</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t hover:bg-slate-50/40" data-testid={`agreement-row-${d.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{d.vendor_display_name || d.vendor_legal_name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{d.vendor_legal_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{d.signatory_name}</div>
                    <div className="text-[11px] text-slate-400">{d.signatory_title} · {d.signatory_email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">v{d.version}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{String(d.signed_at || "").slice(0, 19).replace("T", " ")}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{d.signed_ip || "—"}</td>
                  <td className="px-4 py-3">
                    {d.pdf_url && (
                      <a href={`${API}${d.pdf_url}`} target="_blank" rel="noreferrer" data-testid={`admin-dl-${d.id}`}>
                        <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5 mr-1" /> PDF</Button>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showBumpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="bump-version-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-[#20364D]">Bump contract version</h3>
                <p className="text-xs text-slate-500 mt-0.5">Current: <b>v{stats?.current_version}</b>. All vendors will be blocked until they re-sign.</p>
              </div>
            </div>
            <label className="text-xs font-semibold text-slate-600">New version</label>
            <Input value={newVersion} onChange={(e) => setNewVersion(e.target.value)} placeholder="e.g. 1.1" className="mb-3" data-testid="new-version-input" />
            <label className="text-xs font-semibold text-slate-600">Reason for the update (internal)</label>
            <Input value={bumpReason} onChange={(e) => setBumpReason(e.target.value)} placeholder="e.g. Added new payment-terms clause" className="mb-4" data-testid="bump-reason-input" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBumpModal(false)} disabled={bumping}>Cancel</Button>
              <Button onClick={bumpVersion} disabled={bumping || !newVersion.trim()} className="bg-amber-600 hover:bg-amber-700" data-testid="bump-confirm">
                {bumping ? "Bumping…" : "Bump version"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
