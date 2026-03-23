import React, { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";

export default function ServiceDynamicRequestForm() {
  const [templates, setTemplates] = useState([]);
  const [serviceKey, setServiceKey] = useState("general");
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get("/api/service-request-templates").then((res) => setTemplates(res.data || []));
  }, []);

  const template = useMemo(
    () => templates.find((x) => x.service_key === serviceKey) || templates.find((x) => x.service_key === "general"),
    [templates, serviceKey]
  );

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = (template?.fields || []).filter(
      (f) => !form[f.key] || form[f.key].trim() === ""
    );
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.map((f) => f.label).join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/customer/in-account-service-requests", {
        service_key: serviceKey,
        service_name: template?.service_name || serviceKey,
        answers: form,
      });
      toast.success("Service request submitted successfully!");
      setSubmitted(true);
      setForm({});
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-[2rem] border bg-white p-8 space-y-5 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-2xl font-bold text-[#20364D]">Request Submitted!</div>
        <p className="text-slate-600">Our team will review your request and get back to you shortly.</p>
        <button
          onClick={() => setSubmitted(false)}
          className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          data-testid="submit-another-request-btn"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border bg-white p-8 space-y-5">
      <div className="text-2xl font-bold text-[#20364D]">In-Account Service Request</div>

      <label className="block">
        <div className="text-sm text-slate-500 mb-2">Choose Service</div>
        <select
          className="w-full border rounded-xl px-4 py-3"
          value={serviceKey}
          onChange={(e) => { setServiceKey(e.target.value); setForm({}); }}
          data-testid="service-select"
        >
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
                data-testid={`field-${field.key}`}
              />
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                className="w-full border rounded-xl px-4 py-3"
                placeholder={field.placeholder}
                value={form[field.key] || ""}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                data-testid={`field-${field.key}`}
              />
            )}
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="submit-request-btn"
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>
    </div>
  );
}
