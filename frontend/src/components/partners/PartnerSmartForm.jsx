import React, { useMemo } from "react";
import PartnerSectionCard from "./PartnerSectionCard";
import PhoneNumberField from "../forms/PhoneNumberField";

export default function PartnerSmartForm({ form, setForm }) {
  const parsedServices = useMemo(
    () => (form.specific_services_csv || "").split(",").map((x) => x.trim()).filter(Boolean),
    [form.specific_services_csv]
  );

  const isService = form.partner_type === "service";
  const isProduct = form.partner_type === "product";
  const isHybrid = form.partner_type === "hybrid";

  return (
    <div className="space-y-6">
      <PartnerSectionCard title="Basics" description="Core partner identity and contact details.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Partner Name</div>
            <input className="w-full border rounded-xl px-4 py-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Partner Type</div>
            <select className="w-full border rounded-xl px-4 py-3" value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })}>
              <option value="service">Service Partner</option>
              <option value="product">Product Partner</option>
              <option value="hybrid">Hybrid Partner</option>
            </select>
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Country</div>
            <input className="w-full border rounded-xl px-4 py-3" value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })} />
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Status</div>
            <select className="w-full border rounded-xl px-4 py-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="paused">Paused</option>
            </select>
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Contact Person</div>
            <input className="w-full border rounded-xl px-4 py-3" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Email</div>
            <input className="w-full border rounded-xl px-4 py-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm text-slate-500 mb-2">Phone</div>
            <PhoneNumberField
              label=""
              prefix={form.phone_prefix || "+255"}
              number={form.phone || ""}
              onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
              onNumberChange={(v) => setForm({ ...form, phone: v })}
              testIdPrefix="partner-phone"
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Region Coverage</div>
            <input className="w-full border rounded-xl px-4 py-3" value={form.region_coverage} onChange={(e) => setForm({ ...form, region_coverage: e.target.value })} placeholder="Dar es Salaam, Arusha..." />
          </label>
        </div>
      </PartnerSectionCard>

      <PartnerSectionCard title="Capabilities" description="Define what this partner can actually do.">
        {(isService || isHybrid) ? (
          <>
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Service Groups</div>
              <input className="w-full border rounded-xl px-4 py-3" value={form.service_groups_csv} onChange={(e) => setForm({ ...form, service_groups_csv: e.target.value })} placeholder="Printing Services, Branding..." />
            </label>

            <label className="block mt-4">
              <div className="text-sm text-slate-500 mb-2">Specific Services</div>
              <textarea
                className="w-full min-h-[120px] border rounded-xl px-4 py-3"
                placeholder="Garment Printing, T-Shirt Printing, Hoodie Printing, Corporate Apparel Branding"
                value={form.specific_services_csv}
                onChange={(e) => setForm({ ...form, specific_services_csv: e.target.value })}
              />
              <div className="text-xs text-slate-500 mt-2">
                Use comma-separated values. This replaces fragmented service capability pages.
              </div>
            </label>

            <div className="rounded-2xl bg-slate-50 p-4 mt-4">
              <div className="text-sm text-slate-500">Specific services preview</div>
              <div className="text-sm text-slate-700 mt-2">{parsedServices.join(", ") || "—"}</div>
            </div>
          </>
        ) : null}

        {(isProduct || isHybrid) ? (
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-slate-500 mb-2">Product Categories</div>
              <input className="w-full border rounded-xl px-4 py-3" value={form.product_categories_csv} onChange={(e) => setForm({ ...form, product_categories_csv: e.target.value })} placeholder="Office Equipment, Furniture..." />
            </label>

            <div className="rounded-2xl bg-blue-50 text-blue-800 p-4 text-sm">
              Product partners should manage stock and quantity per product line or inventory item. Do not use one global quantity value for the whole partner.
            </div>
          </div>
        ) : null}

        {isService ? (
          <div className="rounded-2xl bg-amber-50 text-amber-800 p-4 text-sm">
            Service partners do not use SKU catalog settings. SKU belongs under Konekt admin product settings, not partner setup.
          </div>
        ) : null}
      </PartnerSectionCard>

      <PartnerSectionCard title="Routing & Selection Rules" description="How should the system choose this partner?">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Routing Priority</div>
            <select className="w-full border rounded-xl px-4 py-3" value={form.routing_priority} onChange={(e) => setForm({ ...form, routing_priority: e.target.value })}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Quality Score</div>
            <input type="number" className="w-full border rounded-xl px-4 py-3" value={form.quality_score} onChange={(e) => setForm({ ...form, quality_score: e.target.value })} />
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Success Rate %</div>
            <input type="number" className="w-full border rounded-xl px-4 py-3" value={form.success_rate} onChange={(e) => setForm({ ...form, success_rate: e.target.value })} />
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Average Turnaround (days)</div>
            <input type="number" className="w-full border rounded-xl px-4 py-3" value={form.turnaround_days} onChange={(e) => setForm({ ...form, turnaround_days: e.target.value })} />
          </label>

          <label className="flex items-center gap-3 rounded-xl border px-4 py-3 mt-6">
            <input type="checkbox" checked={!!form.preferred_partner} onChange={(e) => setForm({ ...form, preferred_partner: e.target.checked })} />
            <span className="text-sm text-[#20364D] font-medium">Preferred Partner</span>
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <input type="checkbox" checked={!!form.temporarily_unavailable} onChange={(e) => setForm({ ...form, temporarily_unavailable: e.target.checked })} />
          <span className="text-sm text-[#20364D] font-medium">Temporarily Unavailable</span>
        </label>
      </PartnerSectionCard>

      <PartnerSectionCard title="Performance Snapshot" description="Operational visibility without leaving this page.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Active Jobs</div><div className="text-2xl font-bold text-[#20364D] mt-2">{form.active_jobs || 0}</div></div>
          <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Completed Jobs</div><div className="text-2xl font-bold text-[#20364D] mt-2">{form.completed_jobs || 0}</div></div>
          <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Overdue Jobs</div><div className="text-2xl font-bold text-[#20364D] mt-2">{form.overdue_jobs || 0}</div></div>
          <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Last Update</div><div className="text-lg font-bold text-[#20364D] mt-2">{form.last_update || "—"}</div></div>
        </div>
      </PartnerSectionCard>
    </div>
  );
}
