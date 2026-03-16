import React, { useEffect, useState } from "react";
import { Plus, Loader2, DollarSign, Percent, Save, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function NegotiatedPricingPage() {
  const [items, setItems] = useState([]);
  const [contractClients, setContractClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("admin_token");

  const [form, setForm] = useState({
    customer_id: "",
    pricing_scope: "sku",
    sku: "",
    service_key: "",
    category: "",
    price_type: "fixed",
    price_value: "",
    currency: "TZS",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [itemsRes, clientsRes] = await Promise.all([
        fetch(`${API}/api/admin/negotiated-pricing`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/contract-clients`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (clientsRes.ok) setContractClients(await clientsRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveRule = async () => {
    if (!form.customer_id) {
      toast.error("Please select a contract client");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/negotiated-pricing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          price_value: parseFloat(form.price_value) || 0,
        }),
      });

      if (res.ok) {
        toast.success("Pricing rule created");
        setShowModal(false);
        setForm({
          customer_id: "",
          pricing_scope: "sku",
          sku: "",
          service_key: "",
          category: "",
          price_type: "fixed",
          price_value: "",
          currency: "TZS",
          start_date: "",
          end_date: "",
          is_active: true,
        });
        loadData();
      } else {
        toast.error("Failed to create pricing rule");
      }
    } catch (error) {
      toast.error("Failed to save pricing rule");
    } finally {
      setSaving(false);
    }
  };

  const getClientName = (customerId) => {
    const client = contractClients.find(c => c.customer_id === customerId);
    return client?.company_name || client?.customer_name || customerId;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="negotiated-pricing-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Negotiated Pricing</h1>
          <p className="text-slate-500">Apply customer-specific pricing rules for products, services, and categories.</p>
        </div>
        <Button onClick={() => setShowModal(true)} data-testid="add-pricing-rule-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Pricing Rule
        </Button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Total Rules</div>
          <div className="text-3xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Fixed Price Rules</div>
          <div className="text-3xl font-bold mt-1">
            {items.filter(i => i.price_type === "fixed").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Discount Rules</div>
          <div className="text-3xl font-bold mt-1">
            {items.filter(i => i.price_type === "discount_percent").length}
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="font-semibold text-slate-800">Pricing Rules</h2>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pricing rules yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="p-4 hover:bg-slate-50 transition"
                data-testid={`pricing-rule-${item.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {getClientName(item.customer_id)}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Scope: {item.pricing_scope} • {item.sku || item.service_key || item.category || "All"}
                    </div>
                  </div>
                  <div className="text-right">
                    {item.price_type === "fixed" ? (
                      <div className="flex items-center gap-1 text-green-600 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        {item.currency} {item.price_value?.toLocaleString()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-blue-600 font-semibold">
                        <Percent className="w-4 h-4" />
                        {item.price_value}% off
                      </div>
                    )}
                    {!item.is_active && (
                      <span className="text-xs text-slate-400">Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Pricing Rule</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contract Client *</label>
              <Select
                value={form.customer_id}
                onValueChange={(val) => setForm({ ...form, customer_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract client" />
                </SelectTrigger>
                <SelectContent>
                  {contractClients.map((c) => (
                    <SelectItem key={c.id} value={c.customer_id}>
                      {c.company_name || c.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pricing Scope</label>
                <Select
                  value={form.pricing_scope}
                  onValueChange={(val) => setForm({ ...form, pricing_scope: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sku">SKU</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Type</label>
                <Select
                  value={form.price_type}
                  onValueChange={(val) => setForm({ ...form, price_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="discount_percent">Discount %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {form.pricing_scope === "sku" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">SKU</label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="Product SKU"
                />
              </div>
            )}
            
            {form.pricing_scope === "service" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Service Key</label>
                <Input
                  value={form.service_key}
                  onChange={(e) => setForm({ ...form, service_key: e.target.value })}
                  placeholder="e.g., business_cards"
                />
              </div>
            )}
            
            {form.pricing_scope === "category" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g., printing"
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {form.price_type === "fixed" ? "Price" : "Discount %"}
                </label>
                <Input
                  type="number"
                  value={form.price_value}
                  onChange={(e) => setForm({ ...form, price_value: e.target.value })}
                  placeholder={form.price_type === "fixed" ? "Price" : "Percentage"}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveRule} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
