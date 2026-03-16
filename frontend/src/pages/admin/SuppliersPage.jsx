import React, { useEffect, useState } from "react";
import { Building2, Plus, Check, Phone, Mail, Edit2, Trash2 } from "lucide-react";
import api from "../../lib/api";

export default function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Tanzania",
    tax_number: "",
    payment_terms: "",
    lead_time_days: "",
    bank_details: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "Tanzania",
      tax_number: "",
      payment_terms: "",
      lead_time_days: "",
      bank_details: "",
      notes: "",
    });
    setEditingId(null);
  };

  const load = async () => {
    try {
      const res = await api.get("/api/admin/suppliers");
      setItems(res.data || []);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      if (editingId) {
        await api.put(`/api/admin/suppliers/${editingId}`, form);
      } else {
        await api.post("/api/admin/suppliers", form);
      }
      setShowForm(false);
      resetForm();
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to save supplier");
    }
  };

  const startEdit = (supplier) => {
    setForm({
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      country: supplier.country || "Tanzania",
      tax_number: supplier.tax_number || "",
      payment_terms: supplier.payment_terms || "",
      lead_time_days: supplier.lead_time_days || "",
      bank_details: supplier.bank_details || "",
      notes: supplier.notes || "",
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  const deleteSupplier = async (id) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await api.delete(`/api/admin/suppliers/${id}`);
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to delete supplier");
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="suppliers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Suppliers</h1>
          <p className="mt-2 text-slate-600">Manage your supplier master data</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c] transition-colors"
          data-testid="add-supplier-btn"
        >
          <Plus className="w-5 h-5" />
          Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="supplier-form">
          <h2 className="text-2xl font-bold text-[#2D3E50]">
            {editingId ? "Edit Supplier" : "Add Supplier"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Supplier company name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="supplier-name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Primary contact name"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="email"
                placeholder="supplier@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="supplier-email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="+255 XXX XXX XXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Number / TIN</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Tax identification number"
                value={form.tax_number}
                onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="e.g., Net 30, COD"
                value={form.payment_terms}
                onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead Time (Days)</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                placeholder="Average delivery days"
                value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Full address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Details</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Bank name, account number, etc."
              value={form.bank_details}
              onChange={(e) => setForm({ ...form, bank_details: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
              placeholder="Internal notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
              data-testid="save-supplier-btn"
            >
              <Check className="w-5 h-5" />
              {editingId ? "Update Supplier" : "Save Supplier"}
            </button>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="px-6 py-3 rounded-xl border font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-slate-500">No suppliers yet. Add your first supplier.</div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-6" data-testid={`supplier-${item.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{item.name}</div>
                    <div className="text-sm text-slate-500">{item.contact_person || "No contact"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 rounded-lg hover:bg-slate-100"
                    data-testid={`edit-supplier-${item.id}`}
                  >
                    <Edit2 className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    onClick={() => deleteSupplier(item.id)}
                    className="p-2 rounded-lg hover:bg-red-50"
                    data-testid={`delete-supplier-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {item.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    {item.email}
                  </div>
                )}
                {item.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    {item.phone}
                  </div>
                )}
                {item.city && (
                  <div className="text-slate-500">{item.city}, {item.country || "Tanzania"}</div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.payment_terms && (
                  <span className="px-2 py-1 rounded-lg text-xs bg-slate-100">{item.payment_terms}</span>
                )}
                {item.lead_time_days && (
                  <span className="px-2 py-1 rounded-lg text-xs bg-blue-100 text-blue-700">
                    {item.lead_time_days} days lead time
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
