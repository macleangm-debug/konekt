import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Users, ShoppingCart, Shield, Share2, MessageCircle, Copy, Package, ArrowRight, Check, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;
function fmtDate(v) { if (!v) return "-"; try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

const statusConfig = {
  pending_payment: { label: "Awaiting Payment", cls: "bg-amber-100 text-amber-700", desc: "Submit your payment to secure your spot" },
  payment_submitted: { label: "Under Review", cls: "bg-blue-100 text-blue-700", desc: "Payment submitted — being verified" },
  committed: { label: "Active", cls: "bg-green-100 text-green-700", desc: "Payment approved — waiting for target" },
  order_created: { label: "Successful", cls: "bg-emerald-100 text-emerald-700", desc: "Your order is being prepared" },
  refund_pending: { label: "Refund Pending", cls: "bg-orange-100 text-orange-700", desc: "Refund is being processed" },
  refunded: { label: "Refunded", cls: "bg-slate-100 text-slate-600", desc: "Refund completed" },
};

function CommitmentCard({ item }) {
  const sc = statusConfig[item.status] || statusConfig.committed;
  const campaign = item.campaign || {};
  const progress = campaign.display_target > 0 ? Math.round((campaign.current_committed / campaign.display_target) * 100) : 0;
  const daysLeft = campaign.deadline ? Math.max(0, Math.ceil((new Date(campaign.deadline) - new Date()) / 86400000)) : 0;
  const dealUrl = `${window.location.origin}/group-deals/${campaign.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(dealUrl).then(() => toast.success("Link copied!")).catch(() => {});
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" data-testid={`gd-commitment-${item.commitment_id}`}>
      {/* Header with image */}
      <div className="flex gap-3 p-4">
        {campaign.product_image ? (
          <img src={campaign.product_image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#20364D] to-[#1a365d] flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-6 h-6 text-white/30" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-bold text-[#20364D] truncate">{campaign.product_name || item.campaign_name}</div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${sc.cls}`}>{sc.label}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{sc.desc}</div>
        </div>
      </div>

      {/* Commitment details */}
      <div className="px-4 pb-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Your Quantity</span>
            <div className="font-bold text-[#20364D]">{item.quantity} units</div>
          </div>
          <div>
            <span className="text-slate-400">Total Paid</span>
            <div className="font-bold text-[#D4A843]">{fmt(item.amount)}</div>
          </div>
        </div>

        {/* Progress bar */}
        {campaign.status === "active" && (
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>{campaign.current_committed}/{campaign.display_target} units</span>
              <span>{campaign.buyer_count || 0} buyers</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-[#D4A843]"}`}
                style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px]">
              <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{daysLeft}d left</span>
              <span className="text-slate-500">{progress}%</span>
            </div>
          </div>
        )}

        {/* Joined date */}
        <div className="text-[10px] text-slate-400">Joined {fmtDate(item.created_at)}</div>
      </div>

      {/* Actions */}
      <div className="border-t px-4 py-3 flex items-center gap-2">
        {item.status === "committed" && (
          <>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Check out this group deal: ${campaign.product_name} — ${dealUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold"
              data-testid="share-whatsapp">
              <MessageCircle className="w-3 h-3" /> Share
            </a>
            <button onClick={copyLink} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
              data-testid="copy-link">
              <Copy className="w-3 h-3" /> Copy Link
            </button>
          </>
        )}
        {item.status === "order_created" && item.order_number && (
          <Link to={`/account/orders`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#20364D] text-white text-xs font-semibold"
            data-testid="view-order-btn">
            <Package className="w-3 h-3" /> View Order
          </Link>
        )}
        {item.status === "refunded" && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Check className="w-3 h-3 text-green-500" /> Refund processed — {fmt(item.amount)}
          </div>
        )}
        {item.status === "refund_pending" && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <RefreshCw className="w-3 h-3" /> Refund processing...
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountGroupDealsPage() {
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCommitments = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("konekt_token");
        if (!token) { setLoading(false); return; }
        // Get user profile to find phone/email
        const profileRes = await api.get("/api/customer/profile", {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);
        const phone = profileRes?.data?.phone || profileRes?.data?.customer_phone || "";
        const email = profileRes?.data?.email || "";
        if (!phone && !email) { setLoading(false); return; }

        const params = phone ? `?phone=${encodeURIComponent(phone)}` : `?email=${encodeURIComponent(email)}`;
        const res = await api.get(`/api/customer/group-deals${params}`);
        setCommitments(res.data || []);
      } catch {
        // silently fail
      } finally { setLoading(false); }
    };
    loadCommitments();
  }, []);

  return (
    <div className="space-y-6" data-testid="account-group-deals-page">
      <div>
        <h1 className="text-xl font-bold text-[#20364D]">My Group Deals</h1>
        <p className="text-sm text-slate-500 mt-1">Track your group deal commitments, progress, and outcomes.</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading...</div>
      ) : commitments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500 font-semibold mb-1">No group deals yet</div>
          <p className="text-sm text-slate-400 mb-4">Join a group deal to save with volume pricing.</p>
          <Link to="/group-deals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#20364D] hover:text-[#D4A843]"
            data-testid="browse-deals-link">
            Browse Group Deals <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {commitments.map((c) => <CommitmentCard key={c.commitment_id} item={c} />)}
        </div>
      )}
    </div>
  );
}
