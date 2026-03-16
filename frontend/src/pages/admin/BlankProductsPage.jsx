import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, Package, Save, X, Image } from "lucide-react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { adminServiceApi } from "../../lib/serviceCatalogApi";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";

const CATEGORIES = [
  { value: "apparel", label: "Apparel" },
  { value: "corporate_gifts", label: "Corporate Gifts" },
  { value: "display", label: "Display & Signage" },
  { value: "access_control", label: "Access Control" },
  { value: "stationery", label: "Stationery" },
  { value: "uniforms", label: "Uniforms & Workwear" },
];

const BRANDING_METHODS = [
  "Screen Print",
  "Embroidery",
  "Heat Transfer",
  "DTG Print",
  "Sublimation",
  "Laser Engraving",
  "UV Print",
  "Deboss",
  "Emboss",
];

export default function BlankProductsPage() {
  const { admin } = useAdminAuth();
  const token = localStorage.getItem("admin_token");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    subcategory: "",
    description: "",
    sizes: [],
    colors: [],
    materials: [],
    branding_methods: [],
    tailoring_supported: false,
    measurement_fields: [],
    base_cost: 0,
    min_order_qty: 1,
    lead_time_days: 3,
    images: [],
    is_active: true,
  });

  // Temp inputs for arrays
  const [sizeInput, setSizeInput] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [materialInput, setMaterialInput] = useState("");

  useEffect(() => {
    fetchProducts();
  }, [filterCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await adminServiceApi.getBlankProducts(token, filterCategory || null);
      setProducts(data);
    } catch (err) {
      toast.error("Failed to load blank products");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditing(product);
      setForm({
        name: product.name || "",
        sku: product.sku || "",
        category: product.category || "",
        subcategory: product.subcategory || "",
        description: product.description || "",
        sizes: product.sizes || [],
        colors: product.colors || [],
        materials: product.materials || [],
        branding_methods: product.branding_methods || [],
        tailoring_supported: product.tailoring_supported || false,
        measurement_fields: product.measurement_fields || [],
        base_cost: product.base_cost || 0,
        min_order_qty: product.min_order_qty || 1,
        lead_time_days: product.lead_time_days || 3,
        images: product.images || [],
        is_active: product.is_active !== false,
      });
    } else {
      setEditing(null);
      setForm({
        name: "",
        sku: "",
        category: "",
        subcategory: "",
        description: "",
        sizes: [],
        colors: [],
        materials: [],
        branding_methods: [],
        tailoring_supported: false,
        measurement_fields: [],
        base_cost: 0,
        min_order_qty: 1,
        lead_time_days: 3,
        images: [],
        is_active: true,
      });
    }
    setSizeInput("");
    setColorInput("");
    setMaterialInput("");
    setShowModal(true);
  };

  const saveProduct = async () => {
    if (!form.name || !form.category) {
      toast.error("Name and Category are required");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await adminServiceApi.updateBlankProduct(editing.id, form, token);
        toast.success("Product updated successfully");
      } else {
        await adminServiceApi.createBlankProduct(form, token);
        toast.success("Product created successfully");
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (!confirm("Delete this blank product? This cannot be undone.")) return;
    
    try {
      await adminServiceApi.deleteBlankProduct(productId, token);
      toast.success("Product deleted");
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addToArray = (field, value, setValue) => {
    if (value.trim() && !form[field].includes(value.trim())) {
      setForm({ ...form, [field]: [...form[field], value.trim()] });
      setValue("");
    }
  };

  const removeFromArray = (field, value) => {
    setForm({ ...form, [field]: form[field].filter(v => v !== value) });
  };

  const toggleBrandingMethod = (method) => {
    const current = form.branding_methods;
    if (current.includes(method)) {
      setForm({ ...form, branding_methods: current.filter(m => m !== method) });
    } else {
      setForm({ ...form, branding_methods: [...current, method] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="blank-products-admin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Blank Products</h1>
          <p className="text-slate-500">Manage promotional materials, uniforms, and workwear catalog</p>
        </div>
        <Button onClick={() => openModal()} data-testid="add-product-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select value={filterCategory || "all"} onValueChange={(val) => setFilterCategory(val === "all" ? "" : val)}>
              <SelectTrigger data-testid="filter-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-slate-500">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            No blank products found
          </div>
        ) : (
          products.map((product) => (
            <div 
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition"
              data-testid={`product-card-${product.id}`}
            >
              {product.images?.[0] ? (
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
                  <Image className="w-10 h-10 text-slate-300" />
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{product.name}</h3>
                    <p className="text-sm text-slate-500">{product.sku || "No SKU"}</p>
                  </div>
                  {!product.is_active && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs">Inactive</span>
                  )}
                </div>
                
                <div className="mt-2">
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                    {CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                  </span>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-1">
                  {product.sizes?.slice(0, 3).map((size) => (
                    <span key={size} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{size}</span>
                  ))}
                  {product.sizes?.length > 3 && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      +{product.sizes.length - 3}
                    </span>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-slate-500">Cost:</span>{" "}
                    <span className="font-medium">TZS {product.base_cost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openModal(product)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteProduct(product.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Product Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Blank Product" : "Add Blank Product"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Basic T-Shirt"
                  data-testid="product-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="TSH-001"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm({ ...form, category: val })}
                >
                  <SelectTrigger data-testid="product-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Input
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                  placeholder="Polo Shirts"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
              />
            </div>
            
            {/* Sizes */}
            <div className="space-y-2">
              <Label>Sizes</Label>
              <div className="flex gap-2">
                <Input
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                  placeholder="Add size (e.g., XL)"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("sizes", sizeInput, setSizeInput))}
                />
                <Button type="button" variant="outline" onClick={() => addToArray("sizes", sizeInput, setSizeInput)}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.sizes.map((size) => (
                  <span 
                    key={size}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm flex items-center gap-1"
                  >
                    {size}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray("sizes", size)} />
                  </span>
                ))}
              </div>
            </div>
            
            {/* Colors */}
            <div className="space-y-2">
              <Label>Colors</Label>
              <div className="flex gap-2">
                <Input
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  placeholder="Add color (e.g., Navy Blue)"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("colors", colorInput, setColorInput))}
                />
                <Button type="button" variant="outline" onClick={() => addToArray("colors", colorInput, setColorInput)}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.colors.map((color) => (
                  <span 
                    key={color}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm flex items-center gap-1"
                  >
                    {color}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray("colors", color)} />
                  </span>
                ))}
              </div>
            </div>
            
            {/* Materials */}
            <div className="space-y-2">
              <Label>Materials</Label>
              <div className="flex gap-2">
                <Input
                  value={materialInput}
                  onChange={(e) => setMaterialInput(e.target.value)}
                  placeholder="Add material (e.g., 100% Cotton)"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("materials", materialInput, setMaterialInput))}
                />
                <Button type="button" variant="outline" onClick={() => addToArray("materials", materialInput, setMaterialInput)}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.materials.map((material) => (
                  <span 
                    key={material}
                    className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm flex items-center gap-1"
                  >
                    {material}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray("materials", material)} />
                  </span>
                ))}
              </div>
            </div>
            
            {/* Branding Methods */}
            <div className="space-y-2">
              <Label>Branding Methods</Label>
              <div className="grid grid-cols-3 gap-2">
                {BRANDING_METHODS.map((method) => (
                  <div 
                    key={method}
                    className={`px-3 py-2 border rounded cursor-pointer text-sm transition ${
                      form.branding_methods.includes(method)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => toggleBrandingMethod(method)}
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Pricing & Logistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Base Cost (TZS)</Label>
                <Input
                  type="number"
                  value={form.base_cost}
                  onChange={(e) => setForm({ ...form, base_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Order Qty</Label>
                <Input
                  type="number"
                  value={form.min_order_qty}
                  onChange={(e) => setForm({ ...form, min_order_qty: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Lead Time (Days)</Label>
                <Input
                  type="number"
                  value={form.lead_time_days}
                  onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 3 })}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.tailoring_supported}
                  onCheckedChange={(checked) => setForm({ ...form, tailoring_supported: checked })}
                />
                <Label>Tailoring Supported</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveProduct} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
