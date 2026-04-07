import React from "react";
import { MessageSquare } from "lucide-react";

export default function StickyMobileSalesAssistBar({ onClick }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden"
      data-testid="sticky-mobile-sales-assist"
    >
      <button
        type="button"
        className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-[#17283C] flex items-center justify-center gap-2"
        onClick={onClick}
        data-testid="sticky-sales-assist-btn"
      >
        <MessageSquare className="w-4 h-4" />
        Talk to Sales
      </button>
    </div>
  );
}
