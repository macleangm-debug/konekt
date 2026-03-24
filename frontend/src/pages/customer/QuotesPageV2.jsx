import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Eye, Clock, CheckCircle, XCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import FilterBar from "../../components/ui/FilterBar";
import BrandButton from "../../components/ui/BrandButton";
import AccountBlankState from "../../components/ui/AccountBlankState";
import TableCardToggle from "../../components/common/TableCardToggle";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const QUOTE_STATUS_LABELS = {
  pending: "Awaiting Your Approval",
  approved: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

const QUOTE_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-700",
};

export default function QuotesPageV2() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState("table");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get(`${API_URL}/api/customer/quotes`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setQuotes(res.data || []))
      .catch(err => console.error("Failed to load quotes:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchValue || 
      (quote.quote_number || "").toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = !statusFilter || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    return QUOTE_STATUS_COLORS[status] || "bg-amber-100 text-amber-700";
  };

  const getStatusLabel = (status) => {
    return QUOTE_STATUS_LABELS[status] || (status || "pending").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div data-testid="quotes-page">
      <PageHeader 
        title="My Quotes"
        subtitle="View quotes and convert them to orders."
        actions={
          <div className="flex items-center gap-3">
            <TableCardToggle view={view} setView={setView} />
            <BrandButton href="/account/marketplace?tab=services" variant="primary">
              <FileText className="w-5 h-5 mr-2" />
              Request Quote
            </BrandButton>
          </div>
        }
      />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search quotes..."
        filters={[
          {
            name: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: "All Statuses",
            options: [
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "expired", label: "Expired" },
            ],
          },
        ]}
        className="mb-6"
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredQuotes.length > 0 ? (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <SurfaceCard key={quote.id || quote._id} className="hover:shadow-md transition">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#20364D]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#20364D]">
                      Quote #{quote.quote_number || quote.id?.slice(-8)}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                    {quote.valid_until && (
                      <div className="text-sm text-slate-500">
                        Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#20364D]">
                      TZS {Number(quote.total || 0).toLocaleString()}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadge(quote.status)}`}>
                      {getStatusLabel(quote.status)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {quote.status === "approved" && (
                      <BrandButton href={`/dashboard/quotes/${quote.id}/convert`} variant="gold" className="text-sm py-2">
                        Convert to Order
                      </BrandButton>
                    )}
                    <Link
                      to={`/dashboard/quotes/${quote.id || quote._id}`}
                      className="p-3 rounded-xl border hover:bg-slate-50 transition"
                    >
                      <Eye className="w-5 h-5 text-slate-500" />
                    </Link>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      ) : (
        <AccountBlankState
          icon="quotes"
          title="No quotes yet"
          description="Request quotes for custom orders, bulk purchases, or specialized services. Our team will prepare a tailored proposal."
          primaryLabel="Request a Quote"
          primaryAction="/services"
          secondaryLabel="Browse Products"
          secondaryAction="/marketplace"
          benefits={[
            { title: "Custom Pricing", description: "Get competitive rates for bulk orders and special requirements." },
            { title: "Valid for 30 Days", description: "Take your time to review and approve at your convenience." },
            { title: "One-Click Convert", description: "Approve and convert to order instantly when ready." },
          ]}
        />
      )}
    </div>
  );
}
