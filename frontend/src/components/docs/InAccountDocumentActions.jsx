import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function InAccountDocumentActions({ type = "quote", id }) {
  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/docs/${type}/${id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const url = res.data?.download_url;
      if (url) {
        // If it's a relative URL, prepend the API URL
        const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
        window.open(fullUrl, "_blank");
      }
    } catch (err) {
      console.error(`Failed to download ${type} PDF:`, err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex gap-3" data-testid="document-actions">
      <button 
        onClick={downloadPdf}
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
    </div>
  );
}
