import React from "react";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center" data-testid="empty-state">
      {Icon && <Icon size={44} className="text-slate-300 mx-auto" />}
      <h2 className="text-xl font-bold text-[#20364D] mt-4">{title}</h2>
      {description && <p className="text-slate-500 mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
