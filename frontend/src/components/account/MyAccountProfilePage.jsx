import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import useCustomerProfile from "../../hooks/useCustomerProfile";
import PhoneNumberField from "../forms/PhoneNumberField";
import { splitPhone, combinePhone } from "../../utils/phoneUtils";

export default function MyAccountProfilePage() {
  const { user } = useAuth();
  const customerId = user?.id || "guest";
  const { data, loading, save } = useCustomerProfile(customerId);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data) {
      const p = splitPhone(data.phone);
      const dp = splitPhone(data.delivery_phone);
      const ip = splitPhone(data.invoice_client_phone);
      setForm({
        ...data,
        phone_prefix: p.prefix,
        phone: p.number,
        delivery_phone_prefix: dp.prefix,
        delivery_phone: dp.number,
        invoice_client_phone_prefix: ip.prefix,
        invoice_client_phone: ip.number,
      });
    }
  }, [data]);

  if (loading || !form) return <div className="text-slate-500">Loading account...</div>;

  const submit = async () => {
    const { phone_prefix, delivery_phone_prefix, invoice_client_phone_prefix, ...rest } = form;
    const payload = {
      ...rest,
      phone: combinePhone(phone_prefix, form.phone),
      delivery_phone: combinePhone(delivery_phone_prefix, form.delivery_phone),
      invoice_client_phone: combinePhone(invoice_client_phone_prefix, form.invoice_client_phone),
      customer_id: customerId,
    };
    await save(payload);
    alert("Account details saved.");
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">My Account</div>
        <div className="text-slate-600 mt-2">Save details once so checkout and service requests can prefill correctly.</div>
      </div>

      <div className="rounded-[2rem] border bg-white p-8 space-y-6">
        <div>
          <div className="text-lg font-bold text-[#20364D]">Account Type</div>
          <select className="border rounded-xl px-4 py-3 mt-3" value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <input className="border rounded-xl px-4 py-3" placeholder="Contact Name" value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          <PhoneNumberField
            label=""
            prefix={form.phone_prefix}
            number={form.phone}
            onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
            onNumberChange={(v) => setForm({ ...form, phone: v })}
            testIdPrefix="profile-phone"
          />
          <input className="border rounded-xl px-4 py-3 md:col-span-2" placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        {form.account_type === "business" ? (
          <div className="grid md:grid-cols-2 gap-4">
            <input className="border rounded-xl px-4 py-3" placeholder="Business Name" value={form.business_name || ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="TIN" value={form.tin || ""} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="VAT Number" value={form.vat_number || ""} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
          </div>
        ) : null}

        <div className="rounded-2xl border p-5">
          <div className="text-lg font-bold text-[#20364D]">Default Delivery Details</div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <input className="border rounded-xl px-4 py-3" placeholder="Recipient Name" value={form.delivery_recipient_name || ""} onChange={(e) => setForm({ ...form, delivery_recipient_name: e.target.value })} />
            <PhoneNumberField
              label=""
              prefix={form.delivery_phone_prefix}
              number={form.delivery_phone}
              onPrefixChange={(v) => setForm({ ...form, delivery_phone_prefix: v })}
              onNumberChange={(v) => setForm({ ...form, delivery_phone: v })}
              testIdPrefix="delivery-phone"
            />
            <input className="border rounded-xl px-4 py-3 md:col-span-2" placeholder="Address Line" value={form.delivery_address_line || ""} onChange={(e) => setForm({ ...form, delivery_address_line: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="City" value={form.delivery_city || ""} onChange={(e) => setForm({ ...form, delivery_city: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="Region" value={form.delivery_region || ""} onChange={(e) => setForm({ ...form, delivery_region: e.target.value })} />
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-lg font-bold text-[#20364D]">Default Invoice Details</div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client Name" value={form.invoice_client_name || ""} onChange={(e) => setForm({ ...form, invoice_client_name: e.target.value })} />
            <PhoneNumberField
              label=""
              prefix={form.invoice_client_phone_prefix}
              number={form.invoice_client_phone}
              onPrefixChange={(v) => setForm({ ...form, invoice_client_phone_prefix: v })}
              onNumberChange={(v) => setForm({ ...form, invoice_client_phone: v })}
              testIdPrefix="invoice-phone"
            />
            <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client Email" value={form.invoice_client_email || ""} onChange={(e) => setForm({ ...form, invoice_client_email: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client TIN" value={form.invoice_client_tin || ""} onChange={(e) => setForm({ ...form, invoice_client_tin: e.target.value })} />
          </div>
        </div>

        <button onClick={submit} data-testid="save-account-btn" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">Save My Account</button>
      </div>
    </div>
  );
}
