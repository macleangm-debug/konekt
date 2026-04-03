import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Package, Plus, Clock, CheckCircle2, XCircle, AlertCircle, Send } from "lucide-react";

const reviewStatusColors = {
  pending: { bg: "bg-amber-100 text-amber-700", icon: Clock, label: "Pending Review" },
  approved: { bg: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Approved" },
  rejected: { bg: "bg-red-100 text-red-700", icon: XCircle, label: "Rejected" },
  changes_requested: { bg: "bg-purple-100 text-purple-700", icon: AlertCircle, label: "Changes Requested" },
};

function authHeaders() {
  const token = localStorage.getItem("partner_token") || localStorage.getItem("konekt_token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export default function VendorProductSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [taxonomy, setTaxonomy] = useState({ groups: [], categories: [], subcategories: [] });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    product_name: "",
    description: "",
    base_cost: "",
    currency_code: "TZS",
    visibility_mode: "request_quote",
    group_id: "",
    category_id: "",
    subcategory_id: "",
    min_quantity: 1,
  });

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/vendor/catalog/submissions", { headers: authHeaders() });
      setSubmissions(res.data || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadTaxonomy = useCallback(async () => {
    try {
      const res = await api.get("/api/vendor/catalog/taxonomy", { headers: authHeaders() });
      setTaxonomy(res.data || { groups: [], categories: [], subcategories: [] });
    } catch {}
  }, []);

  useEffect(() => {
    loadSubmissions();
    loadTaxonomy();
  }, [loadSubmissions, loadTaxonomy]);

  const filteredCategories = taxonomy.categories.filter((c) => !form.group_id || c.group_id === form.group_id);
  const filteredSubcats = taxonomy.subcategories.filter((s) => !form.category_id || s.category_id === form.category_id);

  const submitProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/vendor/catalog/submissions", {
        ...form,
        base_cost: Number(form.base_cost || 0),
        min_quantity: Number(form.min_quantity || 1),
      }, { headers: authHeaders() });
      setShowForm(false);
      setForm({
        product_name: "",
        description: "",
        base_cost: "",
        currency_code: "TZS",
        visibility_mode: "request_quote",
        group_id: "",
        category_id: "",
        subcategory_id: "",
        min_quantity: 1,
      });
      loadSubmissions();
    } catch (err) {
      alert(err.response?.data?.detail || "Submission failed");
    }
    setSubmitting(false);
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="vendor-submissions-page">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="w-8 h-8 text-[#D4A843]" />
              Product Submissions
            </h1>
            <p className="text-slate-600 mt-1">Submit products for Konekt marketplace review.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166]"
            data-testid="new-submission-btn"
          >
            <Plus className="w-5 h-5" />
            {showForm ? "Cancel" : "Submit Product"}
          </button>
        </div>

        {/* Submission Form */}
        {showForm && (
          <div className="rounded-2xl border bg-white p-6 shadow-lg" data-testid="submission-form">
            <h2 className="text-xl font-bold mb-4">New Product Submission</h2>
            <form onSubmit={submitProduct} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Product Name *</label>
                  <input className="w-full border rounded-xl px-4 py-3 text-sm" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required data-testid="prod-name-input" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Base Cost (TZS) *</label>
                  <input className="w-full border rounded-xl px-4 py-3 text-sm" type="number" min="0" value={form.base_cost} onChange={(e) => setForm({ ...form, base_cost: e.target.value })} required data-testid="prod-cost-input" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Description</label>
                <textarea className="w-full border rounded-xl px-4 py-3 text-sm min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="prod-desc-input" />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Group</label>
                  <select className="w-full border rounded-xl px-3 py-3 text-sm bg-white" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value, category_id: "", subcategory_id: "" })} data-testid="prod-group-select">
                    <option value="">Select group</option>
                    {taxonomy.groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Category</label>
                  <select className="w-full border rounded-xl px-3 py-3 text-sm bg-white" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: "" })} data-testid="prod-cat-select">
                    <option value="">Select category</option>
                    {filteredCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Subcategory</label>
                  <select className="w-full border rounded-xl px-3 py-3 text-sm bg-white" value={form.subcategory_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })} data-testid="prod-sub-select">
                    <option value="">Select subcategory</option>
                    {filteredSubcats.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Visibility Mode</label>
                  <select className="w-full border rounded-xl px-3 py-3 text-sm bg-white" value={form.visibility_mode} onChange={(e) => setForm({ ...form, visibility_mode: e.target.value })} data-testid="prod-visibility-select">
                    <option value="request_quote">Request Quote</option>
                    <option value="buy_now">Buy Now</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Min Quantity</label>
                  <input className="w-full border rounded-xl px-4 py-3 text-sm" type="number" min="1" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} data-testid="prod-min-qty-input" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#D4A843] text-[#2D3E50] px-6 py-3 font-semibold hover:bg-[#c49933] disabled:opacity-50 flex items-center gap-2"
                data-testid="submit-product-btn"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Submitting..." : "Submit for Review"}
              </button>
            </form>
          </div>
        )}

        {/* Submissions List */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="font-bold text-[#20364D]">Your Submissions</h2>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-slate-400">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400">
              No submissions yet. Click "Submit Product" to start.
            </div>
          ) : (
            <div className="divide-y">
              {submissions.map((sub) => {
                const statusConfig = reviewStatusColors[sub.review_status] || reviewStatusColors.pending;
                const StatusIcon = statusConfig.icon;
                return (
                  <div key={sub.id} className="px-6 py-4 flex items-center justify-between gap-4" data-testid={`submission-row-${sub.id}`}>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{sub.product_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {sub.currency_code} {Number(sub.base_cost).toLocaleString()} &bull; {sub.visibility_mode} &bull; {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                      {sub.review_notes && (
                        <div className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-3 py-1.5">{sub.review_notes}</div>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${statusConfig.bg}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
