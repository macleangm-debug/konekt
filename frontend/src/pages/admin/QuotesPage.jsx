import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Send, Search, Plus, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/adminApi";
import { formatMoney } from "@/utils/finance";
import { safeDisplay } from "@/utils/safeDisplay";
import { toast } from "sonner";
import api from "@/lib/api";

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  waiting_for_pricing: "bg-amber-100 text-amber-700",
  ready_to_send: "bg-teal-100 text-teal-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  converted: "bg-purple-100 text-purple-700",
};

export default function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getQuotes();
      setQuotes(Array.isArray(res.data) ? res.data : res.data?.quotes || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (quoteId, status) => {
    try {
      await adminApi.updateQuoteStatus(quoteId, status);
      toast.success(`Quote ${status.replace(/_/g, " ")}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const sendQuote = async (quoteId) => {
    try {
      await adminApi.sendQuoteDocument(quoteId);
      toast.success("Quote sent");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to send"); }
  };

  const requestDiscount = async (quoteId, quoteNumber) => {
    const reason = prompt("Why does this deal need a discount?");
    if (!reason) return;
    try {
      await api.post("/api/staff/discount-requests", { quote_id: quoteId, quote_number: quoteNumber, reason, requested_by: "sales" });
      toast.success("Discount request submitted for approval");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const filtered = quotes.filter((q) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (q.quote_number || "").toLowerCase().includes(t) || (q.customer_name || "").toLowerCase().includes(t) || (q.customer_company || "").toLowerCase().includes(t);
  });

  return (
    <div className="space-y-5" data-testid="quotes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D] flex items-center gap-2"><FileText className="w-6 h-6 text-[#D4A843]" /> Quotes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage customer quotes — prices come from the system</p>
        </div>
        <Button onClick={() => navigate("/admin/quotes/new")} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="create-quote-btn">
          <Plus className="w-4 h-4 mr-1" /> Create Quote
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search quotes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" data-testid="quote-search" />
        </div>
        <span className="text-xs text-slate-400">{filtered.length} quotes</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border"><FileText className="w-10 h-10 mx-auto mb-2 text-slate-200" /><p className="text-sm text-slate-400">No quotes yet</p></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden w-full" data-testid="quotes-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr className="border-b bg-slate-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-[18%]">Quote #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-[25%]">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-[15%]">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-[15%]">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-[27%]">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => navigate(`/admin/quotes/${q.id}`)} data-testid={`quote-row-${q.id}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#20364D]">{safeDisplay(q.quote_number)}</div>
                      <div className="text-[10px] text-slate-400">{q.created_at ? new Date(q.created_at).toLocaleDateString() : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{safeDisplay(q.customer_name || q.customer_company)}</div>
                      <div className="text-[10px] text-slate-400">{safeDisplay(q.customer_email)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(q.total)}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Badge className={`${statusColors[q.status] || "bg-slate-100 text-slate-500"} text-[10px]`} data-testid={`quote-status-${q.id}`}>
                        {(q.status || "draft").replace(/_/g, " ")}
                      </Badge>
                      {q.generated_invoice && <div className="text-[9px] text-emerald-600 mt-0.5">{q.generated_invoice}</div>}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {(q.status === "draft" || q.status === "ready_to_send") && (
                          <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => sendQuote(q.id)} data-testid={`quote-send-${q.id}`}>
                            <Send className="w-3 h-3 mr-0.5" /> Send
                          </Button>
                        )}
                        {q.status === "waiting_for_pricing" && (
                          <Badge className="bg-amber-50 text-amber-600 text-[9px]">Awaiting Operations</Badge>
                        )}
                        {q.status === "sent" && (
                          <>
                            <Button size="sm" variant="outline" className="text-[10px] h-7 text-emerald-600 border-emerald-200" onClick={() => changeStatus(q.id, "approved")} data-testid={`quote-approve-${q.id}`}>Approve</Button>
                            <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => requestDiscount(q.id, q.quote_number)} data-testid={`quote-discount-${q.id}`}>
                              <Tag className="w-3 h-3 mr-0.5" /> Discount
                            </Button>
                          </>
                        )}
                        {q.status === "approved" && q.generated_order && (
                          <Badge className="bg-green-50 text-green-600 text-[9px]">Order: {q.generated_order}</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
