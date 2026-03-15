import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Receipt, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../../lib/api";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import { Button } from "../../components/ui/button";

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

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
      case "partially_paid":
        return "bg-blue-100 text-blue-700";
      case "overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const payNow = (invoice) => {
    navigate(
      `/payment/select?target_type=invoice&target_id=${invoice.id}&email=${encodeURIComponent(invoice.customer_email || "")}`,
      {
        state: {
          customerName: invoice.customer_name,
        },
      }
    );
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter === "all") return true;
    if (filter === "unpaid") return inv.status !== "paid" && Number(inv.balance_due || inv.total || 0) > 0;
    if (filter === "paid") return inv.status === "paid";
    return inv.status === filter;
  });

  // Calculate total due
  const totalDue = invoices
    .filter(inv => inv.status !== "paid")
    .reduce((sum, inv) => sum + Number(inv.balance_due || inv.total || 0), 0);

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-10 w-32 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="grid xl:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-3xl bg-slate-200 h-40 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!invoices.length) {
    return (
      <div className="p-6 md:p-8">
        <EmptyStateCard
          icon={Receipt}
          title="You have no invoices yet"
          text="Approved quotes and completed service requests will appear here for payment and tracking."
          ctaLabel="Browse services"
          ctaHref="/creative-services"
          testId="empty-invoices"
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="customer-invoices-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="text-left">
          <h1 className="text-4xl font-bold text-[#2D3E50]">Invoices</h1>
          <p className="text-slate-600 mt-2">
            Review invoices, preview balances, and complete payments online.
          </p>
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

      {/* Invoices Grid */}
      <div className="grid xl:grid-cols-2 gap-4">
        {filteredInvoices.map(invoice => (
          <div
            key={invoice.id || invoice.invoice_number}
            className="rounded-3xl border bg-white p-6"
            data-testid={`invoice-card-${invoice.invoice_number}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Invoice Number</div>
                <div className="text-xl font-bold mt-1 text-[#2D3E50]">{invoice.invoice_number}</div>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>

            <div className="mt-4 text-slate-600">
              Total: {invoice.currency || "TZS"} {Number(invoice.total || 0).toLocaleString()}
            </div>
            {Number(invoice.balance_due || 0) > 0 && invoice.status !== "paid" && (
              <div className="mt-1 text-amber-600 font-medium">
                Balance Due: {invoice.currency || "TZS"} {Number(invoice.balance_due || invoice.total || 0).toLocaleString()}
              </div>
            )}

            {invoice.due_date && (
              <div className="mt-1 text-sm text-slate-500">
                Due: {new Date(invoice.due_date).toLocaleDateString()}
              </div>
            )}

            <div className="mt-6 flex gap-3 flex-wrap">
              <Link to={`/dashboard/invoices/${invoice.id}`}>
                <Button variant="outline" data-testid={`preview-invoice-${invoice.id}`}>
                  Preview
                </Button>
              </Link>

              {["sent", "partially_paid", "draft"].includes(invoice.status) &&
                Number(invoice.balance_due || invoice.total || 0) > 0 && (
                  <Button
                    onClick={() => payNow(invoice)}
                    className="bg-[#D4A843] hover:bg-[#c49a3d]"
                    data-testid={`pay-invoice-${invoice.id}`}
                  >
                    Pay Now
                  </Button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
