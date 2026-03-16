import React, { useEffect, useState } from "react";
import { Globe, Plus, Save } from "lucide-react";
import api from "../../lib/api";

export default function CountryLaunchConfigPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    country_code: "",
    country_name: "",
    currency: "",
    status: "coming_soon",
    waitlist_enabled: true,
    partner_recruitment_enabled: true,
    headline: "",
    message: "",
  });

  const load = async () => {
    try {
      const res = await api.get("/api/admin/country-launch");
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to load configs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/country-launch", form);
      setShowForm(false);
      setForm({
        country_code: "",
        country_name: "",
        currency: "",
        status: "coming_soon",
        waitlist_enabled: true,
        partner_recruitment_enabled: true,
        headline: "",
        message: "",
      });
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to save");
    }
  };

  const editConfig = (item) => {
    setForm({
      country_code: item.country_code || "",
      country_name: item.country_name || "",
      currency: item.currency || "",
      status: item.status || "coming_soon",
      waitlist_enabled: item.waitlist_enabled ?? true,
      partner_recruitment_enabled: item.partner_recruitment_enabled ?? true,
      headline: item.headline || "",
      message: item.message || "",
    });
    setShowForm(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      live: "bg-green-100 text-green-700",
      coming_soon: "bg-blue-100 text-blue-700",
      partner_recruitment: "bg-amber-100 text-amber-700",
      not_available: "bg-slate-100 text-slate-700",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="country-launch-config-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#20364D]">Country Launch Configuration</h1>
          <p className="text-slate-600 mt-1">Manage country availability and expansion settings</p>
        </div>
        <button
          onClick={() => {
            setForm({
              country_code: "",
              country_name: "",
              currency: "",
              status: "coming_soon",
              waitlist_enabled: true,
              partner_recruitment_enabled: true,
              headline: "",
              message: "",
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68] transition"
          data-testid="add-config-btn"
        >
          <Plus className="w-5 h-5" />
          Add Country
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8">
            <h2 className="text-2xl font-bold mb-6">
              {form.country_code ? `Edit ${form.country_name || form.country_code}` : "Add Country Configuration"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country Code *</label>
                  <input
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="e.g., TZ, KE"
                    value={form.country_code}
                    onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })}
                    required
                    maxLength={3}
                    data-testid="config-code-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country Name *</label>
                  <input
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="e.g., Tanzania"
                    value={form.country_name}
                    onChange={(e) => setForm({ ...form, country_name: e.target.value })}
                    required
                    data-testid="config-name-input"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <input
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="e.g., TZS, KES"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    data-testid="config-currency-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                  <select
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    data-testid="config-status-select"
                  >
                    <option value="live">Live - Fully Operational</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="partner_recruitment">Partner Recruitment</option>
                    <option value="not_available">Not Available</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    checked={form.waitlist_enabled}
                    onChange={(e) => setForm({ ...form, waitlist_enabled: e.target.checked })}
                    data-testid="config-waitlist-check"
                  />
                  <span className="text-sm">Enable Waitlist Signup</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    checked={form.partner_recruitment_enabled}
                    onChange={(e) => setForm({ ...form, partner_recruitment_enabled: e.target.checked })}
                    data-testid="config-recruitment-check"
                  />
                  <span className="text-sm">Enable Partner Recruitment Applications</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Headline</label>
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="e.g., Konekt is Coming to Kenya!"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  data-testid="config-headline-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  className="w-full border rounded-xl px-4 py-3 min-h-[100px]"
                  placeholder="Custom message for the country launch page"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  data-testid="config-message-input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border px-5 py-3 font-semibold hover:bg-slate-50"
                  data-testid="cancel-config-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68]"
                  data-testid="save-config-btn"
                >
                  <Save className="w-5 h-5" />
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configs Grid */}
      {loading ? (
        <div className="text-slate-500">Loading configurations...</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 text-center">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-600">No configurations yet</h3>
          <p className="text-slate-500 mt-1">Add your first country launch configuration</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border bg-white p-6 hover:shadow-sm transition cursor-pointer"
              onClick={() => editConfig(item)}
              data-testid={`config-${item.country_code}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xl font-bold text-[#20364D]">{item.country_name}</div>
                  <div className="text-sm text-slate-500">{item.country_code} • {item.currency || "-"}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                  {(item.status || "").replace("_", " ")}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {item.waitlist_enabled && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Waitlist</span>
                )}
                {item.partner_recruitment_enabled && (
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">Recruitment</span>
                )}
              </div>

              {item.headline && (
                <div className="mt-3 text-sm text-slate-600 truncate">{item.headline}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
