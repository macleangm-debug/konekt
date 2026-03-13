import React, { useEffect, useState } from "react";
import { MapPin, Plus, Edit2, Trash2, Home, Building2, Check } from "lucide-react";
import api from "../../lib/api";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { toast } from "sonner";

const initialAddress = {
  label: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "Tanzania",
  is_default: false,
  type: "shipping",
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState(initialAddress);
  const [saving, setSaving] = useState(false);

  const loadAddresses = async () => {
    try {
      const res = await api.get("/api/customer/addresses");
      setAddresses(res.data || []);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleOpenDialog = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setFormData(address);
    } else {
      setEditingAddress(null);
      setFormData(initialAddress);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAddress(null);
    setFormData(initialAddress);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAddress) {
        await api.put(`/api/customer/addresses/${editingAddress.id}`, formData);
        toast.success("Address updated successfully");
      } else {
        await api.post("/api/customer/addresses", formData);
        toast.success("Address added successfully");
      }
      handleCloseDialog();
      loadAddresses();
    } catch (error) {
      console.error("Failed to save address:", error);
      toast.error(error.response?.data?.detail || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      await api.delete(`/api/customer/addresses/${addressId}`);
      toast.success("Address deleted");
      loadAddresses();
    } catch (error) {
      console.error("Failed to delete address:", error);
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await api.put(`/api/customer/addresses/${addressId}/default`);
      toast.success("Default address updated");
      loadAddresses();
    } catch (error) {
      console.error("Failed to set default:", error);
      toast.error("Failed to update default address");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-40 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl bg-slate-200 h-40 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="addresses-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Address Book</h1>
          <p className="mt-1 text-slate-600">Manage your shipping and billing addresses.</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#D4A843] hover:bg-[#c49a3d]"
          data-testid="add-address-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Address
        </Button>
      </div>

      {/* Addresses Grid */}
      {addresses.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map(address => (
            <div
              key={address.id}
              className={`rounded-2xl border bg-white p-5 relative ${
                address.is_default ? "border-[#D4A843] ring-1 ring-[#D4A843]" : ""
              }`}
              data-testid={`address-card-${address.id}`}
            >
              {address.is_default && (
                <span className="absolute -top-2 -right-2 bg-[#D4A843] text-white text-xs px-2 py-1 rounded-full">
                  Default
                </span>
              )}
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {address.type === "billing" ? (
                    <Building2 className="w-5 h-5 text-[#2D3E50]" />
                  ) : (
                    <Home className="w-5 h-5 text-[#2D3E50]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{address.label || "Address"}</p>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded capitalize">
                      {address.type}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2 space-y-0.5">
                    <p>{address.address_line_1}</p>
                    {address.address_line_2 && <p>{address.address_line_2}</p>}
                    <p>
                      {address.city}
                      {address.state && `, ${address.state}`}
                      {address.postal_code && ` ${address.postal_code}`}
                    </p>
                    <p>{address.country}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                {!address.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(address.id)}
                    data-testid={`set-default-${address.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDialog(address)}
                  data-testid={`edit-address-${address.id}`}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(address.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid={`delete-address-${address.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          icon={MapPin}
          title="No addresses yet"
          description="Add your first address to make checkout faster."
          actionLabel="Add Address"
          onAction={() => handleOpenDialog()}
          testId="empty-addresses"
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="e.g., Home, Office"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                data-testid="address-label-input"
              />
            </div>

            <div>
              <Label htmlFor="type">Address Type</Label>
              <select
                id="type"
                className="w-full h-10 px-3 border rounded-md bg-white"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                data-testid="address-type-select"
              >
                <option value="shipping">Shipping</option>
                <option value="billing">Billing</option>
              </select>
            </div>

            <div>
              <Label htmlFor="address_line_1">Address Line 1 *</Label>
              <Input
                id="address_line_1"
                required
                placeholder="Street address"
                value={formData.address_line_1}
                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                data-testid="address-line1-input"
              />
            </div>

            <div>
              <Label htmlFor="address_line_2">Address Line 2</Label>
              <Input
                id="address_line_2"
                placeholder="Apartment, suite, etc."
                value={formData.address_line_2}
                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                data-testid="address-line2-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  data-testid="address-city-input"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Region</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  data-testid="address-state-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  placeholder="Postal code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  data-testid="address-postal-input"
                />
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  required
                  placeholder="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  data-testid="address-country-input"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded"
                data-testid="address-default-checkbox"
              />
              <Label htmlFor="is_default" className="font-normal">
                Set as default address
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                data-testid="cancel-address-btn"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#D4A843] hover:bg-[#c49a3d]"
                data-testid="save-address-btn"
              >
                {saving ? "Saving..." : editingAddress ? "Update" : "Add Address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
