import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../lib/api";

export default function ServiceRequestDetailPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [requestItem, setRequestItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/service-requests/my/${requestId}`);
        setRequestItem(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId]);

  const goToPayment = () => {
    navigate("/creative-services/checkout", {
      state: {
        projectDraft: requestItem,
      },
    });
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

  const formatAnswerKey = (key) => {
    return key
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-32 bg-slate-200 rounded-3xl mt-6"></div>
        </div>
      </div>
    );
  }

  if (!requestItem) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-3xl border bg-white p-10 text-center">
          <h2 className="text-2xl font-bold text-slate-700">Request not found</h2>
          <p className="text-slate-500 mt-2">The requested service request could not be found.</p>
          <Link 
            to="/account/service-requests" 
            className="inline-flex items-center gap-2 mt-6 text-[#2D3E50] font-semibold"
          >
            <ArrowLeft size={16} />
            Back to Service Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6" data-testid="service-request-detail-page">
      <Link 
        to="/account/service-requests" 
        className="inline-flex items-center gap-2 text-slate-600 hover:text-[#2D3E50] transition-colors"
        data-testid="back-to-requests"
      >
        <ArrowLeft size={16} />
        Back to Service Requests
      </Link>

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">{requestItem.category}</div>
            <div className="text-3xl font-bold mt-2 text-[#2D3E50]">
              {requestItem.service_title}
            </div>
            <div className="text-slate-500 mt-2">{requestItem.company_name || requestItem.customer_name}</div>
          </div>

          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(requestItem.status)}`}>
            {requestItem.status}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Submitted Information</h2>
            <div className="space-y-4 mt-5">
              {Object.entries(requestItem.service_answers || {}).map(([key, value]) => (
                <div key={key} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">{formatAnswerKey(key)}</div>
                  <div className="text-slate-800 mt-2 whitespace-pre-wrap">{String(value || "-")}</div>
                </div>
              ))}
              {Object.keys(requestItem.service_answers || {}).length === 0 && (
                <div className="text-slate-500 text-center py-6">No additional information submitted.</div>
              )}
            </div>
          </div>

          {requestItem.selected_add_ons && requestItem.selected_add_ons.length > 0 && (
            <div className="rounded-3xl border bg-white p-6">
              <h2 className="text-2xl font-bold text-[#2D3E50]">Selected Add-ons</h2>
              <div className="space-y-3 mt-5">
                {requestItem.selected_add_ons.map((addon, idx) => (
                  <div key={addon.id || idx} className="flex items-center justify-between p-4 border rounded-2xl">
                    <div>
                      <div className="font-semibold text-slate-800">{addon.title}</div>
                      <div className="text-sm text-slate-500">{addon.description}</div>
                    </div>
                    <div className="font-semibold text-[#2D3E50]">
                      {requestItem.currency} {Number(addon.price || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Commercial Summary</h2>
            <div className="space-y-3 mt-5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Price</span>
                <span className="text-slate-800">{requestItem.currency} {Number(requestItem.base_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Add-ons</span>
                <span className="text-slate-800">{requestItem.currency} {Number(requestItem.add_on_total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span className="text-slate-800">Total</span>
                <span className="text-[#2D3E50]">{requestItem.currency} {Number(requestItem.total_price || 0).toLocaleString()}</span>
              </div>
            </div>

            {requestItem.requires_payment &&
              requestItem.payment_choice === "pay_now" &&
              ["submitted", "pending_payment"].includes(requestItem.status) && (
                <button
                  type="button"
                  onClick={goToPayment}
                  className="w-full mt-6 rounded-xl bg-[#2D3E50] text-white py-3 font-semibold hover:bg-[#1e2d3d] transition-colors"
                  data-testid="continue-payment-btn"
                >
                  Continue Payment
                </button>
              )}
          </div>

          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Contact Details</h2>
            <div className="space-y-2 mt-4 text-slate-600">
              <div className="font-medium text-slate-800">{requestItem.customer_name || "-"}</div>
              <div>{requestItem.customer_email || "-"}</div>
              <div>{requestItem.phone_prefix || ""} {requestItem.phone_number || ""}</div>
              <div className="pt-2 border-t mt-3">
                <div>{requestItem.address_line_1 || "-"}</div>
                {requestItem.address_line_2 && <div>{requestItem.address_line_2}</div>}
                <div>{requestItem.city || "-"}, {requestItem.country || "-"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Request Info</h2>
            <div className="space-y-2 mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Choice</span>
                <span className="font-medium">{requestItem.payment_choice === "pay_now" ? "Pay Now" : "Quote First"}</span>
              </div>
              {requestItem.created_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted</span>
                  <span>{new Date(requestItem.created_at).toLocaleDateString()}</span>
                </div>
              )}
              {requestItem.updated_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Updated</span>
                  <span>{new Date(requestItem.updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
