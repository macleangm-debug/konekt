import React, { useEffect, useState } from "react";
import { FileText, Download, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import partnerApi from "../../lib/partnerApi";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL || "";

export default function VendorDocumentsPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await partnerApi.get("/api/vendor/agreement/history");
        setDocs(r.data || []);
      } catch {
        toast.error("Failed to load documents");
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 space-y-6" data-testid="vendor-documents-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Documents</h1>
        <p className="text-sm text-slate-500 mt-1">Your signed Konekt agreements and compliance records.</p>
      </div>

      <div className="bg-white rounded-2xl border">
        <div className="p-4 border-b flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#20364D]" />
          <h2 className="font-bold text-[#20364D]">Supply agreements</h2>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm text-slate-500">You haven't signed an agreement yet.</div>
            <Button onClick={() => nav("/partner/agreement")} data-testid="sign-now-btn">Sign now</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Agreement</th>
                <th className="text-left px-4 py-3">Version</th>
                <th className="text-left px-4 py-3">Signatory</th>
                <th className="text-left px-4 py-3">Signed at</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t hover:bg-slate-50/40" data-testid={`doc-row-${d.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <FileText className="w-4 h-4 text-[#20364D]" /> Konekt Vendor Supply Agreement
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{d.vendor_legal_name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">v{d.version}</td>
                  <td className="px-4 py-3">
                    {d.signatory_name}
                    <div className="text-[11px] text-slate-400">{d.signatory_title}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{String(d.signed_at || "").slice(0, 19).replace("T", " ")}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Signed
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.pdf_url && (
                      <a href={`${API}${d.pdf_url}`} target="_blank" rel="noreferrer" data-testid={`dl-${d.id}`}>
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
