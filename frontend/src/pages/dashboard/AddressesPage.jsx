import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Edit2, Trash2, Check } from "lucide-react";
import api from "../../lib/api";
import { COUNTRIES } from "../../constants/countries";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import PhoneNumberField from "../../components/forms/PhoneNumberField";

const initialForm = {
  label: "",
  full_name: "",
  company_name: "",
  country: "TZ",
  city: "",
  address_line_1: "",
  address_line_2: "",
  postal_code: "",
  phone_prefix: "+255",
  phone_number: "",
  is_default: true,
  type: "shipping",
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === form.country),
    [form.country]
  );

  const load = async () => {
    try {
      const res = await api.get("/api/customer/addresses");
      setAddresses(res.data || []);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      setForm((prev) => ({
        ...prev,
        phone_prefix: selectedCountry.dialCode,
      }));
    }
  }, [selectedCountry]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.address_line_1 || !form.city) {
      toast.error("Please fill in address and city");
      return;
    }

    try {
      setSaving(true);
      await api.post("/api/customer/addresses", form);
      toast.success("Address saved successfully");
      setForm(initialForm);
      load();
    } catch (error) {
      console.error("Failed to save address:", error);
      toast.error(error.response?.data?.detail || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      await api.delete(`/api/customer/addresses/${addressId}`);
      toast.success("Address deleted");
      load();
    } catch (error) {
      console.error("Failed to delete address:", error);
      toast.error("Failed to delete address");
    }
  };

  const setDefault = async (addressId) => {
    try {
      await api.put(`/api/customer/addresses/${addressId}/default`);
      toast.success("Default address updated");
      load();
    } catch (error) {
      console.error("Failed to set default:", error);
      toast.error("Failed to update default address");
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-72 bg-slate-200 rounded"></div>
        </div>
        <div className="grid xl:grid-cols-[420px_1fr] gap-8">
          <div className="h-96 bg-slate-200 rounded-3xl animate-pulse"></div>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8" data-testid="addresses-page">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-4xl font-bold text-[#2D3E50]">Delivery Addresses</h1>
        <p className="text-slate-600 mt-2">
          Save your preferred contact and delivery information for faster checkout and service requests.
        </p>
      </div>

      <div className="grid xl:grid-cols-[420px_1fr] gap-8">
        {/* Add Address Form */}
        <form onSubmit={save} className="rounded-3xl border bg-white p-6 space-y-4 h-fit">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Add Address</h2>

          <input
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder="Label (e.g., Office, Home)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            data-testid="address-label"
          />

          <input
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            data-testid="address-fullname"
          />

          <input
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder="Company name"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            data-testid="address-company"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <select
              className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              data-testid="address-country"
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>

            <input
              className="border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              placeholder="City *"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              data-testid="address-city"
            />
          </div>

          <input
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder="Address line 1 *"
            value={form.address_line_1}
            onChange={(e) => setForm({ ...form, address_line_1: e.target.value })}
            data-testid="address-line1"
          />

          <input
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder="Address line 2"
            value={form.address_line_2}
            onChange={(e) => setForm({ ...form, address_line_2: e.target.value })}
            data-testid="address-line2"
          />

          <input
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            placeholder="Postal code"
            value={form.postal_code}
            onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            data-testid="address-postal"
          />

          <PhoneNumberField
            label=""
            prefix={form.phone_prefix}
            number={form.phone_number}
            onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
            onNumberChange={(v) => setForm({ ...form, phone_number: v })}
            testIdPrefix="address-phone"
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-[#D4A843] focus:ring-[#D4A843]"
              data-testid="address-default"
            />
            <span className="text-sm text-slate-600">Set as default</span>
          </label>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-[#2D3E50] hover:bg-[#253242]"
            data-testid="save-address-btn"
          >
            {saving ? "Saving..." : "Save Address"}
          </Button>
        </form>

        {/* Address List */}
        <div className="space-y-4">
          {!addresses.length ? (
            <EmptyStateCard
              icon={MapPin}
              title="No delivery addresses yet"
              text="Save your address now so products, maintenance requests, and creative deliveries can be completed faster."
              testId="empty-addresses"
            />
          ) : (
            addresses.map((address) => (
              <div
                key={address.id}
                className={`rounded-3xl border bg-white p-5 ${
                  address.is_default ? "border-[#D4A843] ring-1 ring-[#D4A843]" : ""
                }`}
                data-testid={`address-card-${address.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg text-[#2D3E50]">
                      {address.label || address.full_name || "Address"}
                    </span>
                    {address.is_default && (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefault(address.id)}
                        data-testid={`set-default-${address.id}`}
                      >
                        <Check size={16} className="mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAddress(address.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`delete-address-${address.id}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <div className="text-slate-600 mt-3">
                  {address.full_name && <div className="font-medium">{address.full_name}</div>}
                  {address.company_name && <div>{address.company_name}</div>}
                </div>
                <div className="text-slate-600 mt-2">
                  {address.address_line_1}
                  {address.address_line_2 && `, ${address.address_line_2}`}
                </div>
                <div className="text-slate-500 mt-1">
                  {address.city}
                  {address.postal_code && `, ${address.postal_code}`}
                  {address.country && `, ${COUNTRIES.find(c => c.code === address.country)?.name || address.country}`}
                </div>
                {address.phone_number && (
                  <div className="text-slate-500 mt-1">
                    {address.phone_prefix} {address.phone_number}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
