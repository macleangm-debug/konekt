import React, { useEffect, useState } from "react";
import { Package, Plus, Loader2 } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function VendorProductsManagerPage() {
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ 
    name: "", 
    slug: "", 
    group_slug: "", 
    group_name: "", 
    subgroup_slug: "", 
    subgroup_name: "", 
    price: "", 
    currency: "TZS", 
    status: "active", 
    description: "" 
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      axios.get(`${API_URL}/api/admin/product-groups`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      axios.get(`${API_URL}/api/admin/product-subgroups`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    ])
      .then(([g, sg]) => {
        setGroups(g.data || []);
        setSubgroups(sg.data || []);
      })
      .catch(err => console.error("Failed to load groups:", err))
      .finally(() => setLoading(false));
  }, []);

  const availableSubgroups = !form.group_slug ? subgroups : subgroups.filter((x) => x.group_slug === form.group_slug);

  const onGroupChange = (groupSlug) => {
    const group = groups.find((g) => g.slug === groupSlug);
    setForm({ ...form, group_slug: groupSlug, group_name: group?.name || "", subgroup_slug: "", subgroup_name: "" });
  };

  const onSubgroupChange = (subgroupSlug) => {
    const subgroup = subgroups.find((g) => g.slug === subgroupSlug);
    setForm({ ...form, subgroup_slug: subgroupSlug, subgroup_name: subgroup?.name || "" });
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const createProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/vendor/products`, form, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to create product:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ 
      name: "", 
      slug: "", 
      group_slug: "", 
      group_name: "", 
      subgroup_slug: "", 
      subgroup_name: "", 
      price: "", 
      currency: "TZS", 
      status: "active", 
      description: "" 
    });
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="vendor-products-page">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-[#20364D]" />
          </div>
          <div>
            <div className="text-4xl font-bold text-[#20364D]">Vendor Products</div>
            <div className="text-slate-600">Vendors can add products using the same product group and sub-group structure.</div>
          </div>
        </div>
      </div>

      {!submitted ? (
        <form onSubmit={createProduct} className="rounded-[2rem] border bg-white p-8 space-y-6">
          <div className="text-lg font-bold text-[#20364D] flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Product
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <input 
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Product Name" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} 
              required
            />
            <input 
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 bg-slate-50" 
              placeholder="Slug (auto-generated)" 
              value={form.slug} 
              onChange={(e) => setForm({ ...form, slug: e.target.value })} 
            />
            <select 
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              value={form.group_slug} 
              onChange={(e) => onGroupChange(e.target.value)}
              required
            >
              <option value="">Select Product Group</option>
              {groups.map((group) => (
                <option key={group.id || group.slug} value={group.slug}>{group.name}</option>
              ))}
            </select>
            <select 
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              value={form.subgroup_slug} 
              onChange={(e) => onSubgroupChange(e.target.value)}
              disabled={!availableSubgroups.length}
            >
              <option value="">Select Sub-Group (optional)</option>
              {availableSubgroups.map((sg) => (
                <option key={sg.id || sg.slug} value={sg.slug}>{sg.name}</option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <input 
              type="number" 
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              placeholder="Price" 
              value={form.price} 
              onChange={(e) => setForm({ ...form, price: e.target.value })} 
              required
            />
            <select 
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              value={form.currency} 
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="TZS">TZS</option>
              <option value="USD">USD</option>
            </select>
            <select 
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
              value={form.status} 
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <textarea 
            className="w-full min-h-[120px] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
            placeholder="Product description..." 
            value={form.description} 
            onChange={(e) => setForm({ ...form, description: e.target.value })} 
          />

          <button 
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {submitting ? "Adding..." : "Add Product"}
          </button>
        </form>
      ) : (
        <div className="rounded-[2rem] border bg-white p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-[#20364D] mb-2">Product Added!</div>
          <div className="text-slate-600 mb-6">Your product has been successfully added to the catalog.</div>
          <button 
            onClick={resetForm}
            className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition"
          >
            Add Another Product
          </button>
        </div>
      )}
    </div>
  );
}
