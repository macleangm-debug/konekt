import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PhoneNumberField from "../../components/forms/PhoneNumberField";

export default function BusinessSettingsPage() {
  const [form, setForm] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [settingsRes, readinessRes] = await Promise.all([
        api.get("/api/admin/business-settings"),
        api.get("/api/admin/go-live-readiness"),
      ]);
      setForm(settingsRes.data);
      setReadiness(readinessRes.data);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await api.put("/api/admin/business-settings", form);
      await load();
      alert("Business settings updated");
    } catch (error) {
      console.error(error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="p-10">Loading settings...</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="business-settings-page">
      <div className="text-left">
        <h1 className="text-4xl font-bold">Business Settings</h1>
        <p className="mt-2 text-slate-600">
          Complete these settings before going live.
        </p>
      </div>

      {readiness && (
        <div className="rounded-3xl border bg-white p-6" data-testid="go-live-readiness-card">
          <h2 className="text-2xl font-bold">Go-Live Readiness</h2>
          <div className="mt-2 text-slate-600">
            {readiness.score}/{readiness.total} checks passed
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
            {Object.entries(readiness.checks || {}).map(([key, ok]) => (
              <div key={key} className="rounded-2xl border bg-slate-50 p-4 flex items-center justify-between" data-testid={`check-${key}`}>
                <span className="text-sm">{key.replaceAll("_", " ")}</span>
                <span className={ok ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                  {ok ? "OK" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <h2 className="text-2xl font-bold">Company Identity</h2>

          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Company name" 
            value={form.company_name || ""} 
            onChange={(e) => setForm({ ...form, company_name: e.target.value })} 
            data-testid="input-company-name"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Logo path" 
            value={form.company_logo_path || ""} 
            onChange={(e) => setForm({ ...form, company_logo_path: e.target.value })} 
            data-testid="input-logo-path"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="TIN / Tax number" 
            value={form.tax_number || ""} 
            onChange={(e) => setForm({ ...form, tax_number: e.target.value })} 
            data-testid="input-tax-number"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Business Registration Number" 
            value={form.business_registration_number || ""} 
            onChange={(e) => setForm({ ...form, business_registration_number: e.target.value })} 
            data-testid="input-brn"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Email" 
            value={form.email || ""} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            data-testid="input-email"
          />
          <PhoneNumberField
            label=""
            prefix={form.phone_prefix || "+255"}
            number={form.phone || ""}
            onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
            onNumberChange={(v) => setForm({ ...form, phone: v })}
            testIdPrefix="settings-phone"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Website" 
            value={form.website || ""} 
            onChange={(e) => setForm({ ...form, website: e.target.value })} 
            data-testid="input-website"
          />
        </div>

        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <h2 className="text-2xl font-bold">Address</h2>

          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Address line 1" 
            value={form.address_line_1 || ""} 
            onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} 
            data-testid="input-address-1"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Address line 2" 
            value={form.address_line_2 || ""} 
            onChange={(e) => setForm({ ...form, address_line_2: e.target.value })} 
            data-testid="input-address-2"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="City" 
            value={form.city || ""} 
            onChange={(e) => setForm({ ...form, city: e.target.value })} 
            data-testid="input-city"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Country" 
            value={form.country || ""} 
            onChange={(e) => setForm({ ...form, country: e.target.value })} 
            data-testid="input-country"
          />
        </div>

        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <h2 className="text-2xl font-bold">Commercial</h2>

          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Currency" 
            value={form.currency || ""} 
            onChange={(e) => setForm({ ...form, currency: e.target.value })} 
            data-testid="input-currency"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Tax name" 
            value={form.tax_name || ""} 
            onChange={(e) => setForm({ ...form, tax_name: e.target.value })} 
            data-testid="input-tax-name"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Default tax rate" 
            type="number"
            value={form.default_tax_rate || ""} 
            onChange={(e) => setForm({ ...form, default_tax_rate: parseFloat(e.target.value) || 0 })} 
            data-testid="input-tax-rate"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Default payment terms" 
            value={form.default_payment_terms || ""} 
            onChange={(e) => setForm({ ...form, default_payment_terms: e.target.value })} 
            data-testid="input-payment-terms"
          />
          <textarea 
            className="w-full border rounded-xl px-4 py-3 min-h-[100px]" 
            placeholder="Default document note" 
            value={form.default_document_note || ""} 
            onChange={(e) => setForm({ ...form, default_document_note: e.target.value })} 
            data-testid="input-document-note"
          />
          <textarea 
            className="w-full border rounded-xl px-4 py-3 min-h-[100px]" 
            placeholder="Payment instructions" 
            value={form.payment_instructions || ""} 
            onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })} 
            data-testid="input-payment-instructions"
          />
        </div>

        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <h2 className="text-2xl font-bold">Banking & Inventory</h2>

          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Bank name" 
            value={form.bank_name || ""} 
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })} 
            data-testid="input-bank-name"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Bank account name" 
            value={form.bank_account_name || ""} 
            onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} 
            data-testid="input-bank-account-name"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Bank account number" 
            value={form.bank_account_number || ""} 
            onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} 
            data-testid="input-bank-account-number"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Branch" 
            value={form.bank_branch || ""} 
            onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} 
            data-testid="input-bank-branch"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="SWIFT Code" 
            value={form.bank_swift_code || ""} 
            onChange={(e) => setForm({ ...form, bank_swift_code: e.target.value })} 
            data-testid="input-swift-code"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="SKU prefix" 
            value={form.sku_prefix || ""} 
            onChange={(e) => setForm({ ...form, sku_prefix: e.target.value })} 
            data-testid="input-sku-prefix"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="SKU separator" 
            value={form.sku_separator || ""} 
            onChange={(e) => setForm({ ...form, sku_separator: e.target.value })} 
            data-testid="input-sku-separator"
          />
          <input 
            className="w-full border rounded-xl px-4 py-3" 
            placeholder="Low stock threshold" 
            type="number"
            value={form.low_stock_threshold || ""} 
            onChange={(e) => setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 0 })} 
            data-testid="input-low-stock"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold"
        data-testid="save-settings-btn"
      >
        {saving ? "Saving..." : "Save Business Settings"}
      </button>
    </div>
  );
}
