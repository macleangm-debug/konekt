import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";
import uploadApi from "../../lib/uploadApi";
import { ArrowLeft, Upload, MessageSquare, Clock, User, FileText } from "lucide-react";

export default function ServiceRequestAdminDetailPage() {
  const { requestId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignForm, setAssignForm] = useState({ assigned_to: "", assigned_name: "" });
  const [statusForm, setStatusForm] = useState({ status: "", note: "" });
  const [comment, setComment] = useState("");
  const [deliverableNote, setDeliverableNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/api/admin/service-requests/${requestId}`);
      setItem(res.data);
      setStatusForm((prev) => ({ ...prev, status: res.data.status || "submitted" }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [requestId]);

  const assign = async () => {
    try {
      await api.post(`/api/admin/service-requests/${requestId}/assign`, assignForm);
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to assign");
    }
  };

  const updateStatus = async () => {
    try {
      await api.post(`/api/admin/service-requests/${requestId}/status`, statusForm);
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to update status");
    }
  };

  const addComment = async (visibility = "internal") => {
    if (!comment.trim()) return;
    try {
      await api.post(`/api/admin/service-requests/${requestId}/comments`, {
        message: comment,
        visibility,
      });
      setComment("");
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to add comment");
    }
  };

  const uploadDeliverable = async (file) => {
    try {
      setUploading(true);
      const uploaded = await uploadApi.uploadServiceRequestFile(file);
      await api.post(`/api/admin/service-requests/${requestId}/deliverables`, {
        file_url: uploaded.data.url,
        file_name: uploaded.data.filename,
        note: deliverableNote,
      });
      setDeliverableNote("");
      load();
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to upload deliverable");
    } finally {
      setUploading(false);
    }
  };

  const formatAnswerKey = (key) => {
    return key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "submitted": return "bg-blue-100 text-blue-700";
      case "in_progress": return "bg-amber-100 text-amber-700";
      case "awaiting_client_feedback": return "bg-purple-100 text-purple-700";
      case "revision_requested": return "bg-orange-100 text-orange-700";
      case "completed": return "bg-emerald-100 text-emerald-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-4"></div>
          <div className="h-32 bg-slate-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
        <div className="rounded-3xl border bg-white p-10 text-center">
          <p className="text-slate-500">Service request not found.</p>
          <Link to="/admin/service-requests" className="text-[#2D3E50] font-semibold mt-4 inline-block">
            ← Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="admin-service-request-detail">
      <Link to="/admin/service-requests" className="inline-flex items-center gap-2 text-slate-600 hover:text-[#2D3E50]">
        <ArrowLeft size={16} />
        Back to Service Requests
      </Link>

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500 capitalize">{item.category}</div>
            <div className="text-3xl font-bold mt-2 text-[#2D3E50]">{item.service_title}</div>
            <div className="text-slate-500 mt-2">{item.customer_name} • {item.customer_email}</div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
            {item.status?.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_420px] gap-6">
        <div className="space-y-6">
          {/* Submitted Information */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Submitted Information</h2>
            <div className="space-y-4 mt-5">
              {Object.entries(item.service_answers || {}).map(([key, value]) => (
                <div key={key} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">{formatAnswerKey(key)}</div>
                  <div className="mt-2 text-slate-800 whitespace-pre-wrap">{String(value || "-")}</div>
                </div>
              ))}
              {Object.keys(item.service_answers || {}).length === 0 && (
                <p className="text-slate-500">No additional information submitted.</p>
              )}
            </div>
          </div>

          {/* Deliverables */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Deliverables</h2>
            <div className="mt-4">
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[90px]"
                placeholder="Deliverable note (optional)"
                value={deliverableNote}
                onChange={(e) => setDeliverableNote(e.target.value)}
              />
              <label className="mt-4 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer hover:bg-slate-50">
                <Upload className="w-5 h-5 text-slate-500" />
                <span className="text-slate-600">{uploading ? "Uploading..." : "Upload Deliverable"}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadDeliverable(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="space-y-3 mt-5">
              {(item.deliverables || []).map((file, idx) => (
                <a
                  key={idx}
                  href={file.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-4 hover:bg-slate-100"
                >
                  <FileText className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="font-medium">{file.file_name || "Deliverable"}</div>
                    <div className="text-sm text-slate-500 mt-1">{file.note || "-"}</div>
                  </div>
                </a>
              ))}
              {(item.deliverables || []).length === 0 && (
                <p className="text-slate-500 text-center py-4">No deliverables uploaded yet.</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          {(item.timeline || []).length > 0 && (
            <div className="rounded-3xl border bg-white p-6">
              <h2 className="text-2xl font-bold text-[#2D3E50]">Timeline</h2>
              <div className="space-y-4 mt-5">
                {(item.timeline || []).map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="font-medium">{entry.label}</div>
                      {entry.note && <div className="text-sm text-slate-500 mt-1">{entry.note}</div>}
                      {entry.created_at && (
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(entry.created_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Assign */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Assign</h2>
            {item.assigned_name && (
              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-slate-50">
                <User className="w-4 h-4 text-slate-500" />
                <span>Currently: {item.assigned_name}</span>
              </div>
            )}
            <input
              className="w-full border rounded-xl px-4 py-3 mt-4"
              placeholder="Staff email"
              value={assignForm.assigned_to}
              onChange={(e) => setAssignForm({ ...assignForm, assigned_to: e.target.value })}
            />
            <input
              className="w-full border rounded-xl px-4 py-3 mt-4"
              placeholder="Staff name"
              value={assignForm.assigned_name}
              onChange={(e) => setAssignForm({ ...assignForm, assigned_name: e.target.value })}
            />
            <button onClick={assign} className="w-full mt-4 rounded-xl bg-[#2D3E50] text-white py-3 font-semibold hover:bg-[#1e2d3d]">
              Assign
            </button>
          </div>

          {/* Update Status */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Update Status</h2>
            <select
              className="w-full border rounded-xl px-4 py-3 mt-4"
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
            >
              <option value="submitted">Submitted</option>
              <option value="pending_review">Pending Review</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="in_progress">In Progress</option>
              <option value="awaiting_client_feedback">Awaiting Client Feedback</option>
              <option value="revision_requested">Revision Requested</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] mt-4"
              placeholder="Status note (optional)"
              value={statusForm.note}
              onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
            />
            <button onClick={updateStatus} className="w-full mt-4 rounded-xl bg-[#2D3E50] text-white py-3 font-semibold hover:bg-[#1e2d3d]">
              Update Status
            </button>
          </div>

          {/* Comments */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Comments</h2>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[110px] mt-4"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => addComment("internal")} className="rounded-xl border py-3 font-semibold hover:bg-slate-50">
                Internal Note
              </button>
              <button onClick={() => addComment("customer")} className="rounded-xl bg-[#D4A843] text-white py-3 font-semibold hover:bg-[#c49a3d]">
                Customer Update
              </button>
            </div>

            {(item.comments || []).length > 0 && (
              <div className="space-y-3 mt-5 pt-5 border-t">
                {(item.comments || []).map((c, idx) => (
                  <div key={idx} className={`rounded-xl p-4 ${c.visibility === "customer" ? "bg-blue-50 border border-blue-100" : "bg-slate-50"}`}>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MessageSquare className="w-3 h-3" />
                      <span>{c.visibility === "customer" ? "Customer visible" : "Internal"}</span>
                      {c.created_at && <span>• {new Date(c.created_at).toLocaleString()}</span>}
                    </div>
                    <p className="mt-2 text-slate-700">{c.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commercial Summary */}
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="text-2xl font-bold text-[#2D3E50]">Commercial Summary</h2>
            <div className="space-y-3 mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Price</span>
                <span>{item.currency} {Number(item.base_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Add-ons</span>
                <span>{item.currency} {Number(item.add_on_total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Total</span>
                <span>{item.currency} {Number(item.total_price || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
