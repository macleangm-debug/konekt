import React, { useState, useEffect, useCallback } from "react";
import { Users, Save, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

export default function VendorCapabilityAssignmentPage() {
  const [vendors, setVendors] = useState([]);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedVendor, setSelectedVendor] = useState("");
  const [capabilityType, setCapabilityType] = useState("both");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, gRes, cRes, sRes] = await Promise.all([
        api.get("/api/admin/vendor-capabilities/assignment/vendors"),
        api.get("/api/admin/catalog/groups"),
        api.get("/api/admin/catalog/categories"),
        api.get("/api/admin/catalog/subcategories"),
      ]);
      setVendors(vRes.data || []);
      setGroups((gRes.data || []).filter((g) => g.is_active !== false));
      setCategories((cRes.data || []).filter((c) => c.is_active !== false));
      setSubcategories((sRes.data || []).filter((s) => s.is_active !== false));
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load existing capabilities when vendor changes
  useEffect(() => {
    if (!selectedVendor) return;
    api.get(`/api/admin/vendor-capabilities/assignment/${selectedVendor}`)
      .then((res) => {
        const data = res.data;
        if (data) {
          setCapabilityType(data.capability_type || "both");
          setSelectedGroups(data.group_ids || []);
          setSelectedCategories(data.category_ids || []);
          setSelectedSubcategories(data.subcategory_ids || []);
        } else {
          setCapabilityType("both");
          setSelectedGroups([]);
          setSelectedCategories([]);
          setSelectedSubcategories([]);
        }
      })
      .catch(() => {
        setSelectedGroups([]);
        setSelectedCategories([]);
        setSelectedSubcategories([]);
      });
  }, [selectedVendor]);

  const toggleItem = (list, setList, id) => {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSaved(false);
  };

  // Filter groups by capability type
  const filteredGroups = groups.filter((g) => {
    if (capabilityType === "both") return true;
    return (g.type || "product") === capabilityType;
  });

  const filteredCategories = categories.filter((c) => selectedGroups.includes(c.group_id));
  const filteredSubcategories = subcategories.filter((s) => selectedCategories.includes(s.category_id));

  const saveCapabilities = async () => {
    if (!selectedVendor) return;
    setSaving(true);
    try {
      await api.post("/api/admin/vendor-capabilities/assignment", {
        vendor_id: selectedVendor,
        capability_type: capabilityType,
        group_ids: selectedGroups,
        category_ids: selectedCategories,
        subcategory_ids: selectedSubcategories,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save capabilities");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-400">Loading...</div>;
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="vendor-capability-page">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-[#D4A843]" />
            Vendor Capability Assignment
          </h1>
          <p className="text-slate-600 mt-1">Assign vendor expertise by taxonomy for products, services, or both</p>
        </div>

        {/* Vendor + Type Selection */}
        <div className="rounded-2xl border bg-white p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Vendor</label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white text-sm"
                data-testid="vendor-select"
              >
                <option value="">Choose a vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.full_name || v.company || v.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Capability Type</label>
              <select
                value={capabilityType}
                onChange={(e) => { setCapabilityType(e.target.value); setSaved(false); }}
                className="w-full border rounded-xl px-4 py-3 bg-white text-sm"
                data-testid="capability-type-select"
              >
                <option value="product">Products Only</option>
                <option value="service">Services Only</option>
                <option value="both">Both Products & Services</option>
              </select>
            </div>
          </div>
        </div>

        {selectedVendor ? (
          <>
            {/* Taxonomy Selection Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <CheckboxColumn
                title="Groups"
                items={filteredGroups}
                selected={selectedGroups}
                onToggle={(id) => toggleItem(selectedGroups, setSelectedGroups, id)}
                testIdPrefix="cap-group"
              />
              <CheckboxColumn
                title="Categories"
                items={filteredCategories}
                selected={selectedCategories}
                onToggle={(id) => toggleItem(selectedCategories, setSelectedCategories, id)}
                placeholder={selectedGroups.length === 0 ? "Select groups first" : undefined}
                testIdPrefix="cap-category"
              />
              <CheckboxColumn
                title="Subcategories"
                items={filteredSubcategories}
                selected={selectedSubcategories}
                onToggle={(id) => toggleItem(selectedSubcategories, setSelectedSubcategories, id)}
                placeholder={selectedCategories.length === 0 ? "Select categories first" : undefined}
                testIdPrefix="cap-subcategory"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveCapabilities}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3d5166] disabled:opacity-50 transition"
                data-testid="save-capabilities-btn"
              >
                {saved ? <CheckCircle2 className="w-5 h-5 text-green-300" /> : <Save className="w-5 h-5" />}
                {saving ? "Saving..." : saved ? "Saved" : "Save Capabilities"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-400">
            Select a vendor to assign capabilities
          </div>
        )}
      </div>
    </div>
  );
}

function CheckboxColumn({ title, items, selected, onToggle, placeholder, testIdPrefix }) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden" data-testid={`${testIdPrefix}-column`}>
      <div className="px-4 py-3 bg-slate-50 border-b">
        <h3 className="font-semibold text-sm text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400">{selected.length} of {items.length} selected</span>
      </div>
      <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
        {placeholder ? (
          <div className="p-6 text-center text-sm text-slate-400">{placeholder}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No items available</div>
        ) : (
          items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm"
              data-testid={`${testIdPrefix}-item-${item.id}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => onToggle(item.id)}
                className="rounded border-slate-300 text-[#D4A843] focus:ring-[#D4A843]"
              />
              <span>{item.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
