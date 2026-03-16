import React, { useEffect, useState } from "react";
import { Plus, Loader2, Receipt, Play, Pause, Save, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function RecurringInvoicePlansPage() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(null);

  const token = localStorage.getItem("admin_token");

  const [form, setForm] = useState({
    customer_id: "",
    company_name: "",
    plan_name: "Monthly Retainer",
    frequency: "monthly",
    currency: "TZS",
    start_date: "",
    next_run_date: "",
    payment_terms_days: "30",
    invoice_items_json: '[{"description": "Monthly support retainer", "amount": 100000, "quantity": 1}]',
    status: "active",
  });

  const loadData = async () => {
    try {
      const [itemsRes, customersRes] = await Promise.all([
        fetch(`${API}/api/admin/recurring-invoices/plans`, {
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

  const savePlan = async () => {
    if (!form.customer_id) {
      toast.error("Please select a customer");
      return;
    }

    let invoiceItems;
    try {
      invoiceItems = JSON.parse(form.invoice_items_json);
    } catch {
      toast.error("Invalid invoice items JSON");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/recurring-invoices/plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          invoice_items: invoiceItems,
          payment_terms_days: parseInt(form.payment_terms_days) || 30,
        }),
      });

      if (res.ok) {
        toast.success("Recurring invoice plan created");
        setShowModal(false);
        loadData();
      } else {
        toast.error("Failed to create plan");
      }
    } catch (error) {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const generateInvoice = async (planId) => {
    setGenerating(planId);
    try {
      const res = await fetch(`${API}/api/admin/recurring-invoices/plans/${planId}/generate-now`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success("Invoice generated successfully");
        loadData();
      } else {
        toast.error("Failed to generate invoice");
      }
    } catch (error) {
      toast.error("Failed to generate invoice");
    } finally {
      setGenerating(null);
    }
  };

  const toggleStatus = async (planId, currentStatus) => {
    const action = currentStatus === "active" ? "pause" : "resume";
    try {
      const res = await fetch(`${API}/api/admin/recurring-invoices/plans/${planId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success(`Plan ${action}d`);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to update plan");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-700",
      paused: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || colors.active;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="recurring-invoices-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recurring Invoice Plans</h1>
          <p className="text-slate-500">Set up recurring billing schedules for contract clients.</p>
        </div>
        <Button onClick={() => setShowModal(true)} data-testid="add-plan-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Recurring Plan
        </Button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Total Plans</div>
          <div className="text-3xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Active Plans</div>
          <div className="text-3xl font-bold mt-1 text-green-600">
            {items.filter(i => i.status === "active").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Total Generated</div>
          <div className="text-3xl font-bold mt-1">
            {items.reduce((s, i) => s + (i.run_count || 0), 0)}
          </div>
        </div>
      </div>

      {/* Plans List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="font-semibold text-slate-800">Recurring Plans</h2>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recurring invoice plans yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="p-4 hover:bg-slate-50 transition"
                data-testid={`plan-${item.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {item.company_name || item.customer_name}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {item.plan_name} • {item.frequency} • {item.currency}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      Generated {item.run_count || 0} times
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateInvoice(item.id)}
                    disabled={generating === item.id}
                  >
                    {generating === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Receipt className="w-4 h-4 mr-1" />
                        Generate Now
                      </>
                    )}
                  </Button>
                  
                  {item.status !== "cancelled" && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleStatus(item.id, item.status)}
                    >
                      {item.status === "active" ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </>
                      )}
                    </Button>
                  )}
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
            <DialogTitle>Add Recurring Invoice Plan</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer *</label>
              <Select
                value={form.customer_id}
                onValueChange={(val) => setForm({ ...form, customer_id: val })}
              >
                <SelectTrigger>
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Name</label>
                <Input
                  value={form.plan_name}
                  onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                  placeholder="Monthly Retainer"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Frequency</label>
                <Select
                  value={form.frequency}
                  onValueChange={(val) => setForm({ ...form, frequency: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Terms (days)</label>
                <Input
                  type="number"
                  value={form.payment_terms_days}
                  onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
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
                <label className="text-sm font-medium">Next Run Date</label>
                <Input
                  type="date"
                  value={form.next_run_date}
                  onChange={(e) => setForm({ ...form, next_run_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Items (JSON)</label>
              <Textarea
                value={form.invoice_items_json}
                onChange={(e) => setForm({ ...form, invoice_items_json: e.target.value })}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Format: [&#123;"description": "Item", "amount": 100000, "quantity": 1&#125;]
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={savePlan} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
