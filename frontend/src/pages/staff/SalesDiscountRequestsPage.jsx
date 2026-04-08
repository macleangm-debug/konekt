import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  Clock, CheckCircle, XCircle, Loader2, Plus, Shield, AlertTriangle
} from "lucide-react";
import SalesDiscountRequestModal from "../../components/sales/SalesDiscountRequestModal";

const STATUS_STYLES = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending", icon: Clock },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Approved", icon: CheckCircle },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected", icon: XCircle },
};

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return "-"; }
}

export default function SalesDiscountRequestsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/api/staff/discount-requests");
      setItems(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="sales-discount-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sales-discount-requests-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">My Discount Requests</h1>
          <p className="text-sm text-slate-500 mt-1">Track your submitted discount requests</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1a2b3c] text-white text-sm font-medium hover:bg-[#2a3b4c] transition"
          data-testid="new-discount-request-btn"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400">No discount requests yet.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-[#D4A843] text-white text-sm font-medium hover:bg-[#c49933] transition"
            data-testid="empty-new-request-btn"
          >
            Create First Request
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="sales-discount-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Reference</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Discount</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Final Price</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Margin</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const st = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
                  const StatusIcon = st.icon;
                  return (
                    <tr key={item.request_id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`sales-request-row-${item.request_id}`}>
                      <td className="px-4 py-3 text-slate-600">{shortDate(item.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.request_id}</td>
                      <td className="px-4 py-3 text-slate-700">{item.customer_name || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {item.quote_ref || item.order_ref || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        -{money(item.discount_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{money(item.proposed_final_price)}</td>
                      <td className="px-4 py-3 text-center">
                        {item.margin_safe ? (
                          <Shield className="w-4 h-4 text-emerald-500 inline" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500 inline" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${st.bg} ${st.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SalesDiscountRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); load(); }}
      />
    </div>
  );
}
