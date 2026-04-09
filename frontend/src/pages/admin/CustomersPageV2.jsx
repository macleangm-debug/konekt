import React, { useEffect, useState, useMemo } from "react";
import { Users, Plus, Search, Edit2, Trash2, Building2, Mail, CreditCard, ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { formatMoney } from "@/utils/finance";
import PhoneNumberField from "@/components/forms/PhoneNumberField";
import { splitPhone, combinePhone } from "@/utils/phoneUtils";
import { useConfirmModal } from "@/contexts/ConfirmModalContext";

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
  phone_prefix: "+255",
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
  industry: "",
  source: "",
  is_active: true,
};

export default function CustomersPageV2() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirmAction } = useConfirmModal();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    industry: "",
    payment_term_type: "",
    city: "",
    has_credit: "",
  });

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
        const { phone_prefix, ...rest } = form;
        await adminApi.updateCustomer(editingId, { ...rest, phone: combinePhone(phone_prefix, form.phone) });
      } else {
        const { phone_prefix, ...rest } = form;
        await adminApi.createCustomer({ ...rest, phone: combinePhone(phone_prefix, form.phone) });
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
    const parsed = splitPhone(customer.phone);
    setForm({
      company_name: customer.company_name || "",
      contact_name: customer.contact_name || "",
      email: customer.email || "",
      phone_prefix: parsed.prefix,
      phone: parsed.number,
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
      industry: customer.industry || "",
      source: customer.source || "",
      is_active: customer.is_active !== false,
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const deleteCustomer = async (customerId) => {
    confirmAction({
      title: "Deactivate Customer?",
      message: "This customer account will be deactivated.",
      confirmLabel: "Deactivate",
      tone: "danger",
      onConfirm: async () => {
        try {
          await adminApi.deleteCustomer(customerId);
          loadCustomers();
        } catch (error) {
          console.error("Failed to delete customer:", error);
          alert(error.response?.data?.detail || "Failed to delete customer");
        }
      },
    });
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Get unique values for filter dropdowns
  const uniqueIndustries = useMemo(() => {
    return [...new Set(customers.map(c => c.industry).filter(Boolean))].sort();
  }, [customers]);

  const uniqueCities = useMemo(() => {
    return [...new Set(customers.map(c => c.city).filter(Boolean))].sort();
  }, [customers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Search filter
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matches = (
          c.company_name?.toLowerCase().includes(term) ||
          c.contact_name?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term)
        );
        if (!matches) return false;
      }
      
      // Industry filter
      if (filters.industry && c.industry !== filters.industry) return false;
      
      // Payment term filter
      if (filters.payment_term_type && c.payment_term_type !== filters.payment_term_type) return false;
      
      // City filter
      if (filters.city && c.city !== filters.city) return false;
      
      // Credit account filter
      if (filters.has_credit === "yes" && c.payment_term_type !== "credit_account") return false;
      if (filters.has_credit === "no" && c.payment_term_type === "credit_account") return false;
      
      return true;
    });
  }, [customers, filters]);

  // Stats
  const stats = useMemo(() => {
    const activeCount = customers.filter(c => c.is_active !== false).length;
    const creditCustomers = customers.filter(c => c.payment_term_type === "credit_account").length;
    const withTIN = customers.filter(c => c.tax_number).length;
    const totalCreditLimit = customers
      .filter(c => c.payment_term_type === "credit_account")
      .reduce((acc, c) => acc + (Number(c.credit_limit) || 0), 0);
    return { activeCount, creditCustomers, withTIN, totalCreditLimit };
  }, [customers]);

  const clearFilters = () => {
    setFilters({
      search: "",
      industry: "",
      payment_term_type: "",
      city: "",
      has_credit: "",
    });
  };

  const hasActiveFilters = filters.industry || filters.payment_term_type || filters.city || filters.has_credit;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="customers-page">
      <div className="max-w-none w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
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
            {showForm ? "Cancel" : "Add Customer"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4">
          <div className="rounded-xl bg-white border p-4">
            <p className="text-sm text-slate-500">Total Customers</p>
            <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-600">Active</p>
            <p className="text-2xl font-bold text-green-700">{stats.activeCount}</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-600">Credit Accounts</p>
            <p className="text-2xl font-bold text-blue-700">{stats.creditCustomers}</p>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
            <p className="text-sm text-purple-600">With TIN</p>
            <p className="text-2xl font-bold text-purple-700">{stats.withTIN}</p>
          </div>
          <div className="rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/30 p-4">
            <p className="text-sm text-[#9a6d00]">Total Credit Limit</p>
            <p className="text-lg font-bold text-[#9a6d00]">{formatMoney(stats.totalCreditLimit)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              data-testid="search-customers-input"
            />
          </div>

          <select
            className="border border-slate-300 rounded-xl px-4 py-3 bg-white"
            value={filters.industry}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
          >
            <option value="">All Industries</option>
            {uniqueIndustries.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            className="border border-slate-300 rounded-xl px-4 py-3 bg-white"
            value={filters.payment_term_type}
            onChange={(e) => setFilters({ ...filters, payment_term_type: e.target.value })}
          >
            <option value="">All Payment Terms</option>
            {paymentTerms.map((term) => (
              <option key={term.value} value={term.value}>{term.label}</option>
            ))}
          </select>

          <select
            className="border border-slate-300 rounded-xl px-4 py-3 bg-white"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          >
            <option value="">All Cities</option>
            {uniqueCities.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            className="border border-slate-300 rounded-xl px-4 py-3 bg-white"
            value={filters.has_credit}
            onChange={(e) => setFilters({ ...filters, has_credit: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="yes">Credit Accounts Only</option>
            <option value="no">Non-Credit Only</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}

          <div className="ml-auto flex rounded-xl border overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-4 py-3 text-sm font-medium ${viewMode === "table" ? "bg-[#2D3E50] text-white" : "hover:bg-slate-50"}`}
              data-testid="view-table-btn"
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-4 py-3 text-sm font-medium ${viewMode === "cards" ? "bg-[#2D3E50] text-white" : "hover:bg-slate-50"}`}
              data-testid="view-cards-btn"
            >
              Cards
            </button>
          </div>
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <p className="text-sm text-slate-600">
            Showing {filteredCustomers.length} of {customers.length} customers
          </p>
        )}

        {/* Form */}
        {showForm && (
          <div className="rounded-2xl border bg-white p-6 shadow-lg" data-testid="customer-form">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Edit Customer" : "Create New Customer"}
            </h2>
            <form onSubmit={saveCustomer} className="grid md:grid-cols-3 gap-4">
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Company Name *"
                value={form.company_name}
                onChange={(e) => update("company_name", e.target.value)}
                required
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Contact Name *"
                value={form.contact_name}
                onChange={(e) => update("contact_name", e.target.value)}
                required
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Email *"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
              <PhoneNumberField
                label=""
                prefix={form.phone_prefix}
                number={form.phone}
                onPrefixChange={(v) => update("phone_prefix", v)}
                onNumberChange={(v) => update("phone", v)}
                testIdPrefix="customer-phone"
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Industry"
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="City"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Address Line 1"
                value={form.address_line_1}
                onChange={(e) => update("address_line_1", e.target.value)}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="TIN (Tax Number)"
                value={form.tax_number}
                onChange={(e) => update("tax_number", e.target.value)}
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="BRN (Business Reg Number)"
                value={form.business_registration_number}
                onChange={(e) => update("business_registration_number", e.target.value)}
              />
              
              <select
                className="border border-slate-300 rounded-xl px-4 py-3 bg-white"
                value={form.payment_term_type}
                onChange={(e) => {
                  const selected = paymentTerms.find(t => t.value === e.target.value);
                  update("payment_term_type", e.target.value);
                  update("payment_term_label", selected?.label || "");
                }}
              >
                {paymentTerms.map((term) => (
                  <option key={term.value} value={term.value}>{term.label}</option>
                ))}
              </select>

              {form.payment_term_type === "credit_account" && (
                <input
                  className="border border-slate-300 rounded-xl px-4 py-3"
                  placeholder="Credit Limit (TZS)"
                  type="number"
                  value={form.credit_limit}
                  onChange={(e) => update("credit_limit", Number(e.target.value))}
                />
              )}

              <textarea
                className="border border-slate-300 rounded-xl px-4 py-3 md:col-span-3"
                placeholder="Payment Term Notes"
                rows={2}
                value={form.payment_term_notes}
                onChange={(e) => update("payment_term_notes", e.target.value)}
              />
              
              <div className="md:col-span-3 flex gap-3">
                <button
                  type="submit"
                  className="bg-[#D4A843] text-[#2D3E50] px-6 py-3 rounded-xl font-semibold hover:bg-[#c49933]"
                >
                  {editingId ? "Update Customer" : "Create Customer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                  className="border border-slate-300 px-6 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-5 py-4 text-sm font-semibold">Company</th>
                    <th className="px-5 py-4 text-sm font-semibold">Contact</th>
                    <th className="px-5 py-4 text-sm font-semibold">Industry</th>
                    <th className="px-5 py-4 text-sm font-semibold">City</th>
                    <th className="px-5 py-4 text-sm font-semibold">Payment Terms</th>
                    <th className="px-5 py-4 text-sm font-semibold">Credit Limit</th>
                    <th className="px-5 py-4 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">No customers found</td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="font-semibold">{customer.company_name}</div>
                          <div className="text-sm text-slate-500">{customer.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div>{customer.contact_name}</div>
                          <div className="text-sm text-slate-500">{customer.phone || "—"}</div>
                        </td>
                        <td className="px-5 py-4">{customer.industry || "—"}</td>
                        <td className="px-5 py-4">{customer.city || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            customer.payment_term_type === "credit_account" 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {customer.payment_term_label || customer.payment_term_type || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {customer.payment_term_type === "credit_account" 
                            ? formatMoney(customer.credit_limit || 0) 
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editCustomer(customer)}
                              className="p-2 rounded-lg hover:bg-slate-100"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCustomer(customer.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cards View */}
        {viewMode === "cards" && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-10 text-slate-500">Loading...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="col-span-full text-center py-10 text-slate-500">No customers found</div>
            ) : (
              filteredCustomers.map((customer) => (
                <div key={customer.id} className="rounded-2xl border bg-white p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{customer.company_name}</h3>
                      <p className="text-sm text-slate-600">{customer.contact_name}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      customer.payment_term_type === "credit_account" 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {customer.payment_term_label || "—"}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4" />
                      {customer.email}
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        {customer.phone}
                      </div>
                    )}
                    {customer.industry && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 className="w-4 h-4" />
                        {customer.industry}
                      </div>
                    )}
                    {customer.payment_term_type === "credit_account" && customer.credit_limit && (
                      <div className="flex items-center gap-2 text-blue-600 font-medium">
                        <CreditCard className="w-4 h-4" />
                        Credit: {formatMoney(customer.credit_limit)}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                    <button
                      onClick={() => editCustomer(customer)}
                      className="p-2 rounded-lg hover:bg-slate-100"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCustomer(customer.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                      title="Deactivate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
