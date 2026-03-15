import React, { useEffect, useState } from "react";
import { DollarSign, Check, X, Clock, CreditCard, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";

export default function AffiliatePayoutsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    try {
      setLoading(true);
      const url = filter === "all" 
        ? "/api/admin/affiliate-payouts" 
        : `/api/admin/affiliate-payouts?status=${filter}`;
      const res = await api.get(url);
      setItems(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const approve = async (id) => {
    try {
      await api.post(`/api/admin/affiliate-payouts/${id}/approve`, { note: "" });
      toast.success("Payout approved");
      load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to approve");
    }
  };

  const reject = async (id) => {
    const note = window.prompt("Rejection reason (optional)");
    try {
      await api.post(`/api/admin/affiliate-payouts/${id}/reject`, { note: note || "" });
      toast.success("Payout rejected");
      load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to reject");
    }
  };

  const markPaid = async (id) => {
    const reference = window.prompt("Enter payment reference");
    if (!reference) return;
    
    try {
      await api.post(`/api/admin/affiliate-payouts/${id}/mark-paid`, {
        payment_reference: reference,
        payment_method: "bank_transfer",
        note: "",
      });
      toast.success("Payout marked as paid");
      load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to mark as paid");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium"><Clock className="w-3 h-3" />Pending</span>;
      case "approved":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium"><Check className="w-3 h-3" />Approved</span>;
      case "paid":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"><CreditCard className="w-3 h-3" />Paid</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium"><X className="w-3 h-3" />Rejected</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="affiliate-payouts-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Affiliate Payouts</h1>
          <p className="mt-2 text-slate-600">
            Review, approve, and complete affiliate payout requests.
          </p>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-xl px-4 py-2"
        >
          <option value="all">All Payouts</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-10 text-center">
          <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No payout requests found</p>
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border bg-white p-6" data-testid={`payout-card-${item.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold text-[#2D3E50]">{item.affiliate_name}</div>
                  <div className="text-slate-500 mt-1">{item.affiliate_email}</div>
                </div>
                {getStatusBadge(item.status)}
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-slate-50">
                <div className="text-sm text-slate-500">Requested Amount</div>
                <div className="text-2xl font-bold text-[#2D3E50]">
                  TZS {Number(item.amount || 0).toLocaleString()}
                </div>
              </div>

              <div className="text-sm text-slate-500 mt-4">
                Requested: {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
              </div>

              {item.payment_reference && (
                <div className="text-sm text-slate-500 mt-1">
                  Payment Ref: {item.payment_reference}
                </div>
              )}

              {item.status === "pending" && (
                <div className="flex gap-3 mt-5">
                  <Button
                    onClick={() => approve(item.id)}
                    className="flex-1 bg-[#2D3E50] hover:bg-[#1e2d3d]"
                    data-testid={`approve-btn-${item.id}`}
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => reject(item.id)}
                    variant="outline"
                    className="flex-1"
                    data-testid={`reject-btn-${item.id}`}
                  >
                    Reject
                  </Button>
                </div>
              )}

              {item.status === "approved" && (
                <Button
                  onClick={() => markPaid(item.id)}
                  className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700"
                  data-testid={`mark-paid-btn-${item.id}`}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
