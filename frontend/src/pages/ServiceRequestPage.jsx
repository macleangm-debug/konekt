import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import DynamicServiceForm from "../components/services/DynamicServiceForm";
import { COUNTRIES } from "../constants/countries";
import PhoneNumberField from "../components/forms/PhoneNumberField";

export default function ServiceRequestPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [customerForm, setCustomerForm] = useState({
    customer_name: "",
    company_name: "",
    country: "TZ",
    city: "",
    address_line_1: "",
    address_line_2: "",
    phone_prefix: "+255",
    phone_number: "",
    customer_email: "",
    payment_choice: "quote_first",
    save_address: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === customerForm.country),
    [customerForm.country]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/service-forms/public/slug/${slug}`);
        setService(res.data);
      } catch (error) {
        console.error("Failed to load service:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (selectedCountry) {
      setCustomerForm((prev) => ({
        ...prev,
        phone_prefix: selectedCountry.dialCode,
      }));
    }
  }, [selectedCountry]);

  const total = useMemo(() => {
    const base = Number(service?.base_price || 0);
    const addOnTotal = (service?.add_ons || [])
      .filter((a) => selectedAddOns.includes(a.id))
      .reduce((sum, item) => sum + Number(item.price || 0), 0);
    return base + addOnTotal;
  }, [service, selectedAddOns]);

  const handleAnswerChange = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAddOn = (id) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const res = await api.post("/api/service-requests", {
        service_form_id: service.id,
        selected_add_ons: selectedAddOns,
        service_answers: answers,
        attachments: [],
        ...customerForm,
      });

      if (
        service.requires_payment &&
        customerForm.payment_choice === "pay_now"
      ) {
        navigate("/creative-services/checkout", {
          state: {
            projectDraft: {
              ...res.data,
              customer_name: customerForm.customer_name,
              customer_email: customerForm.customer_email,
            },
          },
        });
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center" data-testid="service-request-loading">
        <div className="w-8 h-8 border-4 border-[#2D3E50] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-10 text-center" data-testid="service-not-found">
        <h2 className="text-2xl font-bold text-slate-700">Service not found</h2>
        <p className="text-slate-500 mt-2">The requested service could not be found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8" data-testid="service-request-page">
      <div className="text-left">
        <h1 className="text-4xl font-bold text-[#2D3E50]" data-testid="service-title">{service.title}</h1>
        <p className="text-slate-600 mt-2">{service.description}</p>
      </div>

      <form onSubmit={submit} className="grid xl:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Service Details</h2>
            <div className="mt-5">
              <DynamicServiceForm
                schema={service.form_schema || []}
                values={answers}
                onChange={handleAnswerChange}
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Your Contact Details</h2>
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D3E50]/20 focus:border-[#2D3E50]" 
                placeholder="Full name" 
                value={customerForm.customer_name} 
                onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })} 
                data-testid="customer-name-input"
              />
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D3E50]/20 focus:border-[#2D3E50]" 
                placeholder="Company name" 
                value={customerForm.company_name} 
                onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })} 
                data-testid="company-name-input"
              />
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D3E50]/20 focus:border-[#2D3E50]" 
                placeholder="Email" 
                type="email"
                value={customerForm.customer_email} 
                onChange={(e) => setCustomerForm({ ...customerForm, customer_email: e.target.value })} 
                data-testid="customer-email-input"
              />
              <select 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D3E50]/20 focus:border-[#2D3E50]" 
                value={customerForm.country} 
                onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                data-testid="country-select"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D3E50]/20 focus:border-[#2D3E50]" 
                placeholder="City" 
                value={customerForm.city} 
                onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })} 
                data-testid="city-input"
              />
              <input 
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2D3E50]/20 focus:border-[#2D3E50]" 
                placeholder="Address line 1" 
                value={customerForm.address_line_1} 
                onChange={(e) => setCustomerForm({ ...customerForm, address_line_1: e.target.value })} 
                data-testid="address1-input"
              />
              <input 
                className="border rounded-xl px-4 py-3 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-[#2D3E50]/20 focus:border-[#2D3E50]" 
                placeholder="Address line 2" 
                value={customerForm.address_line_2} 
                onChange={(e) => setCustomerForm({ ...customerForm, address_line_2: e.target.value })} 
                data-testid="address2-input"
              />
            </div>

            <div className="mt-4">
              <PhoneNumberField
                label=""
                prefix={customerForm.phone_prefix}
                number={customerForm.phone_number}
                onPrefixChange={(v) => setCustomerForm({ ...customerForm, phone_prefix: v })}
                onNumberChange={(v) => setCustomerForm({ ...customerForm, phone_number: v })}
                testIdPrefix="service-phone"
              />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          {!!service.add_ons?.length && (
            <div className="rounded-3xl border bg-white p-6">
              <h2 className="text-2xl font-bold text-[#2D3E50]">Optional Add-ons</h2>
              <div className="space-y-3 mt-5" data-testid="add-ons-section">
                {service.add_ons.map((addOn) => (
                  <label key={addOn.id} className="flex items-start gap-3 border rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(addOn.id)}
                      onChange={() => toggleAddOn(addOn.id)}
                      className="mt-1 w-4 h-4"
                      data-testid={`addon-${addOn.id}`}
                    />
                    <div>
                      <div className="font-semibold text-slate-800">{addOn.title}</div>
                      <div className="text-sm text-slate-500 mt-1">{addOn.description}</div>
                      <div className="text-sm text-[#2D3E50] font-medium mt-2">
                        {service.currency} {Number(addOn.price || 0).toLocaleString()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Completion Option</h2>

            <div className="space-y-3 mt-5" data-testid="payment-choice-section">
              <label className="flex items-start gap-3 border rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="payment_choice"
                  checked={customerForm.payment_choice === "pay_now"}
                  onChange={() => setCustomerForm({ ...customerForm, payment_choice: "pay_now" })}
                  className="mt-1 w-4 h-4"
                  data-testid="pay-now-radio"
                />
                <div>
                  <div className="font-semibold text-slate-800">Pay now</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Best for quick turnaround and immediate project activation.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 border rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="payment_choice"
                  checked={customerForm.payment_choice === "quote_first"}
                  onChange={() => setCustomerForm({ ...customerForm, payment_choice: "quote_first" })}
                  className="mt-1 w-4 h-4"
                  data-testid="quote-first-radio"
                />
                <div>
                  <div className="font-semibold text-slate-800">Request quote first</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Best for larger or more custom work requiring review first.
                  </div>
                </div>
              </label>
            </div>

            <label className="flex items-center gap-3 mt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={customerForm.save_address}
                onChange={(e) => setCustomerForm({ ...customerForm, save_address: e.target.checked })}
                className="w-4 h-4"
                data-testid="save-address-checkbox"
              />
              <span className="text-slate-700">Save these details for future orders</span>
            </label>
          </div>

          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Order Summary</h2>
            <div className="space-y-3 mt-5 text-sm" data-testid="order-summary">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Price</span>
                <span className="text-slate-800">{service.currency} {Number(service.base_price || 0).toLocaleString()}</span>
              </div>
              {selectedAddOns.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Add-ons ({selectedAddOns.length})</span>
                  <span className="text-slate-800">
                    {service.currency} {(service?.add_ons || [])
                      .filter((a) => selectedAddOns.includes(a.id))
                      .reduce((sum, item) => sum + Number(item.price || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span className="text-slate-800">Total</span>
                <span className="text-[#2D3E50]">{service.currency} {Number(total).toLocaleString()}</span>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full mt-6 rounded-xl bg-[#2D3E50] text-white py-3 font-semibold hover:bg-[#1e2d3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={submitting}
              data-testid="submit-request-btn"
            >
              {submitting
                ? "Submitting..."
                : service.requires_payment && customerForm.payment_choice === "pay_now"
                ? "Continue to Payment"
                : "Submit Request"}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
