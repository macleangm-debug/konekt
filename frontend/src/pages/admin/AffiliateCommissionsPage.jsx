import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Receipt, Loader2, RefreshCw, CheckCircle, DollarSign,
  Clock, TrendingUp
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { affiliateApi } from "../../lib/affiliateApi";

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
  };
  return (
    <Badge className={styles[status] || styles.pending}>
      {status}
    </Badge>
  );
}

export default function AffiliateCommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await affiliateApi.getAffiliateCommissions();
      setCommissions(res.data?.commissions || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load commissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id) => {
    try {
      await affiliateApi.approveAffiliateCommission(id);
      toast.success("Commission approved");
      load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve commission");
    }
  };

  const markPaid = async (id) => {
    try {
      await affiliateApi.markAffiliateCommissionPaid(id);
      toast.success("Commission marked as paid");
      load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to mark as paid");
    }
  };

  // Calculate summary stats
  const stats = {
    total: commissions.length,
    pending: commissions.filter(c => c.status === 'pending').length,
    approved: commissions.filter(c => c.status === 'approved').length,
    paid: commissions.filter(c => c.status === 'paid').length,
    totalAmount: commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    pendingAmount: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="affiliate-commissions-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Affiliate Commissions</h1>
          <p className="text-muted-foreground">Review and approve affiliate earnings</p>
        </div>
        <Button onClick={load} variant="outline" className="rounded-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Commissions</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.totalAmount.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-2xl font-bold text-[#D4A843] mt-1">
                {stats.pendingAmount.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-[#D4A843]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#D4A843]" />
            </div>
          </div>
        </div>
      </div>

      {/* Commissions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
      >
        {commissions.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No commissions yet</h3>
            <p className="text-muted-foreground">Commissions will appear when affiliates drive orders</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {commissions.map((commission, idx) => (
              <motion.div
                key={commission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-primary">
                        {commission.order_number}
                      </span>
                      <StatusBadge status={commission.status} />
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                      {commission.affiliate_email} • <code className="font-mono">{commission.affiliate_code}</code>
                    </p>

                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="text-slate-600">
                        Order: TZS {Number(commission.order_total || 0).toLocaleString()}
                      </span>
                      <span className="font-semibold text-[#D4A843]">
                        Commission: TZS {Number(commission.commission_amount || 0).toLocaleString()}
                      </span>
                      <span className="text-slate-500">
                        ({commission.commission_type === 'percentage' ? `${commission.commission_value}%` : 'Fixed'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {commission.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approve(commission.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    )}

                    {commission.status === "approved" && (
                      <Button
                        size="sm"
                        onClick={() => markPaid(commission.id)}
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
  );
}
