import React from "react";
import { X } from "lucide-react";

export default function DetailDrawer({ open, onClose, title, subtitle, width = "max-w-xl", children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="detail-drawer">
      <div className="absolute inset-0 bg-[#20364D]/30 backdrop-blur-[3px]" onClick={onClose} />
      <div className={`relative w-full ${width} flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200`}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-[#20364D]">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" data-testid="close-drawer">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
