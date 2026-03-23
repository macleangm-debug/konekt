import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Pencil, Trash2, Package, Wrench } from "lucide-react";

export default function AdminCatalogSetupPage() {
  const [activeTab, setActiveTab] = useState("services");
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalType, setModalType] = useState("service");

  const loadData = async () => {
    setLoading(true);
    try {
      const [svcRes, prodRes] = await Promise.all([
        api.get("/api/admin/catalog/services"),
        api.get("/api/admin/catalog/products"),
      ]);
      setServices(svcRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error("Failed to load catalog", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (type) => {
    setModalType(type);
    setEditItem(null);
    setShowModal(true);
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditItem(item);
    setShowModal(true);
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(`/api/admin/catalog/${type}s/${id}`);
      toast.success("Item deleted successfully");
      loadData();
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  return (
    <div className="space-y-8" data-testid="catalog-setup-page">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-4xl font-bold text-[#20364D]">Catalog Setup</div>
          <div className="text-slate-600 mt-2">
            Manage your Services and Products catalog. This is the single source of truth for all dropdowns and listings.
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="services" className="flex items-center gap-2" data-testid="services-tab">
            <Wrench className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2" data-testid="products-tab">
            <Package className="w-4 h-4" />
            Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="rounded-[2rem] border bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xl font-bold text-[#20364D]">Services Catalog</div>
              <button
                onClick={() => openAddModal("service")}
                className="flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-2 font-medium"
                data-testid="add-service-btn"
              >
                <Plus className="w-4 h-4" /> Add Service
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No services yet. Add your first service to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <div className="font-medium text-[#20364D]">{svc.name}</div>
                      <div className="text-sm text-slate-500">
                        {svc.category} • {svc.sub_services?.length || 0} sub-services
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal("service", svc)}
                        className="p-2 rounded-lg hover:bg-slate-200"
                        data-testid={`edit-service-${svc.id}`}
                      >
                        <Pencil className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete("service", svc.id)}
                        className="p-2 rounded-lg hover:bg-red-100"
                        data-testid={`delete-service-${svc.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="rounded-[2rem] border bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xl font-bold text-[#20364D]">Products Catalog</div>
              <button
                onClick={() => openAddModal("product")}
                className="flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-2 font-medium"
                data-testid="add-product-btn"
              >
                <Plus className="w-4 h-4" /> Add Product Category
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No product categories yet. Add your first category to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <div className="font-medium text-[#20364D]">{prod.name}</div>
                      <div className="text-sm text-slate-500">
                        {prod.category} • {prod.variants?.length || 0} variants
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal("product", prod)}
                        className="p-2 rounded-lg hover:bg-slate-200"
                        data-testid={`edit-product-${prod.id}`}
                      >
                        <Pencil className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete("product", prod.id)}
                        className="p-2 rounded-lg hover:bg-red-100"
                        data-testid={`delete-product-${prod.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Modal */}
      {showModal && (
        <CatalogItemModal
          type={modalType}
          item={editItem}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function CatalogItemModal({ type, item, onClose, onSave }) {
  const isEdit = !!item;
  const [form, setForm] = useState(
    item || {
      name: "",
      category: "",
      description: "",
      sub_services: [],
      variants: [],
      status: "active",
    }
  );
  const [subInput, setSubInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/admin/catalog/${type}s/${item.id}`, form);
        toast.success(`${type === "service" ? "Service" : "Product"} updated successfully`);
      } else {
        await api.post(`/api/admin/catalog/${type}s`, form);
        toast.success(`${type === "service" ? "Service" : "Product"} created successfully`);
      }
      onSave();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addSubItem = () => {
    if (!subInput.trim()) return;
    if (type === "service") {
      setForm({ ...form, sub_services: [...(form.sub_services || []), { name: subInput.trim(), id: Date.now().toString() }] });
    } else {
      setForm({ ...form, variants: [...(form.variants || []), { name: subInput.trim(), id: Date.now().toString() }] });
    }
    setSubInput("");
  };

  const removeSubItem = (idx) => {
    if (type === "service") {
      setForm({ ...form, sub_services: form.sub_services.filter((_, i) => i !== idx) });
    } else {
      setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="text-xl font-bold text-[#20364D]">
            {isEdit ? "Edit" : "Add"} {type === "service" ? "Service" : "Product Category"}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Name *</div>
            <input
              type="text"
              className="w-full border rounded-xl px-4 py-3"
              placeholder={type === "service" ? "e.g., Garment Printing" : "e.g., T-Shirts"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="item-name-input"
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Category</div>
            <input
              type="text"
              className="w-full border rounded-xl px-4 py-3"
              placeholder={type === "service" ? "e.g., Printing Services" : "e.g., Apparel"}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              data-testid="item-category-input"
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Description</div>
            <textarea
              className="w-full min-h-[80px] border rounded-xl px-4 py-3"
              placeholder="Brief description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              data-testid="item-description-input"
            />
          </label>

          {/* Sub-services or Variants */}
          <div>
            <div className="text-sm text-slate-500 mb-2">
              {type === "service" ? "Sub-services" : "Variants"}
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 border rounded-xl px-4 py-2"
                placeholder={type === "service" ? "Add sub-service..." : "Add variant..."}
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubItem()}
                data-testid="sub-item-input"
              />
              <button
                onClick={addSubItem}
                className="px-4 py-2 bg-slate-100 rounded-xl hover:bg-slate-200"
                data-testid="add-sub-item-btn"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(type === "service" ? form.sub_services : form.variants || []).map((sub, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {sub.name}
                  <button onClick={() => removeSubItem(idx)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>

          <label className="block">
            <div className="text-sm text-slate-500 mb-2">Status</div>
            <select
              className="w-full border rounded-xl px-4 py-3"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              data-testid="item-status-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border hover:bg-slate-50"
            data-testid="cancel-modal-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#20364D] text-white font-medium disabled:opacity-50"
            data-testid="save-item-btn"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
