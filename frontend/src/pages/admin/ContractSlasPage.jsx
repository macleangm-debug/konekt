import React, { useEffect, useState } from "react";
import { Plus, Loader2, Clock, Target, Save, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ContractSlasPage() {
  const [items, setItems] = useState([]);
  const [contractClients, setContractClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("admin_token");

  const [form, setForm] = useState({
    customer_id: "",
    service_key: "",
    response_time_hours: "24",
    quote_turnaround_hours: "48",
    delivery_target_days: "7",
    priority_level: "standard",
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [itemsRes, clientsRes] = await Promise.all([
        fetch(`${API}/api/admin/contract-slas`, {
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
      const res = await fetch(`${API}/api/admin/contract-slas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          response_time_hours: parseFloat(form.response_time_hours) || 24,
          quote_turnaround_hours: parseFloat(form.quote_turnaround_hours) || 48,
          delivery_target_days: parseFloat(form.delivery_target_days) || 7,
        }),
      });

      if (res.ok) {
        toast.success("SLA rule created");
        setShowModal(false);
        setForm({
          customer_id: "",
          service_key: "",
          response_time_hours: "24",
          quote_turnaround_hours: "48",
          delivery_target_days: "7",
          priority_level: "standard",
          is_active: true,
        });
        loadData();
      } else {
        toast.error("Failed to create SLA rule");
      }
    } catch (error) {
      toast.error("Failed to save SLA rule");
    } finally {
      setSaving(false);
    }
  };

  const getClientName = (customerId) => {
    const client = contractClients.find(c => c.customer_id === customerId);
    return client?.company_name || client?.customer_name || customerId;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      standard: "bg-slate-100 text-slate-700",
      premium: "bg-blue-100 text-blue-700",
      strategic: "bg-purple-100 text-purple-700",
    };
    return colors[priority] || colors.standard;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="contract-slas-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contract SLA Settings</h1>
          <p className="text-slate-500">Define response, quote, and delivery expectations for contract clients.</p>
        </div>
        <Button onClick={() => setShowModal(true)} data-testid="add-sla-rule-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add SLA Rule
        </Button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Total SLA Rules</div>
          <div className="text-3xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Strategic SLAs</div>
          <div className="text-3xl font-bold mt-1 text-purple-600">
            {items.filter(i => i.priority_level === "strategic").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-slate-500">Avg Response Time</div>
          <div className="text-3xl font-bold mt-1">
            {items.length > 0 
              ? Math.round(items.reduce((s, i) => s + (i.response_time_hours || 0), 0) / items.length) 
              : 0}h
          </div>
        </div>
      </div>

      {/* SLA Rules List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="font-semibold text-slate-800">SLA Rules</h2>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No SLA rules yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="p-4 hover:bg-slate-50 transition"
                data-testid={`sla-rule-${item.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {getClientName(item.customer_id)}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Service: {item.service_key || "All services"}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority_level)}`}>
                    {item.priority_level}
                  </span>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Clock className="w-4 h-4" />
                    Response: {item.response_time_hours}h
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    Quote: {item.quote_turnaround_hours}h
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    Delivery: {item.delivery_target_days} days
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
            <DialogTitle>Add SLA Rule</DialogTitle>
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Key (optional)</label>
              <Input
                value={form.service_key}
                onChange={(e) => setForm({ ...form, service_key: e.target.value })}
                placeholder="Leave empty for all services"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Response (hours)</label>
                <Input
                  type="number"
                  value={form.response_time_hours}
                  onChange={(e) => setForm({ ...form, response_time_hours: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Quote (hours)</label>
                <Input
                  type="number"
                  value={form.quote_turnaround_hours}
                  onChange={(e) => setForm({ ...form, quote_turnaround_hours: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Delivery (days)</label>
                <Input
                  type="number"
                  value={form.delivery_target_days}
                  onChange={(e) => setForm({ ...form, delivery_target_days: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority Level</label>
              <Select
                value={form.priority_level}
                onValueChange={(val) => setForm({ ...form, priority_level: val })}
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
