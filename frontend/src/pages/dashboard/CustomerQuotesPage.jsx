import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import api from "../../lib/api";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import { Button } from "../../components/ui/button";

export default function CustomerQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/customer/quotes");
        setQuotes(res.data || []);
      } catch (error) {
        console.error("Failed to load quotes:", error);
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
      case "approved":
        return "bg-emerald-100 text-emerald-700";
      case "converted":
        return "bg-blue-100 text-blue-700";
      case "rejected":
      case "expired":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const filteredQuotes = quotes.filter(q => {
    if (filter === "all") return true;
    if (filter === "pending") return q.status === "sent" || q.status === "pending" || q.status === "draft";
    if (filter === "approved") return q.status === "approved" || q.status === "converted";
    return q.status === filter;
  });

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

  if (!quotes.length) {
    return (
      <div className="p-6 md:p-8">
        <EmptyStateCard
          icon={FileText}
          title="You have no quotes yet"
          text="Need a custom solution, creative service, or branded products? Request a quote and keep your business moving."
          ctaLabel="Explore services"
          ctaHref="/creative-services"
          testId="empty-quotes"
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="customer-quotes-page">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-4xl font-bold text-[#2D3E50]">My Quotes</h1>
        <p className="text-slate-600 mt-2">
          Preview your quotes, approve them, and convert them into invoices for payment.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
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

      {/* Quotes Grid */}
      <div className="grid xl:grid-cols-2 gap-4">
        {filteredQuotes.map(quote => (
          <div
            key={quote.id || quote.quote_number}
            className="rounded-3xl border bg-white p-6"
            data-testid={`quote-card-${quote.quote_number}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Quote Number</div>
                <div className="text-xl font-bold mt-1 text-[#2D3E50]">{quote.quote_number}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(quote.status)}`}>
                {quote.status}
              </span>
            </div>

            <div className="mt-4 text-slate-600">
              {quote.currency || "TZS"} {Number(quote.total || 0).toLocaleString()}
            </div>
            
            {quote.valid_until && (
              <div className="mt-1 text-sm text-slate-500">
                Valid until: {new Date(quote.valid_until).toLocaleDateString()}
              </div>
            )}

            <div className="mt-6 flex gap-3 flex-wrap">
              <Link to={`/dashboard/quotes/${quote.id}`}>
                <Button variant="outline" data-testid={`preview-quote-${quote.id}`}>
                  Preview
                </Button>
              </Link>

              {["draft", "sent", "pending", "approved"].includes(quote.status) && (
                <Link to={`/dashboard/quotes/${quote.id}`}>
                  <Button 
                    className="bg-[#2D3E50] hover:bg-[#253242]"
                    data-testid={`approve-quote-${quote.id}`}
                  >
                    Approve / Continue
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
