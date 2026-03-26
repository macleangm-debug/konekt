import React from "react";

export default function CustomerActivityRulesCard({ value, onChange }) {
  const v = value || {};

  const update = (key, val) => {
    onChange?.({ ...v, [key]: val });
  };

  const updateSignal = (key) => {
    const current = !!v.signals?.[key];
    onChange?.({
      ...v,
      signals: {
        ...(v.signals || {}),
        [key]: !current,
      },
    });
  };

  return (
    <div className="space-y-5" data-testid="customer-activity-rules-card">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Active Window (days)</label>
          <input
            type="number"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={v.active_days ?? 30}
            onChange={(e) => update("active_days", Number(e.target.value))}
            data-testid="activity-active-days-input"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">At Risk Window End (days)</label>
          <input
            type="number"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={v.at_risk_days ?? 90}
            onChange={(e) => update("at_risk_days", Number(e.target.value))}
            data-testid="activity-at-risk-days-input"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Default New Customer Status</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            value={v.default_new_customer_status || "active"}
            onChange={(e) => update("default_new_customer_status", e.target.value)}
            data-testid="activity-default-status-select"
          >
            <option value="active">Active</option>
            <option value="at_risk">At Risk</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-2 font-medium">Signals Used In Activity Calculation</div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {[
            ["orders", "Recent orders"],
            ["invoices", "Recent invoices"],
            ["quotes", "Recent quotes"],
            ["requests", "Recent service/promo requests"],
            ["sales_notes", "Recent sales notes/follow-up"],
            ["account_logins", "Recent account logins"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
              data-testid={`activity-signal-${key}`}
            >
              <input
                type="checkbox"
                checked={!!v.signals?.[key]}
                onChange={() => updateSignal(key)}
                className="rounded border-slate-300 text-[#20364D] focus:ring-[#20364D]"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Recommended defaults:</span>
        <span className="ml-1">Active = last 30 days | At Risk = 31-90 days | Inactive = 90+ days</span>
      </div>
    </div>
  );
}
