import React, { useEffect, useState } from "react";
import {
  Settings, Plus, Edit2, Trash2, Loader2, Check, X, DollarSign,
  Percent, Globe, Package, Wrench, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function GroupMarkupsPage() {
  const [markups, setMarkups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const token = localStorage.getItem("admin_token");

  const [formData, setFormData] = useState({
    product_group: "",
    service_group: "",
    country_code: "TZ",
    markup_type: "percent",
    markup_value: 25,
    minimum_margin_percent: 8,
    max_affiliate_percent: 10,
    max_promo_percent: 15,
    max_points_percent: 10,
    affiliate_allowed: true,
    is_active: true,
  });

  const loadMarkups = async () => {
    try {
      const res = await fetch(`${API}/api/admin/group-markup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMarkups(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load markup settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkups();
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setFormData({
      product_group: "",
      service_group: "",
      country_code: "TZ",
      markup_type: "percent",
      markup_value: 25,
      minimum_margin_percent: 8,
      max_affiliate_percent: 10,
      max_promo_percent: 15,
      max_points_percent: 10,
      affiliate_allowed: true,
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      product_group: item.product_group || "",
      service_group: item.service_group || "",
      country_code: item.country_code || "TZ",
      markup_type: item.markup_type || "percent",
      markup_value: item.markup_value || 25,
      minimum_margin_percent: item.minimum_margin_percent || 8,
      max_affiliate_percent: item.max_affiliate_percent || 10,
      max_promo_percent: item.max_promo_percent || 15,
      max_points_percent: item.max_points_percent || 10,
      affiliate_allowed: item.affiliate_allowed !== false,
      is_active: item.is_active !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editItem
        ? `${API}/api/admin/group-markup/${editItem.id}`
        : `${API}/api/admin/group-markup`;

      const res = await fetch(url, {
        method: editItem ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editItem ? "Markup setting updated" : "Markup setting created");
        setShowModal(false);
        loadMarkups();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save markup setting");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this markup setting?")) return;
    try {
      const res = await fetch(`${API}/api/admin/group-markup/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Markup setting deleted");
        loadMarkups();
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="group-markups-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Group Markup Settings</h1>
          <p className="text-slate-500">Configure markup and margin rules by product/service group and country.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4A843] hover:bg-[#c49a3d] text-white rounded-lg transition"
          data-testid="add-markup-btn"
        >
          <Plus className="w-4 h-4" />
          Add Markup Rule
        </button>
      </div>

      {/* Explanation Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>How Markup Rules Work:</strong> These settings define the default markup, minimum margin, and 
            maximum discount percentages for different product/service groups. The system will automatically 
            apply these rules when generating quotes and during checkout to protect margins.
          </div>
        </div>
      </div>

      {markups.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <Settings className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 mb-4">No markup rules configured yet</p>
          <button onClick={openCreate} className="text-[#D4A843] hover:underline">
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="markups-table">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Group</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Country</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Markup</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Min Margin</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Max Affiliate</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Max Promo</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {markups.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {item.product_group && <Package className="w-4 h-4 text-blue-500" />}
                        {item.service_group && <Wrench className="w-4 h-4 text-purple-500" />}
                        <span className="font-medium">
                          {item.product_group || item.service_group || "Default"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-100 rounded text-sm">
                        {item.country_code}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {item.markup_type === "percent" ? (
                          <Percent className="w-4 h-4 text-green-500" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-green-500" />
                        )}
                        <span className="font-medium">{item.markup_value}</span>
                        <span className="text-slate-400 text-sm">
                          {item.markup_type === "percent" ? "%" : "fixed"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700">{item.minimum_margin_percent}%</span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700">{item.max_affiliate_percent}%</span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700">{item.max_promo_percent}%</span>
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
                        data-testid={`edit-markup-${item.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                        data-testid={`delete-markup-${item.id}`}
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
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" data-testid="markup-modal">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editItem ? "Edit Markup Rule" : "Add Markup Rule"}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Product Group
                  </label>
                  <input
                    type="text"
                    value={formData.product_group}
                    onChange={(e) => setFormData({ ...formData, product_group: e.target.value, service_group: "" })}
                    placeholder="e.g., Apparel, Signage"
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="input-product-group"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Service Group
                  </label>
                  <input
                    type="text"
                    value={formData.service_group}
                    onChange={(e) => setFormData({ ...formData, service_group: e.target.value, product_group: "" })}
                    placeholder="e.g., Installation"
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="input-service-group"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Country
                  </label>
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Markup Type
                  </label>
                  <select
                    value={formData.markup_type}
                    onChange={(e) => setFormData({ ...formData, markup_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="select-markup-type"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Markup Value
                  </label>
                  <input
                    type="number"
                    value={formData.markup_value}
                    onChange={(e) => setFormData({ ...formData, markup_value: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="input-markup-value"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Minimum Margin %
                  </label>
                  <input
                    type="number"
                    value={formData.minimum_margin_percent}
                    onChange={(e) => setFormData({ ...formData, minimum_margin_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="input-min-margin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max Affiliate %
                  </label>
                  <input
                    type="number"
                    value={formData.max_affiliate_percent}
                    onChange={(e) => setFormData({ ...formData, max_affiliate_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="input-max-affiliate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max Promo %
                  </label>
                  <input
                    type="number"
                    value={formData.max_promo_percent}
                    onChange={(e) => setFormData({ ...formData, max_promo_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="input-max-promo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max Points %
                  </label>
                  <input
                    type="number"
                    value={formData.max_points_percent}
                    onChange={(e) => setFormData({ ...formData, max_points_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    data-testid="input-max-points"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.affiliate_allowed}
                    onChange={(e) => setFormData({ ...formData, affiliate_allowed: e.target.checked })}
                    className="rounded"
                    data-testid="checkbox-affiliate-allowed"
                  />
                  <span className="text-sm">Affiliates Allowed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                    data-testid="checkbox-active"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                data-testid="cancel-markup-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#D4A843] hover:bg-[#c49a3d] text-white rounded-lg"
                data-testid="save-markup-btn"
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
