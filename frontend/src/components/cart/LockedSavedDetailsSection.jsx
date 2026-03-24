import React, { useState } from "react";

export default function LockedSavedDetailsSection({ title, values = [], children }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 p-4" data-testid={`locked-section-${title?.toLowerCase().replace(/\s+/g, '-') || 'details'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="text-base font-bold text-[#20364D]">{title}</div>
        <button onClick={() => setEditing((x) => !x)} data-testid={`locked-section-toggle-${title?.toLowerCase().replace(/\s+/g, '-') || 'details'}`}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#20364D] hover:bg-slate-50 transition-colors">
          {editing ? "Done" : "Change"}
        </button>
      </div>
      {!editing ? (
        <div className="space-y-1.5 mt-3 text-sm text-slate-600">
          {values.map((v, i) => <div key={i}>{v}</div>)}
        </div>
      ) : (
        <div className="mt-4">{children}</div>
      )}
    </div>
  );
}
