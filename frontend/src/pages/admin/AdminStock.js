import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, AlertTriangle, TrendingUp, TrendingDown, Search, 
  ArrowUpDown, Filter, Edit, Save, X, Loader2, RefreshCw,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminStock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out, ok
  const [sortBy, setSortBy] = useState('stock_asc'); // stock_asc, stock_desc, name
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState({ quantity: 0, reason: '', type: 'add' });
  const [saving, setSaving] = useState(false);
  
  // Stock statistics
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    healthy: 0
  });

  const LOW_STOCK_THRESHOLD = 20;

  useEffect(() => {
    fetchProducts();
  }, [branchFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter && branchFilter !== 'all') params.append('branch', branchFilter);
      
      const response = await axios.get(`${API_URL}/api/admin/products?${params}&limit=100`);
      const prods = response.data.products || [];
      setProducts(prods);
      
      // Calculate stats
      const lowStock = prods.filter(p => p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD).length;
      const outOfStock = prods.filter(p => p.stock_quantity === 0).length;
      const healthy = prods.filter(p => p.stock_quantity > LOW_STOCK_THRESHOLD).length;
      
      setStats({
        total: prods.length,
        lowStock,
        outOfStock,
        healthy
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async () => {
    if (!editingProduct) return;
    
    setSaving(true);
    try {
      const newQuantity = stockAdjustment.type === 'add' 
        ? editingProduct.stock_quantity + parseInt(stockAdjustment.quantity)
        : stockAdjustment.type === 'remove'
          ? Math.max(0, editingProduct.stock_quantity - parseInt(stockAdjustment.quantity))
          : parseInt(stockAdjustment.quantity); // set
      
      await axios.put(`${API_URL}/api/admin/products/${editingProduct.id}`, {
        stock_quantity: newQuantity
      });
      
      toast.success(`Stock updated for ${editingProduct.name}`);
      setEditingProduct(null);
      setStockAdjustment({ quantity: 0, reason: '', type: 'add' });
      fetchProducts();
    } catch (error) {
      console.error('Failed to update stock:', error);
      toast.error('Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (stockFilter === 'low' && (p.stock_quantity === 0 || p.stock_quantity > LOW_STOCK_THRESHOLD)) return false;
      if (stockFilter === 'out' && p.stock_quantity > 0) return false;
      if (stockFilter === 'ok' && p.stock_quantity <= LOW_STOCK_THRESHOLD) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'stock_asc') return a.stock_quantity - b.stock_quantity;
      if (sortBy === 'stock_desc') return b.stock_quantity - a.stock_quantity;
      return a.name.localeCompare(b.name);
    });

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    if (quantity <= LOW_STOCK_THRESHOLD) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700', icon: CheckCircle };
  };

  return (
    <div className="space-y-6" data-testid="admin-stock">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Stock Management</h1>
          <p className="text-muted-foreground">Monitor and manage inventory levels</p>
        </div>
        <Button onClick={fetchProducts} variant="outline" className="rounded-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-3xl font-bold text-primary">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Healthy Stock</p>
              <p className="text-3xl font-bold text-green-600">{stats.healthy}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="Promotional Materials">Promotional Materials</SelectItem>
              <SelectItem value="Office Equipment">Office Equipment</SelectItem>
              <SelectItem value="KonektSeries">KonektSeries</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ok">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock_asc">Stock: Low to High</SelectItem>
              <SelectItem value="stock_desc">Stock: High to Low</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">Loading inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Branch</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Category</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">Stock</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product.stock_quantity);
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={product.id} className="hover:bg-slate-50" data-testid={`stock-row-${product.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-medium text-primary">{product.name}</p>
                            <p className="text-xs text-muted-foreground">TZS {product.base_price?.toLocaleString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{product.branch}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{product.category}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-2xl font-bold ${
                          product.stock_quantity === 0 ? 'text-red-600' :
                          product.stock_quantity <= LOW_STOCK_THRESHOLD ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingProduct(product);
                            setStockAdjustment({ quantity: 0, reason: '', type: 'add' });
                          }}
                          data-testid={`edit-stock-${product.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Update
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Update Modal */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <img 
                  src={editingProduct.image_url} 
                  alt={editingProduct.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <p className="font-bold text-primary">{editingProduct.name}</p>
                  <p className="text-sm text-muted-foreground">{editingProduct.branch} / {editingProduct.category}</p>
                  <p className="text-lg font-bold mt-1">Current Stock: <span className="text-primary">{editingProduct.stock_quantity}</span></p>
                </div>
              </div>
              
              {/* Adjustment Type */}
              <div>
                <Label>Adjustment Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { value: 'add', label: 'Add Stock', icon: TrendingUp },
                    { value: 'remove', label: 'Remove', icon: TrendingDown },
                    { value: 'set', label: 'Set Value', icon: Edit }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setStockAdjustment({...stockAdjustment, type: type.value})}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        stockAdjustment.type === type.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-slate-200 hover:border-primary/50'
                      }`}
                    >
                      <type.icon className={`w-5 h-5 mx-auto mb-1 ${
                        stockAdjustment.type === type.value ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Quantity */}
              <div>
                <Label>
                  {stockAdjustment.type === 'add' ? 'Quantity to Add' :
                   stockAdjustment.type === 'remove' ? 'Quantity to Remove' :
                   'New Stock Value'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, quantity: e.target.value})}
                  className="mt-1 text-2xl font-bold text-center h-16"
                  placeholder="0"
                />
                
                {/* Preview */}
                {stockAdjustment.quantity > 0 && (
                  <div className="mt-2 p-3 bg-primary/5 rounded-lg text-center">
                    <span className="text-sm text-muted-foreground">New stock will be: </span>
                    <span className="font-bold text-primary text-lg">
                      {stockAdjustment.type === 'add' 
                        ? editingProduct.stock_quantity + parseInt(stockAdjustment.quantity || 0)
                        : stockAdjustment.type === 'remove'
                          ? Math.max(0, editingProduct.stock_quantity - parseInt(stockAdjustment.quantity || 0))
                          : parseInt(stockAdjustment.quantity || 0)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Reason */}
              <div>
                <Label>Reason (optional)</Label>
                <Textarea
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, reason: e.target.value})}
                  placeholder="e.g., New shipment arrived, Inventory adjustment..."
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingProduct(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleStockUpdate}
                  disabled={saving || !stockAdjustment.quantity}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Stock
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
