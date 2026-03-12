import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Wallet, Plus, Loader2, RefreshCw, CheckCircle, DollarSign,
  Clock
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { affiliateApi } from "../../lib/affiliateApi";

const initialForm = {
  affiliate_id: "",
  affiliate_email: "",
  requested_amount: 0,
  notes: "",
};

function StatusBadge({ status }) {
  const styles = {
    requested: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
  };
  return (
    <Badge className={styles[status] || styles.requested}>
      {status}
    </Badge>
  );
}

export default function AffiliatePayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await affiliateApi.getAffiliatePayouts();
      setPayouts(res.data?.payouts || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    
    if (!form.affiliate_id || !form.affiliate_email || form.requested_amount <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      await affiliateApi.createAffiliatePayoutRequest(form);
      toast.success("Payout request created");
      setForm(initialForm);
      load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create payout request");
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id) => {
    try {
      await affiliateApi.approveAffiliatePayout(id);
      toast.success("Payout approved");
      load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve payout");
    }
  };

  const markPaid = async (id) => {
    try {
      await affiliateApi.markAffiliatePayoutPaid(id);
      toast.success("Payout marked as paid");
      load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to mark as paid");
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
    <div className="space-y-6" data-testid="affiliate-payouts-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Affiliate Payouts</h1>
          <p className="text-muted-foreground">Manage affiliate payout requests</p>
        </div>
        <Button onClick={load} variant="outline" className="rounded-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid xl:grid-cols-[420px_1fr] gap-6">
        {/* Create Payout Request Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={save}
          className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 h-fit"
        >
          <h2 className="text-lg font-bold text-primary">Create Payout Request</h2>

          <div>
            <Label>Affiliate ID *</Label>
            <Input
              value={form.affiliate_id}
              onChange={(e) => setForm({ ...form, affiliate_id: e.target.value })}
              placeholder="Affiliate ID"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Affiliate Email *</Label>
            <Input
              type="email"
              value={form.affiliate_email}
              onChange={(e) => setForm({ ...form, affiliate_email: e.target.value })}
              placeholder="affiliate@email.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Requested Amount (TZS) *</Label>
            <Input
              type="number"
              value={form.requested_amount}
              onChange={(e) => setForm({ ...form, requested_amount: Number(e.target.value) })}
              className="mt-1"
              min={0}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Request Payout
              </>
            )}
          </Button>
        </motion.form>

        {/* Payouts List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 p-6"
        >
          <h2 className="text-lg font-bold text-primary mb-6">
            Payout Requests ({payouts.length})
          </h2>

          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No payout requests yet</h3>
              <p className="text-muted-foreground">Payout requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout, idx) => (
                <motion.div
                  key={payout.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-primary">
                          {payout.affiliate_email}
                        </span>
                        <StatusBadge status={payout.status} />
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <DollarSign className="w-4 h-4 text-[#D4A843]" />
                        <span className="text-lg font-bold text-[#D4A843]">
                          TZS {Number(payout.requested_amount || 0).toLocaleString()}
                        </span>
                      </div>

                      {payout.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{payout.notes}</p>
                      )}

                      <p className="text-xs text-slate-400 mt-2">
                        {payout.created_at ? new Date(payout.created_at).toLocaleDateString() : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {payout.status === "requested" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approve(payout.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}

                      {payout.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => markPaid(payout.id)}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
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
