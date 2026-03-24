import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import { ChevronDown, Plus, Trash2, Check } from "lucide-react";

const EMPTY_ADDRESS = {
  label: "Address",
  recipient_name: "",
  phone_prefix: "+255",
  phone: "",
  address_line: "",
  city: "",
  region: "",
  is_default: false,
};

function PhonePrefixSelect({ value, onChange, options, testId }) {
  return (
    <select
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-slate-200 rounded-xl px-3 py-3 bg-white text-[#20364D] font-medium w-[90px] shrink-0"
    >
      {(options || ["+255"]).map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}

export default function MyAccountPageV2() {
  const { user } = useAuth();
  const customerId = user?.id || "guest";
  const [form, setForm] = useState(null);
  const [prefixes, setPrefixes] = useState(["+255"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/customer-account/profile?customer_id=${customerId}`);
        const d = res.data || {};
        setForm(d);
        setPrefixes(d.phone_prefix_options || ["+255"]);
      } catch {
        setForm({});
      }
      setLoading(false);
    })();
  }, [customerId]);

  if (loading || !form) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="h-64 bg-slate-100 rounded-[2rem]" />
      </div>
    );
  }

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const addresses = form.delivery_addresses || [];

  const addAddress = () => {
    if (addresses.length >= 3) return;
    const newAddr = { ...EMPTY_ADDRESS, id: crypto.randomUUID(), label: `Address ${addresses.length + 1}`, is_default: addresses.length === 0 };
    set("delivery_addresses", [...addresses, newAddr]);
  };

  const removeAddress = (idx) => {
    const updated = addresses.filter((_, i) => i !== idx);
    if (updated.length > 0 && !updated.some((a) => a.is_default)) {
      updated[0].is_default = true;
    }
    set("delivery_addresses", updated);
  };

  const updateAddress = (idx, key, val) => {
    const updated = [...addresses];
    updated[idx] = { ...updated[idx], [key]: val };
    set("delivery_addresses", updated);
  };

  const setDefaultAddress = (idx) => {
    const updated = addresses.map((a, i) => ({ ...a, is_default: i === idx }));
    set("delivery_addresses", updated);
    set("default_delivery_address_id", updated[idx]?.id || "");
  };

  const submit = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/api/customer-account/profile", { ...form, customer_id: customerId });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8 max-w-4xl" data-testid="my-account-page">
      <div>
        <h1 className="text-4xl font-bold text-[#20364D]">My Account</h1>
        <p className="text-slate-600 mt-2">Save your details once — checkout and service requests will prefill automatically.</p>
      </div>

      {/* Account Type */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#20364D]">Account Type</h2>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 mt-3">
            <button
              data-testid="account-type-personal"
              onClick={() => set("account_type", "personal")}
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${form.account_type === "personal" ? "bg-[#20364D] text-white shadow-sm" : "text-[#20364D] hover:bg-white"}`}
            >
              Personal
            </button>
            <button
              data-testid="account-type-business"
              onClick={() => set("account_type", "business")}
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${form.account_type === "business" ? "bg-[#20364D] text-white shadow-sm" : "text-[#20364D] hover:bg-white"}`}
            >
              Business
            </button>
          </div>
        </div>

        {/* Contact Details */}
        <div>
          <h3 className="text-base font-semibold text-[#20364D] mb-3">Contact Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input data-testid="contact-name" className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Contact Name" value={form.contact_name || ""} onChange={(e) => set("contact_name", e.target.value)} />
            <div className="flex gap-2">
              <PhonePrefixSelect testId="phone-prefix" value={form.phone_prefix || "+255"} onChange={(v) => set("phone_prefix", v)} options={prefixes} />
              <input data-testid="contact-phone" className="border border-slate-200 rounded-xl px-4 py-3 flex-1 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Phone Number" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <input data-testid="contact-email" className="border border-slate-200 rounded-xl px-4 py-3 md:col-span-2 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Email Address" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>

        {/* Business Fields */}
        {form.account_type === "business" && (
          <div data-testid="business-fields">
            <h3 className="text-base font-semibold text-[#20364D] mb-3">Business Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input data-testid="business-name" className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Business Name" value={form.business_name || ""} onChange={(e) => set("business_name", e.target.value)} />
              <input data-testid="business-tin" className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="TIN" value={form.tin || ""} onChange={(e) => set("tin", e.target.value)} />
              <input data-testid="business-vat" className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="VAT Number" value={form.vat_number || ""} onChange={(e) => set("vat_number", e.target.value)} />
            </div>
          </div>
        )}

        {/* Quote / Invoice Client Details */}
        <div>
          <h3 className="text-base font-semibold text-[#20364D] mb-3">Default Quote & Invoice Details</h3>
          <p className="text-sm text-slate-500 mb-3">Used when requesting quotes or generating invoices.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <input data-testid="quote-client-name" className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Client Name (for invoices)" value={form.quote_client_name || ""} onChange={(e) => set("quote_client_name", e.target.value)} />
            <div className="flex gap-2">
              <PhonePrefixSelect testId="quote-phone-prefix" value={form.quote_client_phone_prefix || "+255"} onChange={(v) => set("quote_client_phone_prefix", v)} options={prefixes} />
              <input data-testid="quote-client-phone" className="border border-slate-200 rounded-xl px-4 py-3 flex-1 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Client Phone" value={form.quote_client_phone || ""} onChange={(e) => set("quote_client_phone", e.target.value)} />
            </div>
            <input data-testid="quote-client-email" className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Client Email" value={form.quote_client_email || ""} onChange={(e) => set("quote_client_email", e.target.value)} />
            <input data-testid="quote-client-tin" className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Client TIN" value={form.quote_client_tin || ""} onChange={(e) => set("quote_client_tin", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Delivery Addresses */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#20364D]">Delivery Addresses</h2>
            <p className="text-sm text-slate-500 mt-1">Save up to 3 delivery addresses. Select one as default for checkout.</p>
          </div>
          {addresses.length < 3 && (
            <button data-testid="add-address-btn" onClick={addAddress} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#20364D] hover:bg-slate-50 transition-colors">
              <Plus size={16} /> Add Address
            </button>
          )}
        </div>

        {addresses.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-base">No delivery addresses saved yet.</p>
            <button onClick={addAddress} className="mt-3 text-[#20364D] font-semibold text-sm hover:underline">Add your first address</button>
          </div>
        )}

        {addresses.map((addr, idx) => (
          <div key={addr.id || idx} data-testid={`address-card-${idx}`} className={`rounded-2xl border p-5 space-y-4 transition-colors ${addr.is_default ? "border-[#20364D] bg-[#20364D]/[0.02]" : "border-slate-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  data-testid={`address-label-${idx}`}
                  className="border-0 border-b border-slate-200 bg-transparent font-semibold text-[#20364D] focus:border-[#20364D] outline-none px-1 py-1"
                  value={addr.label || ""}
                  onChange={(e) => updateAddress(idx, "label", e.target.value)}
                  placeholder="Label (e.g. Office)"
                />
                {addr.is_default && <span className="text-xs bg-[#20364D] text-white px-2 py-0.5 rounded-full font-medium">Default</span>}
              </div>
              <div className="flex items-center gap-2">
                {!addr.is_default && (
                  <button data-testid={`set-default-${idx}`} onClick={() => setDefaultAddress(idx)} className="text-xs text-[#20364D] font-medium hover:underline flex items-center gap-1">
                    <Check size={12} /> Set Default
                  </button>
                )}
                <button data-testid={`remove-address-${idx}`} onClick={() => removeAddress(idx)} className="text-red-500 hover:text-red-700 p-1 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Recipient Name" value={addr.recipient_name || ""} onChange={(e) => updateAddress(idx, "recipient_name", e.target.value)} />
              <div className="flex gap-2">
                <PhonePrefixSelect value={addr.phone_prefix || "+255"} onChange={(v) => updateAddress(idx, "phone_prefix", v)} options={prefixes} />
                <input className="border border-slate-200 rounded-xl px-4 py-3 flex-1 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Phone" value={addr.phone || ""} onChange={(e) => updateAddress(idx, "phone", e.target.value)} />
              </div>
              <input className="border border-slate-200 rounded-xl px-4 py-3 md:col-span-2 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Address Line" value={addr.address_line || ""} onChange={(e) => updateAddress(idx, "address_line", e.target.value)} />
              <input className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="City" value={addr.city || ""} onChange={(e) => updateAddress(idx, "city", e.target.value)} />
              <input className="border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" placeholder="Region" value={addr.region || ""} onChange={(e) => updateAddress(idx, "region", e.target.value)} />
            </div>
          </div>
        ))}
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button data-testid="save-account-btn" onClick={submit} disabled={saving} className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-60">
          {saving ? "Saving..." : "Save My Account"}
        </button>
        {saved && <span className="text-green-600 font-medium flex items-center gap-1"><Check size={16} /> Saved successfully</span>}
      </div>
    </div>
  );
}
