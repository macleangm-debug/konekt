import React, { useEffect, useState } from "react";
import { Plus, Edit2, Loader2, Building2, User, Calendar, CreditCard, Save, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ContractClientsPage() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("admin_token");

  const [form, setForm] = useState({
    customer_id: "",
    company_name: "",
    tier: "standard",
    account_manager_email: "",
    payment_terms_days: "30",
    credit_limit: "0",
    contract_start_date: "",
    contract_end_date: "",
    currency: "TZS",
    is_active: true,
    notes: "",
  });

  const loadData = async () => {
    try {
      const [itemsRes, customersRes] = await Promise.all([
        fetch(`${API}/api/admin/contract-clients`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (client = null) => {
    if (client) {
      setEditing(client);
      setForm({
        customer_id: client.customer_id || "",
        company_name: client.company_name || "",
        tier: client.tier || "standard",
        account_manager_email: client.account_manager_email || "",
        payment_terms_days: String(client.payment_terms_days || 30),
        credit_limit: String(client.credit_limit || 0),
        contract_start_date: client.contract_start_date?.split("T")[0] || "",
        contract_end_date: client.contract_end_date?.split("T")[0] || "",
        currency: client.currency || "TZS",
        is_active: client.is_active !== false,
        notes: client.notes || "",
      });
    } else {
      setEditing(null);
      setForm({
        customer_id: "",
        company_name: "",
        tier: "standard",
        account_manager_email: "",
        payment_terms_days: "30",
        credit_limit: "0",
        contract_start_date: "",
        contract_end_date: "",
        currency: "TZS",
        is_active: true,
        notes: "",
      });
    }
    setShowModal(true);
  };

  const saveClient = async () => {
    if (!form.customer_id) {
      toast.error("Please select a customer");
      return;
    }

    setSaving(true);
    try {
      const url = editing 
        ? `${API}/api/admin/contract-clients/${editing.id}`
        : `${API}/api/admin/contract-clients`;
      
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          payment_terms_days: parseInt(form.payment_terms_days) || 30,
          credit_limit: parseFloat(form.credit_limit) || 0,
        }),
      });

      if (res.ok) {
        toast.success(editing ? "Contract client updated" : "Contract client created");
        setShowModal(false);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save");
      }
    } catch (error) {
      toast.error("Failed to save contract client");
    } finally {
      setSaving(false);
    }
  };

  const getTierBadge = (tier) => {
    const colors = {
      standard: "bg-slate-100 text-slate-700",
      premium: "bg-blue-100 text-blue-700",
      strategic: "bg-purple-100 text-purple-700",
    };
    return colors[tier] || colors.standard;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="contract-clients-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contract Clients</h1>
          <p className="text-slate-500">Manage contract customers, tiers, and commercial terms.</p>
        </div>
        <Button onClick={() => openModal()} data-testid="add-contract-client-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Contract Client
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Total Contracts</div>
          <div className="text-3xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Strategic Tier</div>
          <div className="text-3xl font-bold mt-1 text-purple-600">
            {items.filter(i => i.tier === "strategic").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Premium Tier</div>
          <div className="text-3xl font-bold mt-1 text-blue-600">
            {items.filter(i => i.tier === "premium").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Total Credit Limit</div>
          <div className="text-2xl font-bold mt-1">
            TZS {items.reduce((s, i) => s + (i.credit_limit || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Client Directory */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="font-semibold text-slate-800">Contract Client Directory</h2>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No contract clients yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="rounded-2xl border bg-slate-50 p-4 hover:shadow-md transition"
                data-testid={`contract-client-${item.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-[#20364D]">{item.company_name || item.customer_name}</div>
                    <div className="text-sm text-slate-500 mt-1">{item.customer_email}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadge(item.tier)}`}>
                    {item.tier}
                  </span>
                </div>
                
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CreditCard className="w-4 h-4" />
                    <span>Credit: {item.currency} {(item.credit_limit || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>Terms: {item.payment_terms_days} days</span>
                  </div>
                  {item.account_manager_email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-4 h-4" />
                      <span>{item.account_manager_email}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => openModal(item)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Contract Client" : "Add Contract Client"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer *</label>
                <Select
                  value={form.customer_id}
                  onValueChange={(val) => setForm({ ...form, customer_id: val })}
                  disabled={!!editing}
                >
                  <SelectTrigger data-testid="customer-select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name || c.name || c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Company name"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tier</label>
                <Select
                  value={form.tier}
                  onValueChange={(val) => setForm({ ...form, tier: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="strategic">Strategic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Manager Email</label>
                <Input
                  value={form.account_manager_email}
                  onChange={(e) => setForm({ ...form, account_manager_email: e.target.value })}
                  placeholder="manager@konekt.co.tz"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Terms (days)</label>
                <Input
                  type="number"
                  value={form.payment_terms_days}
                  onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Credit Limit</label>
                <Input
                  type="number"
                  value={form.credit_limit}
                  onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
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
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contract Start Date</label>
                <Input
                  type="date"
                  value={form.contract_start_date}
                  onChange={(e) => setForm({ ...form, contract_start_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Contract End Date</label>
                <Input
                  type="date"
                  value={form.contract_end_date}
                  onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes about this contract client..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveClient} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
