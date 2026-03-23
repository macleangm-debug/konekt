import React, { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

/**
 * Real PDF download actions for quotes and invoices
 * Uses the /api/pdf/ endpoints for actual PDF generation
 */
export default function RealPdfDownloadActions({ type = "quote", id }) {
  const [downloading, setDownloading] = useState(false);
  
  const downloadUrl = `${API_URL}/api/pdf/${type}s/${id}`;
  const previewUrl = `${API_URL}/api/pdf/${type}s/${id}/preview`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Open PDF in new tab (browser will handle download)
      window.open(downloadUrl, "_blank");
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  const handlePreview = () => {
    window.open(previewUrl, "_blank");
  };

  return (
    <div className="flex gap-3" data-testid="pdf-actions">
      <button 
        onClick={handleDownload}
        disabled={downloading}
        className="rounded-xl border px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition flex items-center gap-2 disabled:opacity-50"
        data-testid="download-pdf-btn"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Download PDF
      </button>
      
      <button 
        onClick={handlePreview}
        className="rounded-xl border px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition flex items-center gap-2"
        data-testid="preview-pdf-btn"
      >
        <Eye className="w-4 h-4" />
        Preview
      </button>
    </div>
  );
}
