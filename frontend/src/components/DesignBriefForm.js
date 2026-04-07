import React, { useMemo, useState } from "react";
import { CheckCircle2, Upload, Sparkles, Loader2 } from "lucide-react";
import PhoneNumberField from "./forms/PhoneNumberField";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DesignBriefForm({ service, selectedPackage }) {
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone_prefix: "+255",
    phone: "",
    industry: "",
    project_goal: "",
    target_audience: "",
    preferred_style: "",
    preferred_colors: "",
    content_text: "",
    notes: "",
  });

  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [aiBriefLoading, setAiBriefLoading] = useState(false);

  const isValid = useMemo(() => {
    return (
      form.business_name &&
      form.contact_name &&
      form.email &&
      form.project_goal &&
      form.target_audience
    );
  }, [form]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFiles = (event) => {
    setFiles(Array.from(event.target.files || []));
  };

  const generateAIBrief = async () => {
    if (!form.business_name || !form.project_goal) {
      setError("Please fill in business name and project goal first");
      return;
    }
    
    try {
      setAiBriefLoading(true);
      setError(null);
      
      const res = await fetch(`${API_URL}/api/ai/generate-design-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: service?.name || "design",
          business_name: form.business_name,
          industry: form.industry || "general",
          goal: form.project_goal,
          target_audience: form.target_audience || "business clients",
          tone: form.preferred_style || "modern corporate",
        }),
      });

      const data = await res.json();
      
      const briefText = [
        `📋 Project Summary:`,
        data.project_summary,
        "",
        `📑 Suggested Sections: ${(data.suggested_sections || []).join(", ")}`,
        "",
        `🎨 Visual Direction: ${(data.visual_direction || []).join(", ")}`,
        "",
        `📎 Required Assets: ${(data.required_assets || []).join(", ")}`,
      ].join("\n");
      
      updateField("notes", briefText);
    } catch (err) {
      console.error("Failed to generate AI brief", err);
      setError("Failed to generate AI brief. Please try again.");
    } finally {
      setAiBriefLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      setSubmitting(true);
      setSuccess(null);
      setError(null);

      const payload = {
        service_id: service?.id,
        service_name: service?.name,
        package_name: selectedPackage?.name || "Standard",
        package_price: selectedPackage?.price || service?.base_price || 0,
        delivery_days: selectedPackage?.delivery_days || 5,
        customer: {
          business_name: form.business_name,
          contact_name: form.contact_name,
          email: form.email,
          phone: form.phone,
        },
        brief: {
          industry: form.industry,
          project_goal: form.project_goal,
          target_audience: form.target_audience,
          preferred_style: form.preferred_style,
          preferred_colors: form.preferred_colors
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          content_text: form.content_text,
          notes: form.notes,
        },
        uploaded_files: files.map((file) => ({
          filename: file.name,
          size: file.size,
          type: file.type,
        })),
      };

      const res = await fetch(`${API_URL}/api/service-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to submit order");
      }

      const data = await res.json();
      setSuccess(data);
    } catch (err) {
      console.error("Failed to submit service order", err);
      setError("Failed to submit your project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl border bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="mt-4 text-2xl font-bold">Project Submitted Successfully!</h3>
          <p className="mt-3 text-slate-600">
            Your design service request has been received. Our team will review your brief and get back to you within 24 hours.
          </p>
        </div>
        
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 border p-4">
            <div className="text-sm text-slate-500">Order ID</div>
            <div className="font-semibold text-lg">{success.order_id}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 border p-4">
            <div className="text-sm text-slate-500">Status</div>
            <div className="font-semibold text-lg capitalize">{success.status}</div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <h4 className="font-semibold text-blue-900">What happens next?</h4>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>1. Our team reviews your brief (within 24 hours)</li>
            <li>2. We start working on your design</li>
            <li>3. You receive draft concepts for review</li>
            <li>4. Request revisions if needed</li>
            <li>5. Receive final files</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-4">
          <a
            href="/dashboard"
            className="flex-1 text-center rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold"
          >
            Go to Dashboard
          </a>
          <a
            href="/creative-services"
            className="flex-1 text-center rounded-xl border px-6 py-3 font-semibold"
          >
            Browse More Services
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-8 shadow-lg space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* Customer Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
            <input
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
              placeholder="Your company name"
              value={form.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              data-testid="brief-business-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
            <input
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
              placeholder="Your name"
              value={form.contact_name}
              onChange={(e) => updateField("contact_name", e.target.value)}
              data-testid="brief-contact-name"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
            <input
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
              placeholder="email@company.com"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              data-testid="brief-email"
            />
          </div>
          <div>
            <PhoneNumberField
              label="Phone Number"
              prefix={form.phone_prefix}
              number={form.phone}
              onPrefixChange={(v) => updateField("phone_prefix", v)}
              onNumberChange={(v) => updateField("phone", v)}
              testIdPrefix="brief-phone"
            />
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Project Details</h3>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
            <input
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
              placeholder="e.g. Technology, Finance, Healthcare"
              value={form.industry}
              onChange={(e) => updateField("industry", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Style</label>
            <input
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
              placeholder="e.g. Modern, Minimalist, Luxury, Corporate"
              value={form.preferred_style}
              onChange={(e) => updateField("preferred_style", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700 mb-1">Project Goal *</label>
          <textarea
            className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[110px] focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
            placeholder="What do you want this design to achieve? (e.g. Rebrand our company, create marketing materials for a product launch...)"
            value={form.project_goal}
            onChange={(e) => updateField("project_goal", e.target.value)}
            data-testid="brief-project-goal"
          />
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience *</label>
          <textarea
            className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[110px] focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
            placeholder="Who will see this design? (e.g. B2B clients, young professionals, retail customers...)"
            value={form.target_audience}
            onChange={(e) => updateField("target_audience", e.target.value)}
            data-testid="brief-target-audience"
          />
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Colors</label>
          <input
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
            placeholder="e.g. Navy blue, Gold, White (comma separated)"
            value={form.preferred_colors}
            onChange={(e) => updateField("preferred_colors", e.target.value)}
          />
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700 mb-1">Content / Text to Include</label>
          <textarea
            className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[140px] focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
            placeholder="Any specific text, taglines, or content that should appear in the design..."
            value={form.content_text}
            onChange={(e) => updateField("content_text", e.target.value)}
          />
        </div>
      </div>

      {/* AI Brief Generator */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <label className="text-lg font-semibold">Project Notes & Design Direction</label>
          <button
            type="button"
            onClick={generateAIBrief}
            disabled={aiBriefLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D4A843] text-[#D4A843] px-4 py-2 text-sm font-medium hover:bg-[#D4A843]/10 transition-all disabled:opacity-50"
          >
            {aiBriefLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate AI Brief
              </>
            )}
          </button>
        </div>

        <textarea
          className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[180px] focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all"
          placeholder="Extra notes, design references, links, or special instructions. Click 'Generate AI Brief' to auto-fill based on your inputs above."
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="text-lg font-semibold block mb-3">Upload Reference Files</label>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#D4A843] transition-all">
          <Upload className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="mt-2 text-slate-600">Drop files here or click to browse</p>
          <p className="text-sm text-slate-500">Logos, images, references (PNG, JPG, PDF, SVG)</p>
          <input
            type="file"
            multiple
            onChange={handleFiles}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ position: 'relative' }}
          />
        </div>
        {files.length > 0 && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl">
            <p className="text-sm font-medium text-slate-700">
              {files.length} file(s) selected:
            </p>
            <ul className="mt-1 space-y-1">
              {files.map((file, i) => (
                <li key={i} className="text-sm text-slate-600">• {file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Selected Package Summary */}
      <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-5">
        <h3 className="font-semibold text-lg">Selected Package</h3>
        <div className="mt-3 grid md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Service</div>
            <div className="font-medium">{service?.name || "Design Service"}</div>
          </div>
          <div>
            <div className="text-slate-500">Package</div>
            <div className="font-medium">{selectedPackage?.name || "Standard"}</div>
          </div>
          <div>
            <div className="text-slate-500">Price</div>
            <div className="font-medium text-[#D4A843]">
              TZS {(selectedPackage?.price || service?.base_price || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Delivery</div>
            <div className="font-medium">{selectedPackage?.delivery_days || 5} days</div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || submitting}
        data-testid="submit-brief-btn"
        className="w-full rounded-xl bg-[#2D3E50] text-white px-6 py-4 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3d5166] transition-all flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting Project...
          </>
        ) : (
          "Submit Project"
        )}
      </button>
      
      <p className="text-xs text-slate-500 text-center">
        By submitting, you agree to our terms of service. We'll contact you within 24 hours.
      </p>
    </form>
  );
}
