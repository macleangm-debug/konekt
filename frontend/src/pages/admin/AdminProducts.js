import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useConfirmModal } from '../../contexts/ConfirmModalContext';
import { 
  Search, Plus, Edit, Trash2, Package, ChevronLeft, ChevronRight,
  Image, DollarSign, Layers, Tag, Save, X as XIcon
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper: format TZS currency
const fmtTZS = (n) => `TZS ${(Number(n) || 0).toLocaleString()}`;

// ─── InlinePriceOverride ─────────────────────────────────────────────────
// Compact inline editor for per-product price overrides. Supports:
//   • Fixed price (replace customer_price)
//   • % discount on tier-calculated base
//   • Clear override (revert to pricing engine)
function InlinePriceOverride({ product, onSaved }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(product.customer_price_override ? product.price_override_mode : "percentage_off");
  const [value, setValue] = useState(product.price_override_value || "");
  const [reason, setReason] = useState(product.price_override_reason || "");
  const [saving, setSaving] = useState(false);

  const basePrice = Number(product.base_price || 0);
  const previewPrice =
    mode === "fixed"
      ? Math.round(Number(value) || 0)
      : mode === "percentage_off"
      ? Math.round(basePrice * (1 - (Number(value) || 0) / 100))
      : basePrice;

  const apply = async (chosenMode) => {
    const finalMode = chosenMode || mode;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/api/admin/products/${product.id}/price-override`,
        { mode: finalMode, value: finalMode === "clear" ? null : Number(value), reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(finalMode === "clear" ? "Override cleared" : "Price override applied");
      onSaved?.({
        customer_price: res.data.final_customer_price,
        customer_price_override: res.data.override?.mode ? res.data.final_customer_price : null,
        price_override_mode: res.data.override?.mode || null,
        price_override_value: res.data.override?.value || null,
        price_override_reason: reason,
      });
      setOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid={`open-price-override-${product.id}`}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
      >
        <Tag className="w-3.5 h-3.5" />
        {product.customer_price_override ? "Edit price override" : "Set price override"}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/30 p-3 space-y-2" data-testid={`price-override-editor-${product.id}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("percentage_off")}
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition ${mode === "percentage_off" ? "bg-primary text-white" : "bg-white text-slate-600"}`}
          data-testid={`mode-percent-${product.id}`}
        >
          % Off
        </button>
        <button
          onClick={() => setMode("fixed")}
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition ${mode === "fixed" ? "bg-primary text-white" : "bg-white text-slate-600"}`}
          data-testid={`mode-fixed-${product.id}`}
        >
          Fixed TZS
        </button>
      </div>
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === "percentage_off" ? "e.g. 15" : "e.g. 25,000"}
        className="h-8 text-xs"
        data-testid={`override-value-${product.id}`}
      />
      <Input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="h-8 text-xs"
        data-testid={`override-reason-${product.id}`}
      />
      <div className="text-[11px] text-slate-600 bg-white rounded-md px-2 py-1.5 flex items-center justify-between">
        <span>Base (engine): <span className="font-semibold">{fmtTZS(basePrice)}</span></span>
        <span>Final: <span className="font-bold text-primary">{fmtTZS(previewPrice)}</span></span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => apply()}
          disabled={saving || !value}
          className="flex-1 h-8 text-xs"
          data-testid={`save-override-${product.id}`}
        >
          <Save className="w-3.5 h-3.5 mr-1" /> Apply
        </Button>
        {product.customer_price_override && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => apply("clear")}
            disabled={saving}
            className="h-8 text-xs"
            data-testid={`clear-override-${product.id}`}
          >
            Clear
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 text-xs">
          <XIcon className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}



// Branch and category structure
const branchCategories = {
  'Promotional Materials': ['Apparel', 'Drinkware', 'Stationery', 'Signage'],
  'Office Equipment': ['Tech Accessories', 'Desk Organizers', 'Office Supplies'],
  'KonektSeries': ['Caps', 'Hats', 'Shorts', 'T-Shirts', 'Accessories']
};

const defaultProduct = {
  name: '',
  branch: '',
  category: '',
  description: '',
  base_price: 0,
  image_url: '',
  sizes: [],
  colors: [],
  print_methods: [],
  min_quantity: 1,
  stock_quantity: 0,
  is_customizable: true
};

export default function AdminProducts() {
  const { confirmAction } = useConfirmModal();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(defaultProduct);
  const [saving, setSaving] = useState(false);
  
  const [sizesInput, setSizesInput] = useState('');
  const [printMethodsInput, setPrintMethodsInput] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [page, branchFilter, categoryFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (branchFilter && branchFilter !== 'all') params.append('branch', branchFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API_URL}/api/admin/products?${params}`);
      setProducts(response.data.products || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
      setBranches(response.data.branches || []);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const openAddModal = () => {
    setFormData(defaultProduct);
    setSizesInput('');
    setPrintMethodsInput('');
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setFormData(product);
    setSizesInput(product.sizes?.join(', ') || '');
    setPrintMethodsInput(product.print_methods?.join(', ') || '');
    setEditMode(true);
    setShowModal(true);
  };

  const handleBranchChange = (branch) => {
    setFormData({
      ...formData, 
      branch, 
      category: '',
      // Auto-set is_customizable based on branch
      is_customizable: branch !== 'KonektSeries'
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.branch || !formData.category || !formData.base_price) {
      toast.error('Please fill in required fields (Name, Branch, Category, Price)');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        ...formData,
        sizes: sizesInput.split(',').map(s => s.trim()).filter(Boolean),
        print_methods: printMethodsInput.split(',').map(s => s.trim()).filter(Boolean),
        is_customizable: formData.is_customizable !== false
      };
      
      if (editMode) {
        await axios.put(`${API_URL}/api/admin/products/${formData.id}`, data);
        toast.success('Product updated');
      } else {
        await axios.post(`${API_URL}/api/admin/products`, data);
        toast.success('Product created');
      }
      
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    confirmAction({
      title: "Delete Product?",
      message: "This product will be permanently removed from the catalog.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/admin/products/${productId}`);
          toast.success('Product deleted');
          fetchProducts();
        } catch (error) {
          console.error('Failed to delete product:', error);
          toast.error('Failed to delete product');
        }
      },
    });
  };

  // Get available categories based on selected branch
  const availableCategories = formData.branch ? branchCategories[formData.branch] || [] : [];

  return (
    <div className="space-y-6" data-testid="admin-products">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog across all branches</p>
        </div>
        <Button onClick={openAddModal} className="rounded-full" data-testid="add-product-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          
          <Select value={branchFilter || 'all'} onValueChange={(v) => { setBranchFilter(v); setCategoryFilter('all'); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {Object.keys(branchCategories).map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {branchFilter && branchFilter !== 'all' && (
            <Select value={categoryFilter || 'all'} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {branchCategories[branchFilter]?.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-40 bg-slate-100 rounded-xl mb-4" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first product</p>
            <Button onClick={openAddModal}>Add Product</Button>
          </div>
        ) : (
          products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden group"
              data-testid={`product-card-${product.id}`}
            >
              <div className="relative">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-40 object-cover"
                />
                {!product.is_active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="destructive">Inactive</Badge>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <Badge className={product.branch === 'KonektSeries' ? 'bg-secondary' : 'bg-primary'}>
                    {product.branch}
                  </Badge>
                  <Badge variant="outline" className="bg-white/90 text-xs">{product.category}</Badge>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button size="icon" variant="secondary" onClick={() => openEditModal(product)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-primary truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Marketplace Price</p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-bold text-primary">{fmtTZS(product.customer_price || product.base_price)}</p>
                      {product.customer_price_override && (
                        <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Override</span>
                      )}
                    </div>
                    {product.vendor_cost ? (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        vendor cost: {fmtTZS(product.vendor_cost)}
                        {product.pricing_total_margin_pct ? ` · ${product.pricing_total_margin_pct}% margin` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {product.is_customizable ? 'Customizable' : 'Ready-to-Buy'}
                    </p>
                    <p className="font-medium">{product.stock_quantity || 0} in stock</p>
                  </div>
                </div>
                {/* Inline price override controls */}
                <InlinePriceOverride
                  product={product}
                  onSaved={(updated) => {
                    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...updated } : p)));
                  }}
                />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm px-4">Page {page} of {pages}</span>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Product Name */}
            <div>
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Classic Cotton T-Shirt"
                className="mt-1"
                data-testid="product-name-input"
              />
            </div>
            
            {/* Branch & Category - Hierarchical */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Branch (Main Category) *</Label>
                <Select 
                  value={formData.branch} 
                  onValueChange={handleBranchChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(branchCategories).map((branch) => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category (Sub-Category) *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                  disabled={!formData.branch}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={formData.branch ? "Select category" : "Select branch first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Product description..."
                className="mt-1"
              />
            </div>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Base Price (TZS) *</Label>
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Min Quantity</Label>
                <Input
                  type="number"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({...formData, min_quantity: parseInt(e.target.value) || 1})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label>Image URL</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://..."
                className="mt-1"
              />
              {formData.image_url && (
                <img src={formData.image_url} alt="Preview" className="mt-2 h-32 object-cover rounded-lg" />
              )}
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Sizes (comma-separated)</Label>
                <Input
                  value={sizesInput}
                  onChange={(e) => setSizesInput(e.target.value)}
                  placeholder="S, M, L, XL, XXL"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Print Methods (comma-separated)</Label>
                <Input
                  value={printMethodsInput}
                  onChange={(e) => setPrintMethodsInput(e.target.value)}
                  placeholder="Screen Print, DTG, Embroidery"
                  className="mt-1"
                  disabled={formData.branch === 'KonektSeries'}
                />
                {formData.branch === 'KonektSeries' && (
                  <p className="text-xs text-muted-foreground mt-1">Not applicable for KonektSeries products</p>
                )}
              </div>
            </div>
            
            {editMode && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">Product is visible to customers</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label>Customizable Product</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.is_customizable !== false 
                    ? 'Customers can add their logo/design' 
                    : 'Ready-to-buy item (no customization)'}
                </p>
              </div>
              <Switch
                checked={formData.is_customizable !== false}
                onCheckedChange={(checked) => setFormData({...formData, is_customizable: checked})}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1" data-testid="save-product-btn">
                {saving ? 'Saving...' : (editMode ? 'Update Product' : 'Create Product')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
