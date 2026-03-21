import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import ServicePartnerCapabilityForm from "../../components/admin/ServicePartnerCapabilityForm";
import ServicePartnerCapabilityTable from "../../components/admin/ServicePartnerCapabilityTable";

const emptyForm = {
  id: null,
  partner_id: "",
  partner_name: "",
  service_key: "",
  service_name: "",
  country_code: "TZ",
  regions_csv: "",
  capability_status: "active",
  priority_rank: 1,
  quality_score: 0,
  avg_turnaround_days: 0,
  success_rate: 0,
  current_active_queue: 0,
  preferred_routing: false,
  notes: "",
};

export default function ServicePartnerCapabilitiesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({
    service_key: "",
    country_code: "",
  });

  const load = async () => {
    const query = new URLSearchParams();
    if (filters.service_key) query.set("service_key", filters.service_key);
    if (filters.country_code) query.set("country_code", filters.country_code);
    const res = await api.get(`/api/admin/service-partner-capabilities${query.toString() ? `?${query.toString()}` : ""}`);
    setRows(res.data || []);
  };

  useEffect(() => {
    load();
  }, [filters.service_key, filters.country_code]);

  const resetForm = () => setForm(emptyForm);

  const save = async (e) => {
    e.preventDefault();

    const payload = {
      partner_id: form.partner_id,
      partner_name: form.partner_name,
      service_key: form.service_key,
      service_name: form.service_name,
      country_code: form.country_code,
      regions: (form.regions_csv || "").split(",").map((x) => x.trim()).filter(Boolean),
      capability_status: form.capability_status,
      priority_rank: Number(form.priority_rank || 1),
      quality_score: Number(form.quality_score || 0),
      avg_turnaround_days: Number(form.avg_turnaround_days || 0),
      success_rate: Number(form.success_rate || 0),
      current_active_queue: Number(form.current_active_queue || 0),
      preferred_routing: !!form.preferred_routing,
      notes: form.notes,
    };

    if (form.id) {
      await api.put(`/api/admin/service-partner-capabilities/${form.id}`, payload);
    } else {
      await api.post("/api/admin/service-partner-capabilities", payload);
    }

    await load();
    resetForm();
  };

  const onEdit = (row) => {
    setForm({
      id: row.id,
      partner_id: row.partner_id || "",
      partner_name: row.partner_name || "",
      service_key: row.service_key || "",
      service_name: row.service_name || "",
      country_code: row.country_code || "TZ",
      regions_csv: (row.regions || []).join(", "),
      capability_status: row.capability_status || "active",
      priority_rank: row.priority_rank || 1,
      quality_score: row.quality_score || 0,
      avg_turnaround_days: row.avg_turnaround_days || 0,
      success_rate: row.success_rate || 0,
      current_active_queue: row.current_active_queue || 0,
      preferred_routing: !!row.preferred_routing,
      notes: row.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (row) => {
    await api.delete(`/api/admin/service-partner-capabilities/${row.id}`);
    await load();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Service Partner Capabilities"
        subtitle="Map one or more partners to one or more services, countries, and routing priorities."
      />

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <ServicePartnerCapabilityForm
          form={form}
          setForm={setForm}
          onSubmit={save}
          submitLabel={form.id ? "Update Mapping" : "Save Mapping"}
        />

        <div className="space-y-6">
          <div className="rounded-[2rem] border bg-white p-8">
            <div className="text-2xl font-bold text-[#20364D]">Filters</div>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <input
                className="border rounded-xl px-4 py-3"
                placeholder="Filter by Service Key"
                value={filters.service_key}
                onChange={(e) => setFilters({ ...filters, service_key: e.target.value })}
              />
              <input
                className="border rounded-xl px-4 py-3"
                placeholder="Filter by Country Code"
                value={filters.country_code}
                onChange={(e) => setFilters({ ...filters, country_code: e.target.value })}
              />
            </div>
          </div>

          <ServicePartnerCapabilityTable
            rows={rows}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
