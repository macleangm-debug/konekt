import React, { useEffect, useState } from "react";
import {
  Settings, Plus, Edit2, Trash2, Loader2, Check, X, Percent,
  DollarSign, Globe, PieChart, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmModal } from "@/contexts/ConfirmModalContext";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CommissionRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const token = localStorage.getItem("admin_token");
  const { confirmAction } = useConfirmModal();

  const [formData, setFormData] = useState({
    name: "",
    scope_type: "default",
    scope_value: "",
    country_code: "TZ",
    protected_margin_percent: 40,
    sales_percent: 20,
    affiliate_percent: 15,
    promo_percent: 15,
    buffer_percent: 10,
    is_active: true,
  });

  const loadRules = async () => {
    try {
      const res = await fetch(`${API}/api/admin/commission-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load commission rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setFormData({
      name: "",
      scope_type: "default",
      scope_value: "",
      country_code: "TZ",
      protected_margin_percent: 40,
      sales_percent: 20,
      affiliate_percent: 15,
      promo_percent: 15,
      buffer_percent: 10,
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || "",
      scope_type: item.scope_type || "default",
      scope_value: item.scope_value || "",
      country_code: item.country_code || "TZ",
      protected_margin_percent: item.protected_margin_percent || 40,
      sales_percent: item.sales_percent || 20,
      affiliate_percent: item.affiliate_percent || 15,
      promo_percent: item.promo_percent || 15,
      buffer_percent: item.buffer_percent || 10,
      is_active: item.is_active !== false,
    });
    setShowModal(true);
  };

  const totalPercent = () => {
    return (
      parseFloat(formData.protected_margin_percent || 0) +
      parseFloat(formData.sales_percent || 0) +
      parseFloat(formData.affiliate_percent || 0) +
      parseFloat(formData.promo_percent || 0) +
      parseFloat(formData.buffer_percent || 0)
    );
  };

  const handleSave = async () => {
    if (totalPercent() > 100) {
      toast.error("Total percentage cannot exceed 100%");
      return;
    }

    try {
      const url = editItem
        ? `${API}/api/admin/commission-rules/${editItem.id}`
        : `${API}/api/admin/commission-rules`;

      const res = await fetch(url, {
        method: editItem ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editItem ? "Commission rule updated" : "Commission rule created");
        setShowModal(false);
        loadRules();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save commission rule");
    }
  };

  const handleDelete = async (id) => {
    confirmAction({
      title: "Delete Commission Rule?",
      message: "This commission rule will be permanently deleted.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/api/admin/commission-rules/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            toast.success("Commission rule deleted");
            loadRules();
          }
        } catch (error) {
          toast.error("Failed to delete");
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="commission-rules-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Commission Rules</h1>
          <p className="text-slate-500">Configure margin distribution by scope (product group, service group, country).</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4A843] hover:bg-[#c49a3d] text-white rounded-lg transition"
          data-testid="add-rule-btn"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {/* Explanation Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <PieChart className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>How Commission Rules Work:</strong> Each rule defines how margin is split between 
            protected profit, sales commission, affiliate payouts, promotional discounts, and buffer. 
            Total must equal 100%. Rules are matched by scope (product/service group or country).
          </div>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <Settings className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 mb-4">No commission rules configured yet</p>
          <button onClick={openCreate} className="text-[#D4A843] hover:underline">
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="rules-table">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Name/Scope</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Protected</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Sales</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Affiliate</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Promo</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Buffer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-medium">{item.name || "Unnamed"}</div>
                      <div className="text-xs text-slate-500">
                        {item.scope_type}: {item.scope_value || "All"} 
                        {item.country_code && ` (${item.country_code})`}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-green-600 font-medium">{item.protected_margin_percent}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-blue-600 font-medium">{item.sales_percent}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-purple-600 font-medium">{item.affiliate_percent}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-amber-600 font-medium">{item.promo_percent}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-slate-600 font-medium">{item.buffer_percent}%</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        item.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {item.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                        data-testid={`edit-rule-${item.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                        data-testid={`delete-rule-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" data-testid="rule-modal">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editItem ? "Edit Commission Rule" : "Add Commission Rule"}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Printing Services - TZ"
                  className="w-full border rounded-lg px-3 py-2"
                  data-testid="input-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scope Type</label>
                  <select
                    value={formData.scope_type}
                    onChange={(e) => setFormData({ ...formData, scope_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="select-scope-type"
                  >
                    <option value="default">Default (Fallback)</option>
                    <option value="product_group">Product Group</option>
                    <option value="service_group">Service Group</option>
                    <option value="country">Country</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scope Value</label>
                  <input
                    type="text"
                    value={formData.scope_value}
                    onChange={(e) => setFormData({ ...formData, scope_value: e.target.value })}
                    placeholder="e.g., Printing"
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="input-scope-value"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <select
                  value={formData.country_code}
                  onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  data-testid="select-country"
                >
                  <option value="TZ">Tanzania (TZ)</option>
                  <option value="KE">Kenya (KE)</option>
                  <option value="UG">Uganda (UG)</option>
                  <option value="RW">Rwanda (RW)</option>
                  <option value="GH">Ghana (GH)</option>
                  <option value="NG">Nigeria (NG)</option>
                  <option value="ZA">South Africa (ZA)</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-slate-700">Margin Distribution</span>
                  <span className={`text-sm font-medium ${totalPercent() === 100 ? "text-green-600" : totalPercent() > 100 ? "text-red-600" : "text-amber-600"}`}>
                    Total: {totalPercent()}%
                  </span>
                </div>

                {totalPercent() > 100 && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Total exceeds 100%. Please adjust.
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600">Protected</div>
                    <input
                      type="number"
                      value={formData.protected_margin_percent}
                      onChange={(e) => setFormData({ ...formData, protected_margin_percent: parseFloat(e.target.value) || 0 })}
                      className="flex-1 border rounded-lg px-3 py-2"
                      data-testid="input-protected"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600">Sales</div>
                    <input
                      type="number"
                      value={formData.sales_percent}
                      onChange={(e) => setFormData({ ...formData, sales_percent: parseFloat(e.target.value) || 0 })}
                      className="flex-1 border rounded-lg px-3 py-2"
                      data-testid="input-sales"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600">Affiliate</div>
                    <input
                      type="number"
                      value={formData.affiliate_percent}
                      onChange={(e) => setFormData({ ...formData, affiliate_percent: parseFloat(e.target.value) || 0 })}
                      className="flex-1 border rounded-lg px-3 py-2"
                      data-testid="input-affiliate"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600">Promo</div>
                    <input
                      type="number"
                      value={formData.promo_percent}
                      onChange={(e) => setFormData({ ...formData, promo_percent: parseFloat(e.target.value) || 0 })}
                      className="flex-1 border rounded-lg px-3 py-2"
                      data-testid="input-promo"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600">Buffer</div>
                    <input
                      type="number"
                      value={formData.buffer_percent}
                      onChange={(e) => setFormData({ ...formData, buffer_percent: parseFloat(e.target.value) || 0 })}
                      className="flex-1 border rounded-lg px-3 py-2"
                      data-testid="input-buffer"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                  data-testid="checkbox-active"
                />
                <span className="text-sm">Active</span>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                data-testid="cancel-rule-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={totalPercent() > 100}
                className="px-4 py-2 bg-[#D4A843] hover:bg-[#c49a3d] text-white rounded-lg disabled:opacity-50"
                data-testid="save-rule-btn"
              >
                {editItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
