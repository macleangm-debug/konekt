import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Clock, CheckCircle2, AlertCircle, Eye, Download } from "lucide-react";
import api from "../../lib/api";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import { Button } from "../../components/ui/button";

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/customer/invoices");
        setInvoices(res.data || []);
      } catch (error) {
        console.error("Failed to load invoices:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700";
      case "sent":
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "paid":
        return "bg-emerald-100 text-emerald-700";
      case "partial":
        return "bg-blue-100 text-blue-700";
      case "overdue":
        return "bg-red-100 text-red-700";
      case "cancelled":
      case "void":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "paid":
        return <CheckCircle2 className="w-4 h-4" />;
      case "overdue":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter === "all") return true;
    if (filter === "unpaid") return inv.status !== "paid" && inv.balance_due > 0;
    if (filter === "paid") return inv.status === "paid";
    return inv.status === filter;
  });

  // Calculate totals
  const totalDue = invoices
    .filter(inv => inv.status !== "paid")
    .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-slate-200 h-24 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="customer-invoices-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Invoices</h1>
          <p className="mt-1 text-slate-600">View and pay your invoices.</p>
        </div>

        {totalDue > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">Total Outstanding</p>
            <p className="text-2xl font-bold text-amber-900">
              TZS {totalDue.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "unpaid", label: "Unpaid" },
          { key: "paid", label: "Paid" },
          { key: "overdue", label: "Overdue" },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? "bg-[#2D3E50]" : ""}
            data-testid={`filter-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Invoices List */}
      {filteredInvoices.length > 0 ? (
        <div className="space-y-4">
          {filteredInvoices.map(invoice => (
            <div
              key={invoice.id || invoice.invoice_number}
              className="rounded-2xl border bg-white p-5 hover:shadow-md transition"
              data-testid={`invoice-card-${invoice.invoice_number}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-6 h-6 text-[#2D3E50]" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{invoice.invoice_number}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {invoice.created_at
                        ? new Date(invoice.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                    {invoice.due_date && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {invoice.currency || "TZS"} {Number(invoice.total || 0).toLocaleString()}
                    </p>
                    {invoice.balance_due > 0 && invoice.status !== "paid" && (
                      <p className="text-sm text-amber-600">
                        Balance: {invoice.currency || "TZS"} {Number(invoice.balance_due).toLocaleString()}
                      </p>
                    )}
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      <span className="capitalize">{invoice.status}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/dashboard/invoices/${invoice.id}`}>
                      <Button variant="outline" data-testid={`view-invoice-${invoice.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    {invoice.balance_due > 0 && invoice.status !== "paid" && (
                      <Link to={`/payment/select?invoice=${invoice.id}`}>
                        <Button
                          className="bg-[#D4A843] hover:bg-[#c49a3d]"
                          data-testid={`pay-invoice-${invoice.id}`}
                        >
                          Pay Now
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Line items preview */}
              {invoice.line_items && invoice.line_items.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    {invoice.line_items.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {item.description || item.name || `Item ${idx + 1}`}
                      </span>
                    ))}
                    {invoice.line_items.length > 3 && (
                      <span className="text-xs text-slate-400">
                        +{invoice.line_items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          icon={Receipt}
          title="No invoices found"
          description={
            filter === "all"
              ? "You don't have any invoices yet."
              : `No ${filter} invoices found.`
          }
          testId="empty-invoices"
        />
      )}
    </div>
  );
}
