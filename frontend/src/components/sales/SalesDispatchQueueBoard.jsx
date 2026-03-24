import React from "react";
import { ArrowRight } from "lucide-react";
import useSalesDispatchBoard from "../../hooks/useSalesDispatchBoard";
import SalesPriorityCard from "./SalesPriorityCard";
import api from "../../lib/api";
import { toast } from "sonner";

function QueueItem({ row, actionLabel = "Open", onAction }) {
  return (
    <div className="rounded-lg bg-white border border-gray-100 p-3 hover:shadow-sm transition-all">
      <div className="text-sm font-medium text-[#0f172a] truncate">
        {row.title || row.company_name || row.quote_number || row.name || row.customer_name || "Sales item"}
      </div>
      <div className="text-xs text-[#94a3b8] mt-0.5 truncate">
        {row.email || row.phone || row.status || ""}
      </div>
      <button
        onClick={() => onAction && onAction(row)}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-[#1f3a5f] hover:text-[#0f172a] transition-colors"
      >
        {actionLabel}
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function SalesDispatchQueueBoard({ salesOwnerId = "" }) {
  const { data, loading, reload } = useSalesDispatchBoard(salesOwnerId);

  const handleClaim = async (lead) => {
    try {
      await api.post("/api/sales-command/claim-lead", {
        lead_id: lead.id,
        sales_owner_id: salesOwnerId,
        sales_owner_name: localStorage.getItem("userName") || "Sales Advisor",
      });
      toast.success("Lead claimed!");
      reload();
    } catch {
      toast.error("Failed to claim lead");
    }
  };

  const handleFollowUp = async (quote) => {
    try {
      await api.post("/api/sales-command/mark-followup", { quote_id: quote.id });
      toast.success("Marked as followed up");
      reload();
    } catch {
      toast.error("Failed to mark follow-up");
    }
  };

  if (loading) {
    return (
      <div className="grid xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-100 rounded w-12 mb-4" />
            <div className="space-y-2">
              <div className="h-16 bg-gray-50 rounded" />
              <div className="h-16 bg-gray-50 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid xl:grid-cols-4 gap-4" data-testid="sales-dispatch-board">
      <SalesPriorityCard title="New Leads" count={data?.counts?.new_leads} tone="blue">
        {(data?.new_leads || []).slice(0, 3).map((row) => (
          <QueueItem key={row.id} row={row} actionLabel="Claim" onAction={handleClaim} />
        ))}
      </SalesPriorityCard>

      <SalesPriorityCard title="Follow-ups Due" count={data?.counts?.followups_due} tone="yellow">
        {(data?.followups_due || []).slice(0, 3).map((row) => (
          <QueueItem key={row.id} row={row} actionLabel="Follow Up" onAction={handleFollowUp} />
        ))}
      </SalesPriorityCard>

      <SalesPriorityCard title="Overdue" count={data?.counts?.overdue_responses} tone="red">
        {(data?.overdue_responses || []).slice(0, 3).map((row) => (
          <QueueItem key={row.id} row={row} actionLabel="Respond" />
        ))}
      </SalesPriorityCard>

      <SalesPriorityCard title="Ready to Close" count={data?.counts?.ready_to_close} tone="green">
        {(data?.ready_to_close || []).slice(0, 3).map((row) => (
          <QueueItem key={row.id} row={row} actionLabel="Close" />
        ))}
      </SalesPriorityCard>
    </div>
  );
}
