import React, { useEffect, useState } from "react";
import { Wrench, MessageSquare, Send, Loader2 } from "lucide-react";
import axios from "axios";
import SalesAssistModalV2 from "../modals/SalesAssistModalV2";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function GuidedServiceRequestPanel() {
  const [templates, setTemplates] = useState([]);
  const [serviceKey, setServiceKey] = useState("general");
  const [form, setForm] = useState({});
  const [assistOpen, setAssistOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/service-request-templates`)
      .then((res) => {
        const data = res.data || [];
        setTemplates(data);
        if (data.length > 0) {
          setServiceKey(data[0].service_key);
        }
      })
      .catch(() => {
        // Default templates if API fails
        setTemplates([
          { service_key: "general", service_name: "General Service Request", fields: [
            { key: "description", label: "Description", type: "textarea", placeholder: "Describe what you need..." },
            { key: "quantity", label: "Quantity", type: "number", placeholder: "Enter quantity" },
          ]},
          { service_key: "printing", service_name: "Printing Services", fields: [
            { key: "print_type", label: "Print Type", type: "text", placeholder: "e.g., Screen print, DTG, Embroidery" },
            { key: "quantity", label: "Quantity", type: "number", placeholder: "Number of items" },
            { key: "description", label: "Description", type: "textarea", placeholder: "Describe your printing needs..." },
          ]},
          { service_key: "branding", service_name: "Branding Services", fields: [
            { key: "brand_name", label: "Brand/Company Name", type: "text", placeholder: "Your brand name" },
            { key: "description", label: "Description", type: "textarea", placeholder: "Describe your branding requirements..." },
          ]},
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const template = templates.find((x) => x.service_key === serviceKey) || templates[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/service-requests`, {
        service_key: serviceKey,
        service_name: template?.service_name,
        form_data: form,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit service request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({});
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="rounded-[2rem] border bg-white p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-[2rem] border bg-white p-8 space-y-6" data-testid="guided-service-panel">
        {!submitted ? (
          <>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-[#20364D]" />
                </div>
                <div className="text-2xl font-bold text-[#20364D]">Request a Service</div>
              </div>
              <div className="text-slate-600">Pick a service, fill the guided form, or let sales prepare the quote for you.</div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setAssistOpen(false)} 
                className="rounded-xl border px-4 py-4 font-semibold text-[#20364D] hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Fill Request Form
              </button>
              <button 
                type="button"
                onClick={() => setAssistOpen(true)} 
                className="rounded-xl bg-[#F4E7BF] text-[#8B6A10] px-4 py-4 font-semibold hover:bg-[#ede0b0] transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Let Sales Assist
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <div className="text-sm text-slate-500 mb-2">Choose Service</div>
                <select 
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
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
                        className="w-full min-h-[120px] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                        placeholder={field.placeholder} 
                        value={form[field.key] || ""} 
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} 
                      />
                    ) : (
                      <input 
                        type={field.type === "number" ? "number" : "text"} 
                        className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                        placeholder={field.placeholder} 
                        value={form[field.key] || ""} 
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} 
                      />
                    )}
                  </label>
                ))}
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition flex items-center gap-2 disabled:opacity-50"
                data-testid="submit-service-request"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-[#20364D] mb-2">Request Submitted!</div>
            <div className="text-slate-600 mb-6">Our team will review your service request and get back to you shortly.</div>
            <button 
              onClick={resetForm}
              className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition"
            >
              Submit Another Request
            </button>
          </div>
        )}
      </div>

      <SalesAssistModalV2 
        open={assistOpen} 
        onClose={() => setAssistOpen(false)} 
        contextType="service" 
        serviceContext={{ name: template?.service_name || "General Service Request" }} 
      />
    </>
  );
}
