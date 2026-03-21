import React from "react";

export default function ServicePartnerCapabilityForm({
  form,
  setForm,
  onSubmit,
  submitLabel = "Save Mapping",
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-[2rem] border bg-white p-8" data-testid="service-partner-capability-form">
      <div className="text-2xl font-bold text-[#20364D]">Service-Partner Mapping</div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <input data-testid="partner-id-input" className="border rounded-xl px-4 py-3" placeholder="Partner ID" value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })} />
        <input data-testid="partner-name-input" className="border rounded-xl px-4 py-3" placeholder="Partner Name" value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} />
        <input data-testid="service-key-input" className="border rounded-xl px-4 py-3" placeholder="Service Key" value={form.service_key} onChange={(e) => setForm({ ...form, service_key: e.target.value })} />
        <input data-testid="service-name-input" className="border rounded-xl px-4 py-3" placeholder="Service Name" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
        <input data-testid="country-code-input" className="border rounded-xl px-4 py-3" placeholder="Country Code" value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })} />
        <input data-testid="regions-input" className="border rounded-xl px-4 py-3" placeholder="Regions (comma separated)" value={form.regions_csv} onChange={(e) => setForm({ ...form, regions_csv: e.target.value })} />
        <select data-testid="capability-status-select" className="border rounded-xl px-4 py-3" value={form.capability_status} onChange={(e) => setForm({ ...form, capability_status: e.target.value })}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="probation">probation</option>
        </select>
        <input data-testid="priority-rank-input" type="number" className="border rounded-xl px-4 py-3" placeholder="Priority Rank" value={form.priority_rank} onChange={(e) => setForm({ ...form, priority_rank: e.target.value })} />
        <input data-testid="quality-score-input" type="number" className="border rounded-xl px-4 py-3" placeholder="Quality Score" value={form.quality_score} onChange={(e) => setForm({ ...form, quality_score: e.target.value })} />
        <input data-testid="turnaround-days-input" type="number" className="border rounded-xl px-4 py-3" placeholder="Average Turnaround Days" value={form.avg_turnaround_days} onChange={(e) => setForm({ ...form, avg_turnaround_days: e.target.value })} />
        <input data-testid="success-rate-input" type="number" className="border rounded-xl px-4 py-3" placeholder="Success Rate" value={form.success_rate} onChange={(e) => setForm({ ...form, success_rate: e.target.value })} />
        <input data-testid="active-queue-input" type="number" className="border rounded-xl px-4 py-3" placeholder="Current Active Queue" value={form.current_active_queue} onChange={(e) => setForm({ ...form, current_active_queue: e.target.value })} />
      </div>

      <label className="flex items-center gap-3 mt-5">
        <input data-testid="preferred-routing-checkbox" type="checkbox" checked={!!form.preferred_routing} onChange={(e) => setForm({ ...form, preferred_routing: e.target.checked })} />
        Preferred routing partner for this service/country
      </label>

      <textarea data-testid="notes-textarea" className="border rounded-xl px-4 py-3 min-h-[120px] mt-5 w-full" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

      <button data-testid="submit-mapping-btn" type="submit" className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
        {submitLabel}
      </button>
    </form>
  );
}
