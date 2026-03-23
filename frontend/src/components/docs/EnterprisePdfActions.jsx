import React from "react";
import { Download, FileText } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function EnterprisePdfActions({ type = "quote", id }) {
  const downloadUrl = `${API_URL}/api/enterprise-docs/${type}/${id}/pdf`;
  
  return (
    <div className="flex gap-3" data-testid="enterprise-pdf-actions">
      <a 
        href={downloadUrl} 
        target="_blank" 
        rel="noreferrer" 
        className="rounded-xl border px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition flex items-center gap-2"
        data-testid="enterprise-download-pdf"
      >
        <Download className="w-4 h-4" />
        Download PDF
      </a>
    </div>
  );
}
