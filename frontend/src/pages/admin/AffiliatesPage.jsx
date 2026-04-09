import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, Plus, Trash2, Loader2, RefreshCw, Link as LinkIcon,
  Mail, Percent, DollarSign, CheckCircle, XCircle, Copy
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { affiliateApi } from "../../lib/affiliateApi";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";

const initialForm = {
  name: "",
  email: "",
  affiliate_code: "",
  affiliate_link: "",
  is_active: true,
  commission_type: "percentage",
  commission_value: 10,
  notes: "",
};

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState([]);
  const { confirmAction } = useConfirmModal();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await affiliateApi.getAffiliates();
      setAffiliates(res.data?.affiliates || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => setForm(initialForm);

  const save = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.email || !form.affiliate_code) {
      toast.error("Name, email, and affiliate code are required");
      return;
    }

    setSaving(true);
    try {
      await affiliateApi.createAffiliate(form);
      toast.success("Affiliate created");
      resetForm();
      load();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to create affiliate");
    } finally {
      setSaving(false);
    }
  };

  const deleteAffiliate = async (affiliateId) => {
    confirmAction({
      title: "Delete Affiliate?",
      message: "This affiliate will be permanently deleted.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          await affiliateApi.deleteAffiliate(affiliateId);
          toast.success("Affiliate deleted");
          load();
        } catch (error) {
          console.error(error);
          toast.error("Failed to delete affiliate");
        }
      },
    });
  };

  const copyLink = async (affiliate) => {
    const link = `${window.location.origin}/a/${affiliate.affiliate_code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Affiliate link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="affiliates-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Affiliates</h1>
          <p className="text-muted-foreground">Manage affiliate partners and their commission settings</p>
        </div>
        <Button onClick={load} variant="outline" className="rounded-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid xl:grid-cols-[460px_1fr] gap-6">
        {/* Create Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={save}
          className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 h-fit"
        >
          <h2 className="text-lg font-bold text-primary">Create New Affiliate</h2>

          <div>
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Partner name"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="partner@email.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Affiliate Code *</Label>
            <Input
              value={form.affiliate_code}
              onChange={(e) => update("affiliate_code", e.target.value.toUpperCase())}
              placeholder="e.g., PARTNER10"
              className="mt-1 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be used in promo codes and tracking links
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commission Type</Label>
              <Select value={form.commission_type} onValueChange={(v) => update("commission_type", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Commission Value</Label>
              <Input
                type="number"
                value={form.commission_value}
                onChange={(e) => update("commission_value", Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Internal notes about this affiliate..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => update("is_active", checked)}
            />
            <span className="text-sm font-medium">Active</span>
          </label>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Affiliate
              </>
            )}
          </Button>
        </motion.form>

        {/* Affiliates List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 p-6"
        >
          <h2 className="text-lg font-bold text-primary mb-6">
            Affiliate Partners ({affiliates.length})
          </h2>

          {affiliates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No affiliates yet</h3>
              <p className="text-muted-foreground">Create your first affiliate partner</p>
            </div>
          ) : (
            <div className="space-y-4">
              {affiliates.map((affiliate, idx) => (
                <motion.div
                  key={affiliate.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border p-4 ${
                    affiliate.is_active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-primary">{affiliate.name}</h3>
                        <Badge className={affiliate.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                          {affiliate.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="w-3.5 h-3.5" />
                        {affiliate.email}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        <div className="flex items-center gap-1 text-sm">
                          <LinkIcon className="w-4 h-4 text-primary" />
                          <code className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {affiliate.affiliate_code}
                          </code>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          {affiliate.commission_type === 'percentage' ? (
                            <Percent className="w-4 h-4" />
                          ) : (
                            <DollarSign className="w-4 h-4" />
                          )}
                          {affiliate.commission_value}
                          {affiliate.commission_type === 'percentage' ? '%' : ' TZS'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(affiliate)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAffiliate(affiliate.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
