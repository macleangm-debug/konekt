import React, { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";

export default function ServiceDynamicRequestForm() {
  const [templates, setTemplates] = useState([]);
  const [serviceKey, setServiceKey] = useState("general");
  const [form, setForm] = useState({});

  useEffect(() => {
    api.get("/api/service-request-templates").then((res) => setTemplates(res.data || []));
  }, []);

  const template = useMemo(
    () => templates.find((x) => x.service_key === serviceKey) || templates.find((x) => x.service_key === "general"),
    [templates, serviceKey]
  );

  return (
    <div className="rounded-[2rem] border bg-white p-8 space-y-5">
      <div className="text-2xl font-bold text-[#20364D]">In-Account Service Request</div>

      <label className="block">
        <div className="text-sm text-slate-500 mb-2">Choose Service</div>
        <select className="w-full border rounded-xl px-4 py-3" value={serviceKey} onChange={(e) => { setServiceKey(e.target.value); setForm({}); }}>
          {templates.map((tpl) => (
            <option key={tpl.service_key} value={tpl.service_key}>{tpl.service_name}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-4">
        {(template?.fields || []).map((field) => (
          <label key={field.key} className="block">
            <div className="text-sm text-slate-500 mb-2">{field.label}</div>
            {field.type === "textarea" ? (
              <textarea
                className="w-full min-h-[120px] border rounded-xl px-4 py-3"
                placeholder={field.placeholder}
                value={form[field.key] || ""}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              />
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                className="w-full border rounded-xl px-4 py-3"
                placeholder={field.placeholder}
                value={form[field.key] || ""}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>

      <button type="button" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
        Submit Request
      </button>
    </div>
  );
}
