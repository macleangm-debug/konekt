import React, { useEffect, useState } from "react";
import { Globe, Plus, Check, Percent, DollarSign } from "lucide-react";
import api from "../../lib/api";

export default function CountryPricingPage() {
  const [items, setItems] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    country_code: "TZ",
    category: "default",
    markup_type: "percentage",
    markup_value: 20,
    currency: "TZS",
    tax_rate: 0,
  });

  const load = async () => {
    try {
      const [rulesRes, countriesRes] = await Promise.all([
        api.get("/api/admin/country-pricing"),
        api.get("/api/geography/countries"),
      ]);
      setItems(rulesRes.data || []);
      setCountries(countriesRes.data || []);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const country = countries.find(c => c.code === form.country_code);
    if (country) {
      setForm(prev => ({ ...prev, currency: country.currency }));
    }
  }, [form.country_code, countries]);

  const save = async () => {
    try {
      await api.post("/api/admin/country-pricing", form);
      setShowForm(false);
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to save pricing rule");
    }
  };

  const deleteRule = async (id) => {
    if (!confirm("Delete this pricing rule?")) return;
    try {
      await api.delete(`/api/admin/country-pricing/${id}`);
      load();
    } catch (error) {
      alert("Failed to delete");
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="country-pricing-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Country Pricing</h1>
          <p className="mt-2 text-slate-600">Markup rules by country and category</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
          data-testid="add-pricing-rule-btn"
        >
          <Plus className="w-5 h-5" />
          Add Pricing Rule
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border bg-white p-6 space-y-4" data-testid="pricing-form">
          <h2 className="text-2xl font-bold text-[#2D3E50]">Add/Update Pricing Rule</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country *</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                data-testid="pricing-country-select"
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="default = all categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value || "default" })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Markup Type</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.markup_type}
                onChange={(e) => setForm({ ...form, markup_type: e.target.value })}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Markup Value {form.markup_type === "percentage" ? "(%)" : `(${form.currency})`}
              </label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                value={form.markup_value}
                onChange={(e) => setForm({ ...form, markup_value: parseFloat(e.target.value) || 0 })}
                data-testid="markup-value-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                type="number"
                placeholder="VAT etc."
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2D3E50] text-white font-semibold hover:bg-[#1a2b3c]"
              data-testid="save-pricing-btn"
            >
              <Check className="w-5 h-5" />
              Save Pricing Rule
            </button>
            <button
              onClick={() => setShowForm(false)}
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
        <div className="text-center py-10 text-slate-500">No pricing rules yet. Add rules to control markups by country.</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-5" data-testid={`pricing-rule-${item.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-bold">
                      {countries.find(c => c.code === item.country_code)?.name || item.country_code}
                    </div>
                    <div className="text-xs text-slate-500">{item.category}</div>
                  </div>
                </div>
                <button
                  onClick={() => deleteRule(item.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {item.markup_type === "percentage" ? (
                    <Percent className="w-4 h-4 text-[#D4A843]" />
                  ) : (
                    <DollarSign className="w-4 h-4 text-[#D4A843]" />
                  )}
                  <span className="font-bold text-lg">{item.markup_value}</span>
                  <span className="text-sm text-slate-500">
                    {item.markup_type === "percentage" ? "%" : item.currency}
                  </span>
                </div>
                {item.tax_rate > 0 && (
                  <div className="text-sm text-slate-500">
                    +{item.tax_rate}% tax
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-slate-400">
                Currency: {item.currency}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
