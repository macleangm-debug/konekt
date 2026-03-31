import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, ChevronRight, Layers, Package, Palette, Megaphone } from "lucide-react";
import api from "@/lib/api";

const SECTIONS = [
  { key: "product", label: "Product Taxonomy", icon: Package, type: "product" },
  { key: "promotional", label: "Promotional Materials", icon: Megaphone, type: "promotional" },
  { key: "service", label: "Service Taxonomy", icon: Palette, type: "service" },
];

export default function CatalogTaxonomyPage() {
  const [activeSection, setActiveSection] = useState("product");
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form states
  const [newGroupName, setNewGroupName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");

  const currentType = SECTIONS.find((s) => s.key === activeSection)?.type || "product";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, cRes, sRes] = await Promise.all([
        api.get("/api/admin/catalog/groups"),
        api.get("/api/admin/catalog/categories"),
        api.get("/api/admin/catalog/subcategories"),
      ]);
      setGroups((gRes.data || []).filter((g) => g.is_active !== false));
      setCategories((cRes.data || []).filter((c) => c.is_active !== false));
      setSubcategories((sRes.data || []).filter((s) => s.is_active !== false));
    } catch (err) {
      console.error("Failed to load taxonomy", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter by type
  const filteredGroups = groups.filter((g) => (g.type || "product") === currentType);
  const filteredCategories = selectedGroup
    ? categories.filter((c) => c.group_id === selectedGroup.id)
    : [];
  const filteredSubcategories = selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory.id)
    : [];

  // Reset selection on section change
  useEffect(() => {
    setSelectedGroup(null);
    setSelectedCategory(null);
  }, [activeSection]);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.post("/api/admin/catalog/groups", { name: newGroupName.trim(), type: currentType });
      setNewGroupName("");
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add group");
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim() || !selectedGroup) return;
    try {
      await api.post("/api/admin/catalog/categories", {
        name: newCategoryName.trim(),
        group_id: selectedGroup.id,
      });
      setNewCategoryName("");
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add category");
    }
  };

  const addSubcategory = async () => {
    if (!newSubcategoryName.trim() || !selectedCategory) return;
    try {
      await api.post("/api/admin/catalog/subcategories", {
        name: newSubcategoryName.trim(),
        category_id: selectedCategory.id,
        group_id: selectedGroup?.id || "",
      });
      setNewSubcategoryName("");
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add subcategory");
    }
  };

  const deleteItem = async (level, id) => {
    if (!window.confirm("Remove this item?")) return;
    try {
      await api.delete(`/api/admin/catalog/${level}/${id}`);
      if (level === "groups" && selectedGroup?.id === id) setSelectedGroup(null);
      if (level === "categories" && selectedCategory?.id === id) setSelectedCategory(null);
      loadData();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const startEdit = (level, item) => {
    setEditingItem({ level, id: item.id });
    setEditName(item.name);
  };

  const saveEdit = async () => {
    if (!editingItem || !editName.trim()) return;
    try {
      await api.put(`/api/admin/catalog/${editingItem.level}/${editingItem.id}`, { name: editName.trim() });
      setEditingItem(null);
      setEditName("");
      loadData();
    } catch (err) {
      alert("Update failed");
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="catalog-taxonomy-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Layers className="w-8 h-8 text-[#D4A843]" />
            Catalog Taxonomy
          </h1>
          <p className="text-slate-600 mt-1">Manage products, promotional materials, and services taxonomy</p>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mb-6" data-testid="taxonomy-section-tabs">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeSection === section.key
                    ? "bg-[#2D3E50] text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                data-testid={`taxonomy-tab-${section.key}`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400">Loading taxonomy...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Groups Column */}
            <TaxonomyColumn
              title="Groups"
              items={filteredGroups}
              selectedId={selectedGroup?.id}
              onSelect={(g) => { setSelectedGroup(g); setSelectedCategory(null); }}
              onDelete={(id) => deleteItem("groups", id)}
              onEdit={(item) => startEdit("groups", item)}
              newName={newGroupName}
              onNewNameChange={setNewGroupName}
              onAdd={addGroup}
              editingItem={editingItem?.level === "groups" ? editingItem : null}
              editName={editName}
              onEditNameChange={setEditName}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingItem(null)}
              testIdPrefix="group"
            />

            {/* Categories Column */}
            <TaxonomyColumn
              title="Categories"
              items={filteredCategories}
              selectedId={selectedCategory?.id}
              onSelect={setSelectedCategory}
              onDelete={(id) => deleteItem("categories", id)}
              onEdit={(item) => startEdit("categories", item)}
              newName={newCategoryName}
              onNewNameChange={setNewCategoryName}
              onAdd={addCategory}
              disabled={!selectedGroup}
              placeholder={!selectedGroup ? "Select a group first" : undefined}
              editingItem={editingItem?.level === "categories" ? editingItem : null}
              editName={editName}
              onEditNameChange={setEditName}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingItem(null)}
              testIdPrefix="category"
            />

            {/* Subcategories Column */}
            <TaxonomyColumn
              title="Subcategories"
              items={filteredSubcategories}
              onDelete={(id) => deleteItem("subcategories", id)}
              onEdit={(item) => startEdit("subcategories", item)}
              newName={newSubcategoryName}
              onNewNameChange={setNewSubcategoryName}
              onAdd={addSubcategory}
              disabled={!selectedCategory}
              placeholder={!selectedCategory ? "Select a category first" : undefined}
              editingItem={editingItem?.level === "subcategories" ? editingItem : null}
              editName={editName}
              onEditNameChange={setEditName}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingItem(null)}
              testIdPrefix="subcategory"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TaxonomyColumn({
  title,
  items,
  selectedId,
  onSelect,
  onDelete,
  onEdit,
  newName,
  onNewNameChange,
  onAdd,
  disabled,
  placeholder,
  editingItem,
  editName,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  testIdPrefix,
}) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden" data-testid={`${testIdPrefix}-column`}>
      <div className="px-4 py-3 bg-slate-50 border-b">
        <h3 className="font-semibold text-sm text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400">{items.length} items</span>
      </div>

      <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
        {disabled && placeholder ? (
          <div className="p-6 text-center text-sm text-slate-400">{placeholder}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No items yet</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`group flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                onSelect ? "cursor-pointer hover:bg-slate-50" : ""
              } ${selectedId === item.id ? "bg-[#D4A843]/10 border-l-3 border-l-[#D4A843]" : ""}`}
              onClick={() => onSelect?.(item)}
              data-testid={`${testIdPrefix}-item-${item.id}`}
            >
              {editingItem?.id === item.id ? (
                <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    className="flex-1 border rounded-lg px-2 py-1 text-sm"
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
                    autoFocus
                  />
                  <button onClick={onSaveEdit} className="text-xs text-green-600 font-medium">Save</button>
                  <button onClick={onCancelEdit} className="text-xs text-slate-400">Cancel</button>
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    {item.name}
                    {onSelect && selectedId === item.id && <ChevronRight className="w-3 h-3 text-[#D4A843]" />}
                  </span>
                  <div className="hidden group-hover:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1 rounded hover:bg-slate-100"
                      data-testid={`edit-${testIdPrefix}-${item.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1 rounded hover:bg-red-50"
                      data-testid={`delete-${testIdPrefix}-${item.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {!disabled && (
        <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder={`Add ${title.toLowerCase().slice(0, -1)}...`}
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            data-testid={`add-${testIdPrefix}-input`}
          />
          <button
            onClick={onAdd}
            className="rounded-lg bg-[#2D3E50] text-white px-3 py-2 hover:bg-[#3d5166] transition"
            data-testid={`add-${testIdPrefix}-btn`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
