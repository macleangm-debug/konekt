import React, { useEffect, useState } from "react";
import { Loader2, Save, Plus, Settings, CreditCard } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function PaymentSettingsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    country_code: "TZ",
    currency: "TZS",
    bank_transfer_enabled: true,
    kwikpay_enabled: false,
    mobile_money_enabled: false,
    bank_name: "",
    account_name: "",
    account_number: "",
    branch: "",
    swift_code: "",
    payment_instructions: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/api/admin/payment-settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setRows(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/api/admin/payment-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      
      if (res.ok) {
        toast.success("Payment settings saved successfully");
        await load();
        // Reset form for next entry
        setForm({
          ...form,
          bank_name: "",
          account_name: "",
          account_number: "",
          branch: "",
          swift_code: "",
          payment_instructions: "",
        });
      } else {
        toast.error("Failed to save payment settings");
      }
    } catch (err) {
      toast.error("Error saving payment settings");
    } finally {
      setSaving(false);
    }
  };

  const selectCountrySettings = (row) => {
    setForm({
      country_code: row.country_code,
      currency: row.currency,
      bank_transfer_enabled: row.bank_transfer_enabled ?? true,
      kwikpay_enabled: row.kwikpay_enabled ?? false,
      mobile_money_enabled: row.mobile_money_enabled ?? false,
      bank_name: row.bank_name || "",
      account_name: row.account_name || "",
      account_number: row.account_number || "",
      branch: row.branch || "",
      swift_code: row.swift_code || "",
      payment_instructions: row.payment_instructions || "",
    });
  };

  return (
    <div className="space-y-8 p-6" data-testid="payment-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#20364D] flex items-center gap-3">
            <CreditCard className="w-8 h-8" />
            Payment Settings
          </h1>
          <p className="text-slate-500 mt-2">
            Control country-level payment options, bank instructions, and gateway readiness.
          </p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr] gap-6">
        {/* Form Section */}
        <div className="rounded-3xl border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D] flex items-center gap-2">
            <Settings className="w-6 h-6" />
            {form.country_code ? `Edit ${form.country_code}` : "Add Country Payment Settings"}
          </div>

          <div className="grid gap-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Country Code</label>
                <select 
                  className="w-full border rounded-xl px-4 py-3" 
                  value={form.country_code} 
                  onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                  data-testid="input-country-code"
                >
                  <option value="TZ">TZ - Tanzania</option>
                  <option value="KE">KE - Kenya</option>
                  <option value="UG">UG - Uganda</option>
                  <option value="RW">RW - Rwanda</option>
                  <option value="NG">NG - Nigeria</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                <select 
                  className="w-full border rounded-xl px-4 py-3" 
                  value={form.currency} 
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  data-testid="input-currency"
                >
                  <option value="TZS">TZS</option>
                  <option value="KES">KES</option>
                  <option value="UGX">UGX</option>
                  <option value="RWF">RWF</option>
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
              <input 
                className="w-full border rounded-xl px-4 py-3" 
                placeholder="e.g. CRDB Bank" 
                value={form.bank_name} 
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                data-testid="input-bank-name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Account Name</label>
              <input 
                className="w-full border rounded-xl px-4 py-3" 
                placeholder="e.g. Konekt Ltd" 
                value={form.account_name} 
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                data-testid="input-account-name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
              <input 
                className="w-full border rounded-xl px-4 py-3" 
                placeholder="Account Number" 
                value={form.account_number} 
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                data-testid="input-account-number"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Branch</label>
                <input 
                  className="w-full border rounded-xl px-4 py-3" 
                  placeholder="Branch Name" 
                  value={form.branch} 
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  data-testid="input-branch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SWIFT Code</label>
                <input 
                  className="w-full border rounded-xl px-4 py-3" 
                  placeholder="SWIFT/BIC Code" 
                  value={form.swift_code} 
                  onChange={(e) => setForm({ ...form, swift_code: e.target.value })}
                  data-testid="input-swift"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Instructions</label>
              <textarea 
                className="w-full border rounded-xl px-4 py-3 min-h-[110px]" 
                placeholder="Instructions shown to customers during checkout..." 
                value={form.payment_instructions} 
                onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
                data-testid="input-instructions"
              />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="text-sm font-medium text-slate-700">Payment Methods</div>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.bank_transfer_enabled} 
                  onChange={(e) => setForm({ ...form, bank_transfer_enabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                  data-testid="checkbox-bank-transfer"
                />
                <span>Enable Bank Transfer</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.kwikpay_enabled} 
                  onChange={(e) => setForm({ ...form, kwikpay_enabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                  data-testid="checkbox-kwikpay"
                />
                <span>Enable KwikPay</span>
                {!form.kwikpay_enabled && (
                  <span className="text-xs text-amber-600">(Requires API credentials)</span>
                )}
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.mobile_money_enabled} 
                  onChange={(e) => setForm({ ...form, mobile_money_enabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                  data-testid="checkbox-mobile-money"
                />
                <span>Enable Mobile Money</span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <button 
              onClick={save} 
              disabled={saving}
              className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold flex items-center gap-2 disabled:opacity-50"
              data-testid="save-btn"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Settings
            </button>
          </div>
        </div>

        {/* Configured Countries */}
        <div className="rounded-3xl border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D]">Configured Countries</div>
          <p className="text-slate-500 mt-1 text-sm">Click to edit existing settings</p>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              {rows.length > 0 ? (
                rows.map((row) => (
                  <button
                    key={row.id || row.country_code}
                    onClick={() => selectCountrySettings(row)}
                    className="w-full text-left rounded-2xl border bg-slate-50 p-4 hover:bg-slate-100 transition-colors"
                    data-testid={`country-${row.country_code}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-[#20364D]">
                          {row.country_code} • {row.currency}
                        </div>
                        <div className="text-sm text-slate-500 mt-1 space-x-2">
                          <span className={row.bank_transfer_enabled ? "text-emerald-600" : "text-slate-400"}>
                            Bank: {row.bank_transfer_enabled ? "On" : "Off"}
                          </span>
                          <span>•</span>
                          <span className={row.kwikpay_enabled ? "text-emerald-600" : "text-slate-400"}>
                            KwikPay: {row.kwikpay_enabled ? "On" : "Off"}
                          </span>
                          <span>•</span>
                          <span className={row.mobile_money_enabled ? "text-emerald-600" : "text-slate-400"}>
                            Mobile: {row.mobile_money_enabled ? "On" : "Off"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {row.bank_name && (
                      <div className="text-sm mt-3 text-slate-600">
                        {row.bank_name} — {row.account_name}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border bg-slate-50 p-6 text-slate-600 text-center">
                  <Plus className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  No payment settings configured yet.
                  <br />
                  <span className="text-sm">Use the form to add your first country.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
