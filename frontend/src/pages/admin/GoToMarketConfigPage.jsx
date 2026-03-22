import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function GoToMarketConfigPage() {
  const [form, setForm] = useState({
    minimum_company_margin_percent: 20,
    distribution_layer_percent: 10,
    affiliate_percent: 10,
    sales_percent_self_generated: 15,
    sales_percent_affiliate_generated: 10,
    promo_percent: 10,
    referral_percent: 5,
    country_bonus_percent: 5,
    payout_threshold: 50000,
    payout_cycle: "monthly",
    attribution_window_days: 30,
    bank_only_payments: true,
    payment_verification_mode: "manual",
    ai_enabled: true,
    ai_handoff_after_messages: 3,
    assignment_mode: "auto",
  });

  useEffect(() => {
    api.get("/api/admin/go-to-market/settings").then((res) => {
      setForm((prev) => ({ ...prev, ...(res.data || {}) }));
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.put("/api/admin/go-to-market/settings", form);
    alert("Go-to-market settings saved.");
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Go-To-Market Configuration</div>
        <div className="text-slate-600 mt-2">Control the entire commercial system from one place.</div>
      </div>

      <form onSubmit={save} className="rounded-[2rem] border bg-white p-8">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Minimum Company Margin %" value={form.minimum_company_margin_percent} onChange={(e) => setForm({ ...form, minimum_company_margin_percent: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Distribution Layer %" value={form.distribution_layer_percent} onChange={(e) => setForm({ ...form, distribution_layer_percent: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Affiliate %" value={form.affiliate_percent} onChange={(e) => setForm({ ...form, affiliate_percent: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Sales % (Self)" value={form.sales_percent_self_generated} onChange={(e) => setForm({ ...form, sales_percent_self_generated: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Sales % (Affiliate)" value={form.sales_percent_affiliate_generated} onChange={(e) => setForm({ ...form, sales_percent_affiliate_generated: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Promo %" value={form.promo_percent} onChange={(e) => setForm({ ...form, promo_percent: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Referral %" value={form.referral_percent} onChange={(e) => setForm({ ...form, referral_percent: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Country Bonus %" value={form.country_bonus_percent} onChange={(e) => setForm({ ...form, country_bonus_percent: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Payout Threshold" value={form.payout_threshold} onChange={(e) => setForm({ ...form, payout_threshold: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Attribution Window Days" value={form.attribution_window_days} onChange={(e) => setForm({ ...form, attribution_window_days: e.target.value })} />
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="AI Handoff After Messages" value={form.ai_handoff_after_messages} onChange={(e) => setForm({ ...form, ai_handoff_after_messages: e.target.value })} />
          <select className="border rounded-xl px-4 py-3" value={form.payout_cycle} onChange={(e) => setForm({ ...form, payout_cycle: e.target.value })}>
            <option value="monthly">monthly</option>
            <option value="weekly">weekly</option>
          </select>
          <select className="border rounded-xl px-4 py-3" value={form.payment_verification_mode} onChange={(e) => setForm({ ...form, payment_verification_mode: e.target.value })}>
            <option value="manual">manual</option>
            <option value="auto">auto</option>
          </select>
          <select className="border rounded-xl px-4 py-3" value={form.assignment_mode} onChange={(e) => setForm({ ...form, assignment_mode: e.target.value })}>
            <option value="auto">auto</option>
            <option value="manual">manual</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-6 mt-5">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.bank_only_payments} onChange={(e) => setForm({ ...form, bank_only_payments: e.target.checked })} />Bank-only Payments</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.ai_enabled} onChange={(e) => setForm({ ...form, ai_enabled: e.target.checked })} />AI Enabled</label>
        </div>

        <button type="submit" className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">Save Configuration</button>
      </form>
    </div>
  );
}
