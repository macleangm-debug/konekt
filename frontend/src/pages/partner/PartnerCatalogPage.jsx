import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Package, Eye, FileEdit } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import partnerApi from "../../lib/partnerApi";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";

export default function PartnerCatalogPage() {
  const [items, setItems] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(getDefaultForm());
  const [activeTab, setActiveTab] = useState("basic"); // "basic" | "listings"
  const navigate = useNavigate();
  const { confirmAction } = useConfirmModal();

  function getDefaultForm() {
    return {
      source_type: "product",
      sku: "",
      name: "",
      description: "",
      category: "",
      base_partner_price: "",
      partner_available_qty: "",
      partner_status: "in_stock",
      lead_time_days: "2",
      min_order_qty: "1",
      unit: "piece",
      regions: "",
    };
  }

  const load = async () => {
    try {
      const [catalogRes, listingsRes] = await Promise.all([
        partnerApi.get("/api/partner-portal/catalog"),
        partnerApi.get("/api/partner-listings").catch(() => ({ data: [] })),
      ]);
      setItems(catalogRes.data || []);
      setListings(listingsRes.data || []);
    } catch (err) {
      console.error("Failed to load catalog:", err);
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
      const payload = {
        ...form,
        regions: form.regions.split(",").map((x) => x.trim()).filter(Boolean),
        base_partner_price: parseFloat(form.base_partner_price) || 0,
        partner_available_qty: parseFloat(form.partner_available_qty) || 0,
        lead_time_days: parseInt(form.lead_time_days) || 2,
        min_order_qty: parseInt(form.min_order_qty) || 1,
      };

      if (editItem) {
        await partnerApi.put(`/api/partner-portal/catalog/${editItem.id}`, payload);
      } else {
        await partnerApi.post("/api/partner-portal/catalog", payload);
      }
      
      setShowForm(false);
      setEditItem(null);
      setForm(getDefaultForm());
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to save item");
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      source_type: item.source_type || "product",
      sku: item.sku || "",
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      base_partner_price: item.base_partner_price?.toString() || "",
      partner_available_qty: item.partner_available_qty?.toString() || "",
      partner_status: item.partner_status || "in_stock",
      lead_time_days: item.lead_time_days?.toString() || "2",
      min_order_qty: item.min_order_qty?.toString() || "1",
      unit: item.unit || "piece",
      regions: (item.regions || []).join(", "),
    });
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    confirmAction({
      title: "Deactivate Item?",
      message: `This will deactivate "${item.name}" from your catalog.`,
      confirmLabel: "Deactivate",
      tone: "danger",
      onConfirm: async () => {
        try {
          await partnerApi.delete(`/api/partner-portal/catalog/${item.id}`);
          load();
        } catch (err) {
          alert("Failed to deactivate item");
        }
      },
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      in_stock: "bg-green-100 text-green-700",
      low_stock: "bg-amber-100 text-amber-700",
      out_of_stock: "bg-red-100 text-red-700",
      draft: "bg-slate-100 text-slate-700",
      submitted: "bg-blue-100 text-blue-700",
      under_review: "bg-purple-100 text-purple-700",
      approved: "bg-green-100 text-green-700",
      published: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const getApprovalBadge = (status) => {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(status)}`}>
        {(status || "draft").replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="partner-catalog-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#20364D]">My Catalog</h1>
          <p className="text-slate-600 mt-1">Manage your products and services for Konekt</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/partner/catalog/new")}
            className="flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68] transition"
            data-testid="create-listing-btn"
          >
            <FileEdit className="w-5 h-5" />
            Rich Listing
          </button>
          <button
            onClick={() => {
              setEditItem(null);
              setForm(getDefaultForm());
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-white transition"
            data-testid="add-catalog-item-btn"
          >
            <Plus className="w-5 h-5" />
            Quick Add
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("basic")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "basic" 
              ? "border-[#20364D] text-[#20364D]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          data-testid="tab-basic"
        >
          Basic Catalog ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("listings")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "listings" 
              ? "border-[#20364D] text-[#20364D]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          data-testid="tab-listings"
        >
          Rich Listings ({listings.length})
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8">
            <h2 className="text-2xl font-bold mb-6">
              {editItem ? "Edit Item" : "Add Catalog Item"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.source_type}
                    onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                    data-testid="item-type-select"
                  >
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
                  <input
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    required
                    disabled={!!editItem}
                    data-testid="item-sku-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  data-testid="item-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  data-testid="item-description-input"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g., promotional, stationery"
                    data-testid="item-category-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Price (Your price to Konekt) *</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.base_partner_price}
                    onChange={(e) => setForm({ ...form, base_partner_price: e.target.value })}
                    required
                    data-testid="item-price-input"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Allocated Qty</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.partner_available_qty}
                    onChange={(e) => setForm({ ...form, partner_available_qty: e.target.value })}
                    data-testid="item-qty-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.partner_status}
                    onChange={(e) => setForm({ ...form, partner_status: e.target.value })}
                    data-testid="item-status-select"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.lead_time_days}
                    onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
                    data-testid="item-leadtime-input"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Order Qty</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.min_order_qty}
                    onChange={(e) => setForm({ ...form, min_order_qty: e.target.value })}
                    data-testid="item-moq-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <input
                    className="w-full border rounded-xl px-4 py-3"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="piece, box, kg"
                    data-testid="item-unit-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Regions (comma-separated)</label>
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  value={form.regions}
                  onChange={(e) => setForm({ ...form, regions: e.target.value })}
                  placeholder="Dar es Salaam, Arusha, Mwanza"
                  data-testid="item-regions-input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border px-5 py-3 font-semibold hover:bg-slate-50"
                  data-testid="cancel-item-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68]"
                  data-testid="save-item-btn"
                >
                  {editItem ? "Update Item" : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Catalog Items Grid */}
      {loading ? (
        <div className="text-slate-500">Loading catalog...</div>
      ) : activeTab === "basic" ? (
        items.length === 0 ? (
          <div className="rounded-3xl border bg-white p-8 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600">No items yet</h3>
            <p className="text-slate-500 mt-1">Add your first catalog item to get started</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border bg-white p-6"
                data-testid={`catalog-item-${item.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xl font-bold text-[#20364D]">{item.name}</div>
                    <div className="text-sm text-slate-500 mt-1">{item.sku}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.partner_status)}`}>
                    {(item.partner_status || "").replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <div className="text-slate-500">Base Price</div>
                    <div className="font-semibold">TZS {Number(item.base_partner_price || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Allocated Qty</div>
                    <div className="font-semibold">{item.partner_available_qty || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Lead Time</div>
                    <div className="font-semibold">{item.lead_time_days || 0} days</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Category</div>
                    <div className="font-semibold capitalize">{item.category || "-"}</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                    data-testid={`edit-item-${item.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    data-testid={`delete-item-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Rich Listings Tab */
        listings.length === 0 ? (
          <div className="rounded-3xl border bg-white p-8 text-center">
            <FileEdit className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600">No rich listings yet</h3>
            <p className="text-slate-500 mt-1 mb-4">Create detailed product/service listings with images and documents</p>
            <button
              onClick={() => navigate("/partner/catalog/new")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a68] transition"
            >
              <Plus className="w-5 h-5" />
              Create Rich Listing
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="rounded-3xl border bg-white overflow-hidden"
                data-testid={`listing-${listing.id}`}
              >
                {/* Image */}
                <div className="aspect-video bg-slate-100 relative">
                  {listing.hero_image || listing.images?.[0] ? (
                    <img 
                      src={listing.hero_image || listing.images[0]} 
                      alt={listing.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {getApprovalBadge(listing.approval_status)}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold text-[#20364D]">{listing.name}</div>
                      <div className="text-sm text-slate-500">{listing.sku}</div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                    {listing.short_description || listing.description || "No description"}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <div>
                      <span className="text-slate-500">Price: </span>
                      <span className="font-medium">TZS {Number(listing.base_partner_price || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Type: </span>
                      <span className="font-medium capitalize">{listing.listing_type}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={() => navigate(`/partner/catalog/${listing.id}/edit`)}
                      className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                      data-testid={`edit-listing-${listing.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    {listing.slug && listing.approval_status === "published" && (
                      <Link
                        to={`/marketplace/${listing.slug}`}
                        target="_blank"
                        className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
