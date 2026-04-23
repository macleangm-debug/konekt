import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, CheckCircle2, FileText, Download, AlertCircle, Loader2 } from "lucide-react";
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

  return (
    <div className="p-6 space-y-6" data-testid="admin-vendor-agreements-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Vendor Supply Agreements</h1>
          <p className="text-sm text-slate-500 mt-1">Track which vendors have signed the current contract version.</p>
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
    </div>
  );
}
