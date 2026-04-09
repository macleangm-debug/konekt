import React, { useEffect, useState } from "react";
import { Settings, Building2, CreditCard, FileText, Save } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import PhoneNumberField from "@/components/forms/PhoneNumberField";

const initialForm = {
  company_name: "",
  logo_url: "",
  email: "",
  phone: "",
  website: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  country: "",
  tax_number: "",
  currency: "TZS",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_branch: "",
  swift_code: "",
  payment_instructions: "",
  invoice_terms: "",
  quote_terms: "",
};

export default function CompanySettingsPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getCompanySettings();
        setForm({ ...initialForm, ...res.data });
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateCompanySettings(form);
      alert("Company settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="company-settings-page">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="w-8 h-8 text-[#D4A843]" />
            Company Settings
          </h1>
          <p className="text-slate-600 mt-2">
            These details appear on quotes, invoices, and exported PDFs.
          </p>
        </div>

        <form onSubmit={save} className="space-y-8">
          {/* Company Information */}
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-[#2D3E50]" />
              Company Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Company name"
                  value={form.company_name}
                  onChange={(e) => update("company_name", e.target.value)}
                  data-testid="company-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="https://..."
                  value={form.logo_url}
                  onChange={(e) => update("logo_url", e.target.value)}
                  data-testid="logo-url-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="contact@company.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <PhoneNumberField
                  label=""
                  prefix={form.phone_prefix || "+255"}
                  number={form.phone}
                  onPrefixChange={(v) => update("phone_prefix", v)}
                  onNumberChange={(v) => update("phone", v)}
                  testIdPrefix="company-phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="www.company.com"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax Number / TIN / VAT</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Tax registration number"
                  value={form.tax_number}
                  onChange={(e) => update("tax_number", e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Street address"
                  value={form.address_line_1}
                  onChange={(e) => update("address_line_1", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Building, Suite, etc."
                  value={form.address_line_2}
                  onChange={(e) => update("address_line_2", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                />
              </div>
            </div>

            {/* Logo Preview */}
            {form.logo_url && (
              <div className="mt-6 rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm font-medium text-slate-700 mb-3">Logo Preview</p>
                <img src={form.logo_url} alt="Logo preview" className="h-16 object-contain" />
              </div>
            )}
          </div>

          {/* Banking Information */}
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <CreditCard className="w-5 h-5 text-[#2D3E50]" />
              Banking Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Bank name"
                  value={form.bank_name}
                  onChange={(e) => update("bank_name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Account holder name"
                  value={form.bank_account_name}
                  onChange={(e) => update("bank_account_name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Account number"
                  value={form.bank_account_number}
                  onChange={(e) => update("bank_account_number", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Branch name"
                  value={form.bank_branch}
                  onChange={(e) => update("bank_branch", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SWIFT Code</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="SWIFT/BIC code"
                  value={form.swift_code}
                  onChange={(e) => update("swift_code", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="TZS"
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Instructions</label>
              <textarea
                className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[100px] focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                placeholder="Instructions for how to make payments..."
                value={form.payment_instructions}
                onChange={(e) => update("payment_instructions", e.target.value)}
              />
            </div>
          </div>

          {/* Document Terms */}
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-[#2D3E50]" />
              Default Terms & Conditions
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Quote Terms</label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[100px] focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Terms that appear on quotes by default..."
                  value={form.quote_terms}
                  onChange={(e) => update("quote_terms", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Invoice Terms</label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[100px] focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
                  placeholder="Terms that appear on invoices by default..."
                  value={form.invoice_terms}
                  onChange={(e) => update("invoice_terms", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all disabled:opacity-50"
              data-testid="save-settings-btn"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
