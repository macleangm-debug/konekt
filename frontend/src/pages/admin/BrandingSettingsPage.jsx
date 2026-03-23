import React, { useEffect, useState } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function BrandingSettingsPage() {
  const [form, setForm] = useState({
    company_name: "Konekt",
    logo_url: "/branding/konekt-logo-full.png",
    icon_url: "/branding/konekt-icon.png",
    company_email: "",
    company_phone: "",
    company_address: "",
    company_tin: "",
    company_vat_number: "",
    quote_footer_note: "",
    invoice_footer_note: "",
    order_footer_note: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API_URL}/api/admin/branding-settings`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => setForm((prev) => ({ ...prev, ...(res.data || {}) })))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/api/admin/branding-settings`, form, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert("Branding settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="branding-settings-page">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-[#20364D]" />
          </div>
          <div>
            <div className="text-4xl font-bold text-[#20364D]">Branding Settings</div>
            <div className="text-slate-600 mt-2">Set logo, icon, and company details used across Konekt and all PDFs.</div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border bg-white p-8 space-y-6">
        <div className="text-lg font-bold text-[#20364D]">Company Information</div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-500 mb-2 block">Company Name</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Company Name" 
              value={form.company_name} 
              onChange={(e) => setForm({ ...form, company_name: e.target.value })} 
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-2 block">Logo URL</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Logo URL" 
              value={form.logo_url} 
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })} 
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-2 block">Icon URL</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Icon URL" 
              value={form.icon_url} 
              onChange={(e) => setForm({ ...form, icon_url: e.target.value })} 
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-2 block">Company Email</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Company Email" 
              value={form.company_email} 
              onChange={(e) => setForm({ ...form, company_email: e.target.value })} 
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-2 block">Company Phone</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Company Phone" 
              value={form.company_phone} 
              onChange={(e) => setForm({ ...form, company_phone: e.target.value })} 
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-2 block">Company Address</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Company Address" 
              value={form.company_address} 
              onChange={(e) => setForm({ ...form, company_address: e.target.value })} 
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-2 block">TIN</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Tax Identification Number" 
              value={form.company_tin} 
              onChange={(e) => setForm({ ...form, company_tin: e.target.value })} 
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-2 block">VAT Number</label>
            <input 
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="VAT Registration Number" 
              value={form.company_vat_number} 
              onChange={(e) => setForm({ ...form, company_vat_number: e.target.value })} 
            />
          </div>
        </div>

        <div className="text-lg font-bold text-[#20364D] pt-4">PDF Footer Notes</div>
        
        <div>
          <label className="text-sm text-slate-500 mb-2 block">Quote Footer Note</label>
          <textarea 
            className="w-full min-h-[90px] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
            placeholder="Appears at the bottom of quotes" 
            value={form.quote_footer_note} 
            onChange={(e) => setForm({ ...form, quote_footer_note: e.target.value })} 
          />
        </div>
        
        <div>
          <label className="text-sm text-slate-500 mb-2 block">Invoice Footer Note</label>
          <textarea 
            className="w-full min-h-[90px] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
            placeholder="Appears at the bottom of invoices" 
            value={form.invoice_footer_note} 
            onChange={(e) => setForm({ ...form, invoice_footer_note: e.target.value })} 
          />
        </div>
        
        <div>
          <label className="text-sm text-slate-500 mb-2 block">Order Footer Note</label>
          <textarea 
            className="w-full min-h-[90px] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
            placeholder="Appears at the bottom of order summaries" 
            value={form.order_footer_note} 
            onChange={(e) => setForm({ ...form, order_footer_note: e.target.value })} 
          />
        </div>
        
        <button 
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Branding Settings"}
        </button>
      </div>
    </div>
  );
}
