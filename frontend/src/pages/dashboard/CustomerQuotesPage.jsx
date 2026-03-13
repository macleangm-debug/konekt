import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock, CheckCircle2, XCircle, ArrowRight, Eye } from "lucide-react";
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "approved":
      case "converted":
        return <CheckCircle2 className="w-4 h-4" />;
      case "rejected":
      case "expired":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredQuotes = quotes.filter(q => {
    if (filter === "all") return true;
    if (filter === "pending") return q.status === "sent" || q.status === "pending";
    if (filter === "approved") return q.status === "approved" || q.status === "converted";
    return q.status === filter;
  });

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
    <div className="space-y-6" data-testid="customer-quotes-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Quotes</h1>
        <p className="mt-1 text-slate-600">Review and approve quotes from Konekt.</p>
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

      {/* Quotes List */}
      {filteredQuotes.length > 0 ? (
        <div className="space-y-4">
          {filteredQuotes.map(quote => (
            <div
              key={quote.id || quote.quote_number}
              className="rounded-2xl border bg-white p-5 hover:shadow-md transition"
              data-testid={`quote-card-${quote.quote_number}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-[#2D3E50]" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{quote.quote_number}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {quote.created_at
                        ? new Date(quote.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                    {quote.valid_until && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {quote.currency || "TZS"} {Number(quote.total || 0).toLocaleString()}
                    </p>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {getStatusIcon(quote.status)}
                      <span className="capitalize">{quote.status}</span>
                    </div>
                  </div>

                  <Link to={`/dashboard/quotes/${quote.id}`}>
                    <Button
                      variant={quote.status === "sent" || quote.status === "pending" ? "default" : "outline"}
                      className={quote.status === "sent" || quote.status === "pending" ? "bg-[#D4A843] hover:bg-[#c49a3d]" : ""}
                      data-testid={`view-quote-${quote.id}`}
                    >
                      {quote.status === "sent" || quote.status === "pending" ? (
                        <>Review & Approve</>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </>
                      )}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Line items preview */}
              {quote.line_items && quote.line_items.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">Items:</p>
                  <div className="flex flex-wrap gap-2">
                    {quote.line_items.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {item.description || item.name || `Item ${idx + 1}`}
                      </span>
                    ))}
                    {quote.line_items.length > 3 && (
                      <span className="text-xs text-slate-400">
                        +{quote.line_items.length - 3} more
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
          icon={FileText}
          title="No quotes found"
          description={
            filter === "all"
              ? "You don't have any quotes yet. Request a quote for your next project."
              : `No ${filter} quotes found.`
          }
          actionLabel="Request Quote"
          actionHref="/creative-services"
          testId="empty-quotes"
        />
      )}
    </div>
  );
}
