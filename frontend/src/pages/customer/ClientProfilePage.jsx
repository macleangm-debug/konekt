import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

export default function ClientProfilePage() {
  const [form, setForm] = useState({
    company_name: "",
    buying_as: "company",
    order_frequency: "",
    main_interest: "both",
    monthly_budget_range: "",
    categories_of_interest_csv: "",
    preferred_contact_method: "phone",
    urgent_need: "",
    multi_location: false,
    needs_contract_pricing: false,
    needs_recurring_support: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
        const res = await api.get("/api/client-profiles/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.data) return;

        setForm({
          ...res.data,
          categories_of_interest_csv: (res.data.categories_of_interest || []).join(", "),
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
      await api.post("/api/client-profiles/me", {
        ...form,
        categories_of_interest: (form.categories_of_interest_csv || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="client-profile-page">
      <PageHeader
        title="Business Profile"
        subtitle="Help Konekt understand your commercial needs so sales can support you properly."
      />

      <SurfaceCard>
        <div className="grid gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none" 
              placeholder="Your company name" 
              value={form.company_name || ""} 
              onChange={(e) => setForm({ ...form, company_name: e.target.value })} 
              data-testid="company-name-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Buying As</label>
            <select 
              className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none" 
              value={form.buying_as || "company"} 
              onChange={(e) => setForm({ ...form, buying_as: e.target.value })}
              data-testid="buying-as-select"
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
              <option value="institution">Institution</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Order Frequency</label>
            <select 
              className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none" 
              value={form.order_frequency || ""} 
              onChange={(e) => setForm({ ...form, order_frequency: e.target.value })}
            >
              <option value="">Select frequency</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="as_needed">As Needed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Main Interest</label>
            <select 
              className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none" 
              value={form.main_interest || "both"} 
              onChange={(e) => setForm({ ...form, main_interest: e.target.value })}
            >
              <option value="products">Products</option>
              <option value="services">Services</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Budget Range</label>
            <select 
              className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none" 
              value={form.monthly_budget_range || ""} 
              onChange={(e) => setForm({ ...form, monthly_budget_range: e.target.value })}
            >
              <option value="">Select budget range</option>
              <option value="under_500k">Under TZS 500,000</option>
              <option value="500k_2m">TZS 500,000 - 2,000,000</option>
              <option value="2m_5m">TZS 2,000,000 - 5,000,000</option>
              <option value="5m_10m">TZS 5,000,000 - 10,000,000</option>
              <option value="above_10m">Above TZS 10,000,000</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categories of Interest</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none" 
              placeholder="e.g., Promotional, Office Supplies, Printing" 
              value={form.categories_of_interest_csv || ""} 
              onChange={(e) => setForm({ ...form, categories_of_interest_csv: e.target.value })} 
            />
            <p className="text-xs text-slate-500 mt-1">Separate with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Contact Method</label>
            <select 
              className="w-full border rounded-xl px-4 py-3 focus:border-[#20364D] outline-none" 
              value={form.preferred_contact_method || "phone"} 
              onChange={(e) => setForm({ ...form, preferred_contact_method: e.target.value })}
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Urgent Need</label>
            <textarea 
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] focus:border-[#20364D] outline-none resize-none" 
              placeholder="Describe any urgent requirements..." 
              value={form.urgent_need || ""} 
              onChange={(e) => setForm({ ...form, urgent_need: e.target.value })} 
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:bg-slate-50 transition">
              <input 
                type="checkbox" 
                checked={!!form.multi_location} 
                onChange={(e) => setForm({ ...form, multi_location: e.target.checked })} 
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">Multi-location buying</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:bg-slate-50 transition">
              <input 
                type="checkbox" 
                checked={!!form.needs_contract_pricing} 
                onChange={(e) => setForm({ ...form, needs_contract_pricing: e.target.checked })} 
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">Needs contract pricing</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:bg-slate-50 transition">
              <input 
                type="checkbox" 
                checked={!!form.needs_recurring_support} 
                onChange={(e) => setForm({ ...form, needs_recurring_support: e.target.checked })} 
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">Needs recurring support</span>
            </label>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button 
            onClick={save} 
            disabled={saving}
            className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition disabled:opacity-50"
            data-testid="save-profile-btn"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {saved && (
            <span className="text-emerald-600 font-medium">Profile saved successfully!</span>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
