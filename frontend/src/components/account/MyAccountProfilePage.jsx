import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import useCustomerProfile from "../../hooks/useCustomerProfile";

export default function MyAccountProfilePage() {
  const { user } = useAuth();
  const customerId = user?.id || "guest";
  const { data, loading, save } = useCustomerProfile(customerId);
  const [form, setForm] = useState(null);

  useEffect(() => { if (data) setForm(data); }, [data]);
  if (loading || !form) return <div className="text-slate-500">Loading account...</div>;

  const submit = async () => {
    await save({ ...form, customer_id: customerId });
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
          <input className="border rounded-xl px-4 py-3" placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
            <input className="border rounded-xl px-4 py-3" placeholder="Recipient Phone" value={form.delivery_phone || ""} onChange={(e) => setForm({ ...form, delivery_phone: e.target.value })} />
            <input className="border rounded-xl px-4 py-3 md:col-span-2" placeholder="Address Line" value={form.delivery_address_line || ""} onChange={(e) => setForm({ ...form, delivery_address_line: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="City" value={form.delivery_city || ""} onChange={(e) => setForm({ ...form, delivery_city: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="Region" value={form.delivery_region || ""} onChange={(e) => setForm({ ...form, delivery_region: e.target.value })} />
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-lg font-bold text-[#20364D]">Default Invoice Details</div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client Name" value={form.invoice_client_name || ""} onChange={(e) => setForm({ ...form, invoice_client_name: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client Phone" value={form.invoice_client_phone || ""} onChange={(e) => setForm({ ...form, invoice_client_phone: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client Email" value={form.invoice_client_email || ""} onChange={(e) => setForm({ ...form, invoice_client_email: e.target.value })} />
            <input className="border rounded-xl px-4 py-3" placeholder="Invoice Client TIN" value={form.invoice_client_tin || ""} onChange={(e) => setForm({ ...form, invoice_client_tin: e.target.value })} />
          </div>
        </div>

        <button onClick={submit} data-testid="save-account-btn" className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">Save My Account</button>
      </div>
    </div>
  );
}
