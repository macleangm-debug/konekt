import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, FolderTree, FileText, Save, X, ChevronRight } from "lucide-react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { adminServiceApi } from "../../lib/serviceCatalogApi";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";

export default function ServiceCatalogPage() {
  const { admin } = useAdminAuth();
  const token = localStorage.getItem("admin_token");

  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [saving, setSaving] = useState(false);

  // Group form
  const [groupForm, setGroupForm] = useState({
    key: "",
    name: "",
    description: "",
    icon: "",
    sort_order: 0,
    is_active: true,
  });

  // Type form
  const [typeForm, setTypeForm] = useState({
    group_key: "",
    key: "",
    slug: "",
    name: "",
    short_description: "",
    description: "",
    service_mode: "quote_request",
    partner_required: false,
    delivery_required: false,
    site_visit_required: false,
    has_product_blanks: false,
    pricing_mode: "quote",
    visit_fee: 0,
    base_price: 0,
    icon: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, typesData] = await Promise.all([
        adminServiceApi.getGroups(token),
        adminServiceApi.getTypes(null, token),
      ]);
      setGroups(groupsData);
      setTypes(typesData);
    } catch (err) {
      toast.error("Failed to load service catalog");
    } finally {
      setLoading(false);
    }
  };

  // Group CRUD
  const openGroupModal = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        key: group.key,
        name: group.name,
        description: group.description || "",
        icon: group.icon || "",
        sort_order: group.sort_order || 0,
        is_active: group.is_active !== false,
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        key: "",
        name: "",
        description: "",
        icon: "",
        sort_order: 0,
        is_active: true,
      });
    }
    setShowGroupModal(true);
  };

  const saveGroup = async () => {
    if (!groupForm.key || !groupForm.name) {
      toast.error("Key and Name are required");
      return;
    }

    setSaving(true);
    try {
      if (editingGroup) {
        await adminServiceApi.updateGroup(editingGroup.id, groupForm, token);
        toast.success("Group updated successfully");
      } else {
        await adminServiceApi.createGroup(groupForm, token);
        toast.success("Group created successfully");
      }
      setShowGroupModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (groupId) => {
    if (!confirm("Delete this service group? This cannot be undone.")) return;
    
    try {
      await adminServiceApi.deleteGroup(groupId, token);
      toast.success("Group deleted");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Type CRUD
  const openTypeModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        group_key: type.group_key,
        key: type.key,
        slug: type.slug || "",
        name: type.name,
        short_description: type.short_description || "",
        description: type.description || "",
        service_mode: type.service_mode || "quote_request",
        partner_required: type.partner_required || false,
        delivery_required: type.delivery_required || false,
        site_visit_required: type.site_visit_required || false,
        has_product_blanks: type.has_product_blanks || false,
        pricing_mode: type.pricing_mode || "quote",
        visit_fee: type.visit_fee || 0,
        base_price: type.base_price || 0,
        icon: type.icon || "",
        sort_order: type.sort_order || 0,
        is_active: type.is_active !== false,
      });
    } else {
      setEditingType(null);
      setTypeForm({
        group_key: selectedGroup?.key || "",
        key: "",
        slug: "",
        name: "",
        short_description: "",
        description: "",
        service_mode: "quote_request",
        partner_required: false,
        delivery_required: false,
        site_visit_required: false,
        has_product_blanks: false,
        pricing_mode: "quote",
        visit_fee: 0,
        base_price: 0,
        icon: "",
        sort_order: 0,
        is_active: true,
      });
    }
    setShowTypeModal(true);
  };

  const saveType = async () => {
    if (!typeForm.group_key || !typeForm.key || !typeForm.name) {
      toast.error("Group, Key and Name are required");
      return;
    }

    setSaving(true);
    try {
      if (editingType) {
        await adminServiceApi.updateType(editingType.id, typeForm, token);
        toast.success("Service type updated successfully");
      } else {
        await adminServiceApi.createType(typeForm, token);
        toast.success("Service type created successfully");
      }
      setShowTypeModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (typeId) => {
    if (!confirm("Delete this service type? This cannot be undone.")) return;
    
    try {
      await adminServiceApi.deleteType(typeId, token);
      toast.success("Service type deleted");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Filter types by selected group
  const filteredTypes = selectedGroup 
    ? types.filter(t => t.group_key === selectedGroup.key)
    : types;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="service-catalog-admin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Service Catalog</h1>
          <p className="text-slate-500">Manage service groups and types</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Service Groups Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-slate-600" />
                <h2 className="font-semibold text-slate-800">Service Groups</h2>
              </div>
              <Button size="sm" onClick={() => openGroupModal()} data-testid="add-group-btn">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {groups.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  No service groups yet
                </div>
              ) : (
                groups.map((group) => (
                  <div 
                    key={group.id}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition ${
                      selectedGroup?.id === group.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                    onClick={() => setSelectedGroup(selectedGroup?.id === group.id ? null : group)}
                    data-testid={`group-item-${group.key}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition ${
                          selectedGroup?.id === group.id ? "rotate-90" : ""
                        }`} />
                        <div>
                          <div className="font-medium text-slate-800">{group.name}</div>
                          <div className="text-xs text-slate-500">{group.key}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!group.is_active && (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs">Inactive</span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openGroupModal(group); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Service Types Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                <h2 className="font-semibold text-slate-800">
                  Service Types {selectedGroup && `- ${selectedGroup.name}`}
                </h2>
              </div>
              <Button size="sm" onClick={() => openTypeModal()} data-testid="add-type-btn">
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Features</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        {selectedGroup ? "No services in this group" : "Select a group or add a new service"}
                      </td>
                    </tr>
                  ) : (
                    filteredTypes.map((type) => (
                      <tr key={type.id} className="hover:bg-slate-50" data-testid={`type-row-${type.key}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{type.name}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {type.short_description}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{type.key}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                            {type.service_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {type.site_visit_required && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Visit</span>
                            )}
                            {type.has_product_blanks && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Products</span>
                            )}
                            {type.partner_required && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Partner</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {type.is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Active</span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openTypeModal(type)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteType(type.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Group Modal */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Service Group" : "Create Service Group"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Key *</Label>
                <Input
                  value={groupForm.key}
                  onChange={(e) => setGroupForm({ ...groupForm, key: e.target.value })}
                  placeholder="printing"
                  disabled={!!editingGroup}
                  data-testid="group-key-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Printing Services"
                  data-testid="group-name-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Description of this service group"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input
                  value={groupForm.icon}
                  onChange={(e) => setGroupForm({ ...groupForm, icon: e.target.value })}
                  placeholder="printer"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={groupForm.sort_order}
                  onChange={(e) => setGroupForm({ ...groupForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={groupForm.is_active}
                onCheckedChange={(checked) => setGroupForm({ ...groupForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveGroup} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type Modal */}
      <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Service Type" : "Create Service Type"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Group *</Label>
                <Select
                  value={typeForm.group_key}
                  onValueChange={(val) => setTypeForm({ ...typeForm, group_key: val })}
                  disabled={!!editingType}
                >
                  <SelectTrigger data-testid="type-group-select">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.key} value={g.key}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Key *</Label>
                <Input
                  value={typeForm.key}
                  onChange={(e) => setTypeForm({ ...typeForm, key: e.target.value })}
                  placeholder="business_cards"
                  disabled={!!editingType}
                  data-testid="type-key-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={typeForm.slug}
                  onChange={(e) => setTypeForm({ ...typeForm, slug: e.target.value })}
                  placeholder="business-cards"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="Business Cards Printing"
                data-testid="type-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input
                value={typeForm.short_description}
                onChange={(e) => setTypeForm({ ...typeForm, short_description: e.target.value })}
                placeholder="Professional business cards with custom designs"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                placeholder="Detailed description of the service..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Mode</Label>
                <Select
                  value={typeForm.service_mode}
                  onValueChange={(val) => setTypeForm({ ...typeForm, service_mode: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quote_request">Quote Request</SelectItem>
                    <SelectItem value="direct_order">Direct Order</SelectItem>
                    <SelectItem value="visit_required">Visit Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pricing Mode</Label>
                <Select
                  value={typeForm.pricing_mode}
                  onValueChange={(val) => setTypeForm({ ...typeForm, pricing_mode: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quote">Quote-based</SelectItem>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="starting_from">Starting From</SelectItem>
                    <SelectItem value="visit_fee">Visit Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Price (TZS)</Label>
                <Input
                  type="number"
                  value={typeForm.base_price}
                  onChange={(e) => setTypeForm({ ...typeForm, base_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Visit Fee (TZS)</Label>
                <Input
                  type="number"
                  value={typeForm.visit_fee}
                  onChange={(e) => setTypeForm({ ...typeForm, visit_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-slate-700 mb-3 block">Service Features</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={typeForm.site_visit_required}
                    onCheckedChange={(checked) => setTypeForm({ ...typeForm, site_visit_required: checked })}
                  />
                  <Label>Site Visit Required</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={typeForm.has_product_blanks}
                    onCheckedChange={(checked) => setTypeForm({ ...typeForm, has_product_blanks: checked })}
                  />
                  <Label>Has Product Blanks</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={typeForm.partner_required}
                    onCheckedChange={(checked) => setTypeForm({ ...typeForm, partner_required: checked })}
                  />
                  <Label>Partner Required</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={typeForm.delivery_required}
                    onCheckedChange={(checked) => setTypeForm({ ...typeForm, delivery_required: checked })}
                  />
                  <Label>Delivery Required</Label>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input
                  value={typeForm.icon}
                  onChange={(e) => setTypeForm({ ...typeForm, icon: e.target.value })}
                  placeholder="printer"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={typeForm.sort_order}
                  onChange={(e) => setTypeForm({ ...typeForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={typeForm.is_active}
                onCheckedChange={(checked) => setTypeForm({ ...typeForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveType} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
