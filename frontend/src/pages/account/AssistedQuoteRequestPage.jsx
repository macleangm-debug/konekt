import React, { useState } from "react";

export default function AssistedQuoteRequestPage() {
  const [form, setForm] = useState({ need: "", quantity: "", timeline: "", notes: "" });

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Let Sales Assist Me</div>
        <div className="text-slate-600 mt-2">Give a short brief and let a sales advisor prepare the quote for you from inside your account.</div>
      </div>

      <form className="rounded-[2rem] border bg-white p-8 space-y-4">
        <input className="w-full border rounded-xl px-4 py-3" placeholder="What do you need?" value={form.need} onChange={(e) => setForm({ ...form, need: e.target.value })} />
        <input className="w-full border rounded-xl px-4 py-3" placeholder="Estimated quantity / scope" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <input className="w-full border rounded-xl px-4 py-3" placeholder="Timeline" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
        <textarea className="w-full min-h-[140px] border rounded-xl px-4 py-3" placeholder="Extra notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="button" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">Send to Sales</button>
      </form>
    </div>
  );
}
