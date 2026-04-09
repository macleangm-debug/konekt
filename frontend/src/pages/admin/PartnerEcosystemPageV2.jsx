import React, { useMemo, useState } from "react";
import PartnerViewToggle from "../../components/partners/PartnerViewToggle";
import PartnerSpecificServicesField from "../../components/partners/PartnerSpecificServicesField";

const samplePartners = [
  {
    id: "p1",
    name: "On Demand International",
    email: "ops@ondemand.co.tz",
    partner_type: "service",
    country_code: "TZ",
    specific_services: ["Garment Printing", "T-Shirt Printing", "Hoodie Printing"],
    status: "active",
  },
  {
    id: "p2",
    name: "Office Supply Hub",
    email: "trade@oshub.co.tz",
    partner_type: "product",
    country_code: "TZ",
    specific_services: [],
    status: "active",
  },
];

export default function PartnerEcosystemPageV2() {
  const [view, setView] = useState("table");
  const [form, setForm] = useState({
    name: "",
    partner_type: "service",
    specific_services_csv: "",
  });

  const parsedServices = useMemo(
    () => (form.specific_services_csv || "").split(",").map((x) => x.trim()).filter(Boolean),
    [form.specific_services_csv]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-4xl font-bold text-[#20364D]">Partner Ecosystem</div>
          <div className="text-slate-600 mt-2">
            Use table view for operational control and card view for quick browsing.
          </div>
        </div>
        <PartnerViewToggle view={view} onChange={setView} />
      </div>

      <div className="rounded-[2rem] border bg-white p-8 space-y-6">
        <div>
          <div className="text-2xl font-bold text-[#20364D]">Partner Setup Rules</div>
          <div className="text-slate-600 mt-2">
            Service partners do not need SKU catalog fields. SKU belongs under admin product settings, not partner catalog settings.
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
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
        </div>

        <PartnerSpecificServicesField
          value={form.specific_services_csv}
          onChange={(v) => setForm({ ...form, specific_services_csv: v })}
        />

        {form.partner_type === "service" ? (
          <div className="rounded-2xl bg-amber-50 text-amber-800 p-4 text-sm">
            SKU, partner catalog settings, and global available quantity should not be used for service-only partners.
          </div>
        ) : (
          <div className="rounded-2xl bg-blue-50 text-blue-800 p-4 text-sm">
            For product partners, quantity should be tracked per product line or inventory item, not as one global partner quantity.
          </div>
        )}

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Parsed specific services preview</div>
          <div className="text-sm text-slate-700 mt-2">{parsedServices.join(", ") || "—"}</div>
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-[2rem] border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-5 py-4">Partner</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Country</th>
                  <th className="px-5 py-4">Specific Services</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Inventory Model</th>
                </tr>
              </thead>
              <tbody>
                {samplePartners.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#20364D]">{row.name}</div>
                      <div className="text-sm text-slate-500">{row.email}</div>
                    </td>
                    <td className="px-5 py-4 capitalize">{row.partner_type}</td>
                    <td className="px-5 py-4">{row.country_code}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{(row.specific_services || []).join(", ") || "—"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">{row.status}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{row.partner_type === "service" ? "No SKU catalog" : "Per-product inventory"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-5">
          {samplePartners.map((row) => (
            <div key={row.id} className="rounded-[2rem] border bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold text-[#20364D]">{row.name}</div>
                  <div className="text-sm text-slate-500 mt-1">{row.email}</div>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">{row.status}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-5">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Type</div>
                  <div className="font-semibold text-[#20364D] mt-2 capitalize">{row.partner_type}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Country</div>
                  <div className="font-semibold text-[#20364D] mt-2">{row.country_code}</div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 mt-4">
                <div className="text-xs text-slate-500">Specific Services</div>
                <div className="text-sm text-slate-700 mt-2">{(row.specific_services || []).join(", ") || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
