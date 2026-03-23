import React, { useState } from "react";

export default function AssistedSalesRequestFromCartPage() {
  const [form, setForm] = useState({
    objective: "",
    timeline: "",
    notes: "",
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Sales Assist From Cart</div>
        <div className="text-slate-600 mt-2">Let a sales advisor review your cart and prepare the quote for you.</div>
      </div>

      <div className="rounded-[2rem] border bg-white p-8 space-y-4">
        <input className="w-full border rounded-xl px-4 py-3" placeholder="What is your objective?" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
        <input className="w-full border rounded-xl px-4 py-3" placeholder="Timeline" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
        <textarea className="w-full min-h-[120px] border rounded-xl px-4 py-3" placeholder="Extra notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="button" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
          Send Cart to Sales
        </button>
      </div>
    </div>
  );
}
