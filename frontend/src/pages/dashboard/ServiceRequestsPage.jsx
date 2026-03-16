import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import PromoArtCards from "../../components/customer/PromoArtCards";
import { ClipboardList, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repeatingId, setRepeatingId] = useState(null);

  const loadRequests = async () => {
    try {
      const res = await api.get("/api/service-requests/my");
      setRequests(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRepeatRequest = async (requestId) => {
    setRepeatingId(requestId);
    try {
      await api.post(`/api/repeat-service-requests/${requestId}`);
      toast.success("Service request duplicated! Check your new request.");
      loadRequests();
    } catch (error) {
      toast.error("Failed to repeat request. Please try again.");
    } finally {
      setRepeatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-700";
      case "in_progress":
      case "processing":
        return "bg-amber-100 text-amber-700";
      case "completed":
      case "delivered":
        return "bg-emerald-100 text-emerald-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case "creative":
        return "Creative";
      case "maintenance":
        return "Maintenance";
      case "support":
        return "Support";
      case "copywriting":
        return "Copywriting";
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-72 bg-slate-200 rounded"></div>
        </div>
        <div className="grid xl:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-3xl bg-slate-200 h-48 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div className="p-6 md:p-8 space-y-8" data-testid="service-requests-page-empty">
        <EmptyStateCard
          icon={ClipboardList}
          title="No service requests yet"
          text="You have not submitted any creative, maintenance, support, or copywriting requests yet. Start with the service you need and we will guide you through the process."
          ctaLabel="Browse Services"
          ctaHref="/services"
          secondaryCtaLabel="View Products"
          secondaryCtaHref="/products"
          testId="empty-service-requests"
        />
        <PromoArtCards />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="service-requests-page">
      <div className="text-left">
        <h1 className="text-4xl font-bold text-[#2D3E50]">Service Requests</h1>
        <p className="text-slate-600 mt-2">
          Track your creative, maintenance, support, and copywriting requests in one place.
        </p>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        {requests.map((item) => (
          <div key={item.id} className="rounded-3xl border bg-white p-6" data-testid={`service-request-card-${item.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">{getCategoryLabel(item.category)}</div>
                <div className="text-xl font-bold mt-1 text-[#2D3E50]">{item.service_title}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
            </div>

            <div className="mt-4 text-slate-600">
              {item.currency} {Number(item.total_price || 0).toLocaleString()}
            </div>

            {item.created_at && (
              <div className="mt-1 text-sm text-slate-500">
                Submitted: {new Date(item.created_at).toLocaleDateString()}
              </div>
            )}

            <div className="mt-6 flex gap-3 flex-wrap">
              <Link
                to={`/dashboard/service-requests/${item.id}`}
                className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50 transition-colors"
                data-testid={`view-request-${item.id}`}
              >
                View Details
              </Link>

              {/* Repeat Request Button - show for completed requests */}
              {["completed", "delivered"].includes(item.status) && (
                <Button
                  variant="outline"
                  onClick={() => handleRepeatRequest(item.id)}
                  disabled={repeatingId === item.id}
                  data-testid={`repeat-request-${item.id}`}
                  className="rounded-xl"
                >
                  {repeatingId === item.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Repeat Request
                </Button>
              )}

              {item.requires_payment &&
                item.payment_choice === "pay_now" &&
                ["submitted", "pending_payment"].includes(item.status) && (
                  <Link
                    to="/creative-services/checkout"
                    state={{ projectDraft: item }}
                    className="rounded-xl bg-[#2D3E50] text-white px-4 py-3 font-medium hover:bg-[#1e2d3d] transition-colors"
                    data-testid={`continue-payment-${item.id}`}
                  >
                    Continue Payment
                  </Link>
                )}
            </div>
          </div>
        ))}
      </div>

      <PromoArtCards />
    </div>
  );
}
