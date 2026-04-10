import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useConfirmModal } from '../../contexts/ConfirmModalContext';
import { 
  Gift, Plus, Edit, Trash2, Copy, Calendar, Percent, 
  DollarSign, Tag, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const defaultOffer = {
  title: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  code: '',
  min_order_amount: 0,
  max_uses: 0,
  applicable_branches: [],
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

export default function AdminOffers() {
  const { confirmAction } = useConfirmModal();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(defaultOffer);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/offers`);
      setOffers(response.data.offers || []);
    } catch (error) {
      console.error('Failed to fetch offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData(defaultOffer);
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (offer) => {
    setFormData({
      ...offer,
      start_date: offer.start_date?.split('T')[0] || '',
      end_date: offer.end_date?.split('T')[0] || ''
    });
    setEditMode(true);
    setShowModal(true);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'KONEKT';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.discount_value) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      if (editMode) {
        await axios.put(`${API_URL}/api/admin/offers/${formData.id}`, formData);
        toast.success('Offer updated');
      } else {
        await axios.post(`${API_URL}/api/admin/offers`, formData);
        toast.success('Offer created');
      }
      setShowModal(false);
      fetchOffers();
    } catch (error) {
      console.error('Failed to save offer:', error);
      toast.error('Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offerId) => {
    confirmAction({
      title: "Delete Offer?",
      message: "This offer will be permanently removed.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/admin/offers/${offerId}`);
          toast.success('Offer deleted');
          fetchOffers();
        } catch (error) {
          console.error('Failed to delete offer:', error);
          toast.error('Failed to delete offer');
        }
      },
    });
  };

  const toggleOfferStatus = async (offer) => {
    try {
      await axios.put(`${API_URL}/api/admin/offers/${offer.id}`, {
        is_active: !offer.is_active
      });
      toast.success(offer.is_active ? 'Offer deactivated' : 'Offer activated');
      fetchOffers();
    } catch (error) {
      toast.error('Failed to update offer');
    }
  };

  const isOfferActive = (offer) => {
    const now = new Date();
    const start = new Date(offer.start_date);
    const end = new Date(offer.end_date);
    return offer.is_active && now >= start && now <= end;
  };

  return (
    <div className="space-y-6" data-testid="admin-offers">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Promotional Offers</h1>
          <p className="text-muted-foreground">Create and manage discount codes and promotions</p>
        </div>
        <Button onClick={openAddModal} className="rounded-full">
          <Plus className="w-4 h-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No offers yet</h3>
          <p className="text-muted-foreground mb-4">Create your first promotional offer</p>
          <Button onClick={openAddModal}>Create Offer</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => {
            const active = isOfferActive(offer);
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border overflow-hidden ${
                  active ? 'border-green-200' : 'border-slate-100'
                }`}
              >
                {/* Header */}
                <div className={`p-4 ${active ? 'bg-green-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}>
                      {active ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {active ? 'Active' : 'Inactive'}
                    </Badge>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditModal(offer)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(offer.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-primary">{offer.title}</h3>
                </div>
                
                {/* Body */}
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                  
                  {/* Discount */}
                  <div className="flex items-center justify-center p-4 bg-secondary/10 rounded-xl">
                    <span className="text-3xl font-bold text-secondary">
                      {offer.discount_type === 'percentage' ? `${offer.discount_value}%` : `TZS ${offer.discount_value.toLocaleString()}`}
                    </span>
                    <span className="ml-2 text-muted-foreground">OFF</span>
                  </div>
                  
                  {/* Promo Code */}
                  {offer.code && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-xs text-muted-foreground">Promo Code</p>
                        <p className="font-mono font-bold text-primary">{offer.code}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(offer.code);
                          toast.success('Code copied!');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Min. Order</p>
                      <p className="font-medium">
                        {offer.min_order_amount > 0 ? `TZS ${offer.min_order_amount.toLocaleString()}` : 'None'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Uses</p>
                      <p className="font-medium">
                        {offer.current_uses || 0} / {offer.max_uses || '∞'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(offer.start_date).toLocaleDateString()} - {new Date(offer.end_date).toLocaleDateString()}
                  </div>
                  
                  {/* Toggle */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => toggleOfferStatus(offer)}
                  >
                    {offer.is_active ? 'Deactivate' : 'Activate'} Offer
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Offer Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., 20% Off First Service"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the offer..."
                className="mt-1"
                rows={2}
              />
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (TZS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value *</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '5000'}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label>Promo Code (optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                />
                <Button type="button" variant="outline" onClick={generateCode}>
                  Generate
                </Button>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Min. Order Amount (TZS)</Label>
                <Input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max Uses (0 = unlimited)</Label>
                <Input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 0 })}
                  placeholder="100"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : (editMode ? 'Update' : 'Create')} Offer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
