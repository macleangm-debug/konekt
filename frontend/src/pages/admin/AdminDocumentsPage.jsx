import React, { useState } from "react";
import { FileText, Download, Eye, Printer } from "lucide-react";
import VendorPartnerPresentation from "@/components/admin/documents/VendorPartnerPresentation";

const DOCUMENTS = [
  {
    id: "vendor-partner-deck",
    title: "Vendor & Partner Presentation",
    description: "Comprehensive partnership overview for potential and existing vendors. Covers value proposition, vendor journey, payment structures, and platform capabilities.",
    category: "Partnerships",
    updated: "April 2026",
    pages: 8,
  },
];

export default function AdminDocumentsPage() {
  const [previewDoc, setPreviewDoc] = useState(null);

  const handlePrint = (docId) => {
    setPreviewDoc(docId);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  if (previewDoc === "vendor-partner-deck") {
    return (
      <div>
        <div className="print:hidden mb-4 flex items-center gap-3">
          <button
            onClick={() => setPreviewDoc(null)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            data-testid="back-to-documents"
          >
            Back to Documents
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-[#20364D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4560] transition-colors"
            data-testid="print-presentation-btn"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>
        <VendorPartnerPresentation />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-documents-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Documents</h1>
        <p className="mt-1 text-sm text-slate-500">Downloadable presentations, guides, and materials for internal and external use.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENTS.map((doc) => (
          <div
            key={doc.id}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all"
            data-testid={`document-card-${doc.id}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#20364D]/5">
                <FileText className="h-6 w-6 text-[#20364D]" />
              </div>
              <div className="flex-1">
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {doc.category}
                </span>
                <h3 className="mt-2 text-base font-bold text-[#20364D]">{doc.title}</h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{doc.description}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span>{doc.pages} pages</span>
                  <span>Updated {doc.updated}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setPreviewDoc(doc.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                data-testid={`preview-${doc.id}`}
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                onClick={() => handlePrint(doc.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#20364D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] transition-colors"
                data-testid={`download-${doc.id}`}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
