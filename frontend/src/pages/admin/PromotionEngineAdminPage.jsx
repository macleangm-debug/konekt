import React, { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";

export default function PromotionEngineAdminPage() {
  const [form, setForm] = useState({
    title: "",
    scope_type: "product_group",
    scope_key: "",
    discount_percent: 5,
    promo_type: "safe_distribution",
    affiliate_enabled: true,
    visible_to_all_affiliates: true,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Promotion Engine"
        subtitle="Create safe, margin-aware campaigns that do not touch the protected company margin."
      />

      <form className="rounded-[2rem] border bg-white p-8">
        <div className="grid md:grid-cols-2 gap-4">
          <input className="border rounded-xl px-4 py-3" placeholder="Campaign Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="border rounded-xl px-4 py-3" placeholder="Scope Key" value={form.scope_key} onChange={(e) => setForm({ ...form, scope_key: e.target.value })} />
          <select className="border rounded-xl px-4 py-3" value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value })}>
            <option value="product_group">product_group</option>
            <option value="product">product</option>
            <option value="service_group">service_group</option>
            <option value="service">service</option>
          </select>
          <input type="number" className="border rounded-xl px-4 py-3" placeholder="Discount %" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
        </div>
        <div className="text-sm text-slate-500 mt-5">
          Recommended for safe public affiliate campaigns: up to ~5% where distribution layer supports it.
        </div>
      </form>
    </div>
  );
}
