import React, { useEffect, useState } from "react";
import { Users, Plus, Search, Edit2, Trash2, Building2, Phone, Mail, CreditCard, ChevronDown, ChevronUp, X } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const paymentTerms = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "7_days", label: "Net 7" },
  { value: "14_days", label: "Net 14" },
  { value: "30_days", label: "Net 30" },
  { value: "50_upfront_50_delivery", label: "50% Upfront / 50% on Delivery" },
  { value: "advance_payment", label: "Advance Payment Required" },
  { value: "credit_account", label: "Credit Account" },
  { value: "custom", label: "Custom Terms" },
];

const initialForm = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  country: "Tanzania",
  tax_number: "",
  business_registration_number: "",
  payment_term_type: "due_on_receipt",
  payment_term_days: 0,
  payment_term_label: "Due on Receipt",
  payment_term_notes: "",
  credit_limit: 0,
  is_active: true,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCustomers();
      setCustomers(res.data || []);
    } catch (error) {
      console.error("Failed to load customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const saveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await adminApi.updateCustomer(editingId, form);
      } else {
        await adminApi.createCustomer(form);
      }
      setForm(initialForm);
      setShowForm(false);
      setEditingId(null);
      loadCustomers();
    } catch (error) {
      console.error("Failed to save customer:", error);
      alert(error.response?.data?.detail || "Failed to save customer");
    }
  };

  const editCustomer = (customer) => {
    setForm({
      company_name: customer.company_name || "",
      contact_name: customer.contact_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address_line_1: customer.address_line_1 || "",
      address_line_2: customer.address_line_2 || "",
      city: customer.city || "",
      country: customer.country || "Tanzania",
      tax_number: customer.tax_number || "",
      business_registration_number: customer.business_registration_number || "",
      payment_term_type: customer.payment_term_type || "due_on_receipt",
      payment_term_days: customer.payment_term_days || 0,
      payment_term_label: customer.payment_term_label || "Due on Receipt",
      payment_term_notes: customer.payment_term_notes || "",
      credit_limit: customer.credit_limit || 0,
      is_active: customer.is_active !== false,
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const deleteCustomer = async (customerId) => {
    if (!window.confirm("Are you sure you want to deactivate this customer?")) return;
    try {
      await adminApi.deleteCustomer(customerId);
      loadCustomers();
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert(error.response?.data?.detail || "Failed to delete customer");
    }
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(term) ||
      c.contact_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  const activeCount = customers.filter((c) => c.is_active !== false).length;
  const creditCustomers = customers.filter((c) => c.payment_term_type === "credit_account").length;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="customers-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-[#D4A843]" />
              Customers
            </h1>
            <p className="text-slate-600 mt-1">Manage B2B customers with payment terms</p>
          </div>
          <button
            onClick={() => {
              setForm(initialForm);
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
            data-testid="create-customer-btn"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-white border p-4">
            <p className="text-sm text-slate-500">Total Customers</p>
            <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-600">Active</p>
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-600">Credit Accounts</p>
            <p className="text-2xl font-bold text-blue-700">{creditCustomers}</p>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
            <p className="text-sm text-purple-600">With TIN</p>
            <p className="text-2xl font-bold text-purple-700">
              {customers.filter((c) => c.tax_number).length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              data-testid="search-customers-input"
            />
          </div>
        </div>

        <div className="grid xl:grid-cols-[480px_1fr] gap-6">
          {/* Create/Edit Customer Form */}
          {showForm && (
            <div className="rounded-2xl border bg-white p-6 shadow-lg h-fit" data-testid="customer-form">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Customer" : "Add New Customer"}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={saveCustomer} className="space-y-4">
                {/* Company Info */}
                <div className="space-y-3">
                  <p className="font-semibold text-sm text-slate-600">Company Information</p>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Company name *"
                    value={form.company_name}
                    onChange={(e) => update("company_name", e.target.value)}
                    required
                    data-testid="customer-company-name"
                  />
                  <input
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Contact name *"
                    value={form.contact_name}
                    onChange={(e) => update("contact_name", e.target.value)}
                    required
                    data-testid="customer-contact-name"
                  />
                  <input
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Email *"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    data-testid="customer-email"
                  />
                  <input
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Phone"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    data-testid="customer-phone"
                  />
                </div>

                {/* Address */}
                <div className="space-y-3">
                  <p className="font-semibold text-sm text-slate-600">Address</p>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Address line 1"
                    value={form.address_line_1}
                    onChange={(e) => update("address_line_1", e.target.value)}
                  />
                  <input
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Address line 2"
                    value={form.address_line_2}
                    onChange={(e) => update("address_line_2", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                    />
                    <input
                      className="border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="Country"
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                    />
                  </div>
                </div>

                {/* Tax Registration */}
                <div className="space-y-3">
                  <p className="font-semibold text-sm text-slate-600">Tax Registration</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="TIN"
                      value={form.tax_number}
                      onChange={(e) => update("tax_number", e.target.value)}
                      data-testid="customer-tin"
                    />
                    <input
                      className="border border-slate-300 rounded-xl px-4 py-3"
                      placeholder="Business Reg No"
                      value={form.business_registration_number}
                      onChange={(e) => update("business_registration_number", e.target.value)}
                      data-testid="customer-brn"
                    />
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="rounded-2xl border border-[#D4A843]/30 bg-[#D4A843]/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#D4A843]" />
                    <h3 className="font-semibold">Payment Terms</h3>
                  </div>

                  <select
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                    value={form.payment_term_type}
                    onChange={(e) => {
                      const selected = paymentTerms.find((t) => t.value === e.target.value);
                      update("payment_term_type", e.target.value);
                      update("payment_term_label", selected?.label || "");
                    }}
                    data-testid="customer-payment-term-type"
                  >
                    {paymentTerms.map((term) => (
                      <option key={term.value} value={term.value}>
                        {term.label}
                      </option>
                    ))}
                  </select>

                  {form.payment_term_type === "custom" && (
                    <input
                      className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      type="number"
                      placeholder="Custom payment term days"
                      value={form.payment_term_days}
                      onChange={(e) => update("payment_term_days", Number(e.target.value))}
                      data-testid="customer-payment-term-days"
                    />
                  )}

                  <input
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                    placeholder="Payment term label (optional override)"
                    value={form.payment_term_label}
                    onChange={(e) => update("payment_term_label", e.target.value)}
                  />

                  <textarea
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 min-h-[80px]"
                    placeholder="Payment term notes (e.g., 'Due 15th of following month')"
                    value={form.payment_term_notes}
                    onChange={(e) => update("payment_term_notes", e.target.value)}
                    data-testid="customer-payment-term-notes"
                  />

                  <input
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                    type="number"
                    placeholder="Credit limit (TZS)"
                    value={form.credit_limit}
                    onChange={(e) => update("credit_limit", Number(e.target.value))}
                    data-testid="customer-credit-limit"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#2D3E50] text-white py-3 font-semibold hover:bg-[#3d5166]"
                  data-testid="save-customer-btn"
                >
                  {editingId ? "Update Customer" : "Save Customer"}
                </button>
              </form>
            </div>
          )}

          {/* Customers List */}
          <div className={showForm ? "" : "xl:col-span-2"}>
            <div className="space-y-4">
              {loading ? (
                <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
                  Loading customers...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
                  No customers found
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="rounded-2xl border bg-white overflow-hidden"
                    data-testid={`customer-card-${customer.id}`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="w-5 h-5 text-[#2D3E50]" />
                            <span className="font-bold text-lg text-[#2D3E50] truncate">
                              {customer.company_name}
                            </span>
                            {!customer.is_active && (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-red-100 text-red-700">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600">{customer.contact_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {customer.email}
                            </span>
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {customer.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#D4A843]/10 text-[#2D3E50]">
                              <CreditCard className="w-4 h-4" />
                              {customer.payment_term_label || "Due on Receipt"}
                            </span>
                            {customer.tax_number && (
                              <span className="text-xs text-slate-500">
                                TIN: {customer.tax_number}
                              </span>
                            )}
                            {customer.credit_limit > 0 && (
                              <span className="text-xs text-green-600 font-medium">
                                Credit: TZS {customer.credit_limit.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => editCustomer(customer)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                            data-testid={`edit-customer-${customer.id}`}
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteCustomer(customer.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                            data-testid={`delete-customer-${customer.id}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              setExpandedCustomer(
                                expandedCustomer === customer.id ? null : customer.id
                              )
                            }
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                          >
                            {expandedCustomer === customer.id ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedCustomer === customer.id && (
                      <div className="border-t bg-slate-50 p-5">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm font-semibold text-slate-600 mb-2">Address</p>
                            <p className="text-slate-800">
                              {customer.address_line_1 || "-"}
                              {customer.address_line_2 && (
                                <>
                                  <br />
                                  {customer.address_line_2}
                                </>
                              )}
                              {(customer.city || customer.country) && (
                                <>
                                  <br />
                                  {[customer.city, customer.country].filter(Boolean).join(", ")}
                                </>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-600 mb-2">
                              Tax Registration
                            </p>
                            <p className="text-slate-800">
                              {customer.tax_number ? `TIN: ${customer.tax_number}` : "No TIN"}
                              {customer.business_registration_number && (
                                <>
                                  <br />
                                  BRN: {customer.business_registration_number}
                                </>
                              )}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm font-semibold text-slate-600 mb-2">
                              Payment Terms Details
                            </p>
                            <div className="bg-white rounded-xl border p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-500">Type</p>
                                  <p className="font-medium">{customer.payment_term_type}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Label</p>
                                  <p className="font-medium">{customer.payment_term_label}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Days</p>
                                  <p className="font-medium">{customer.payment_term_days || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Credit Limit</p>
                                  <p className="font-medium">
                                    TZS {(customer.credit_limit || 0).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              {customer.payment_term_notes && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-slate-500 text-sm">Notes</p>
                                  <p className="text-slate-800">{customer.payment_term_notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
