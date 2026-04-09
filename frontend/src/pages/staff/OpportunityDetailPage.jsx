import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Clock, 
  Tag,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "Contacted", color: "bg-cyan-100 text-cyan-700" },
  { value: "quote_in_progress", label: "Quote in Progress", color: "bg-amber-100 text-amber-700" },
  { value: "quote_sent", label: "Quote Sent", color: "bg-purple-100 text-purple-700" },
  { value: "approved", label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  { value: "handed_to_ops", label: "Handed to Ops", color: "bg-indigo-100 text-indigo-700" },
  { value: "won", label: "Won", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700" },
];

const GUIDED_QUESTIONS = [
  { id: "q1", question: "What is the customer's primary business need?", type: "text" },
  { id: "q2", question: "What is the expected timeline for this request?", type: "select", options: ["Urgent (ASAP)", "Within 1 week", "Within 1 month", "Flexible"] },
  { id: "q3", question: "What is the approximate budget range?", type: "select", options: ["Under 100K TZS", "100K - 500K TZS", "500K - 1M TZS", "Over 1M TZS", "Not discussed"] },
  { id: "q4", question: "Has the customer worked with us before?", type: "select", options: ["Yes - Existing customer", "No - New customer", "Referral", "Unknown"] },
  { id: "q5", question: "Additional notes from conversation", type: "textarea" },
];

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState("");

  const token = localStorage.getItem("staff_token") || localStorage.getItem("token");

  useEffect(() => {
    loadOpportunity();
  }, [id]);

  const loadOpportunity = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sales-queue/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setOpportunity(data);
      setAnswers(data.guided_answers || {});
      setNotes(data.internal_notes || "");
    } catch (err) {
      toast.error("Failed to load opportunity");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStage = async (newStage) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/sales-queue/${id}/stage`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Stage updated to ${newStage}`);
      loadOpportunity();
    } catch (err) {
      toast.error("Failed to update stage");
    } finally {
      setUpdating(false);
    }
  };

  const saveGuidedAnswers = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/sales-queue/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          guided_answers: answers,
          internal_notes: notes 
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Notes saved successfully");
    } catch (err) {
      toast.error("Failed to save notes");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#20364D]"></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-700">Opportunity not found</h1>
          <button
            onClick={() => navigate("/staff/queue")}
            className="mt-4 text-[#20364D] font-semibold hover:underline"
          >
            Back to Sales Queue
          </button>
        </div>
      </div>
    );
  }

  const intentPayload = opportunity.intent_payload || {};
  const currentStage = STAGES.find(s => s.value === opportunity.stage) || STAGES[0];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="opportunity-detail-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/staff/queue")}
            className="p-2 hover:bg-slate-200 rounded-lg transition"
            data-testid="back-to-queue"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#20364D]">
              {opportunity.title || `Opportunity - ${opportunity.customer_name}`}
            </h1>
            <p className="text-slate-500 mt-1">
              Created {new Date(opportunity.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${currentStage.color}`}>
            {currentStage.label}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="rounded-2xl bg-white border p-6" data-testid="customer-info-card">
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Customer Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500">Name</div>
                    <div className="font-medium">{opportunity.customer_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500">Email</div>
                    <div className="font-medium">{opportunity.customer_email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500">Phone</div>
                    <div className="font-medium">{opportunity.customer_phone || "Not provided"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500">Company</div>
                    <div className="font-medium">{opportunity.company_name || "Not provided"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="rounded-2xl bg-white border p-6" data-testid="request-details-card">
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Request Details</h2>
              
              <div className="space-y-4">
                {intentPayload.service_category && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500">Service Category</div>
                      <div className="font-medium capitalize">{intentPayload.service_category.replace(/_/g, " ")}</div>
                    </div>
                  </div>
                )}
                
                {intentPayload.service_details && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500">Service Details</div>
                      <div className="font-medium">{intentPayload.service_details}</div>
                    </div>
                  </div>
                )}
                
                {intentPayload.urgency && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500">Urgency</div>
                      <div className="font-medium capitalize">{intentPayload.urgency.replace(/_/g, " ")}</div>
                    </div>
                  </div>
                )}
                
                {intentPayload.budget_range && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500">Budget Range</div>
                      <div className="font-medium">{intentPayload.budget_range}</div>
                    </div>
                  </div>
                )}
                
                {intentPayload.additional_notes && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500">Additional Notes</div>
                      <div className="font-medium">{intentPayload.additional_notes}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {opportunity.tags && opportunity.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    {opportunity.tags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Guided Questions */}
            <div className="rounded-2xl bg-white border p-6" data-testid="guided-questions-card">
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Guided Questions</h2>
              <div className="space-y-5">
                {GUIDED_QUESTIONS.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {q.question}
                    </label>
                    {q.type === "text" && (
                      <input
                        type="text"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                        placeholder="Enter response..."
                      />
                    )}
                    {q.type === "select" && (
                      <select
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                      >
                        <option value="">Select...</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {q.type === "textarea" && (
                      <textarea
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                        placeholder="Enter notes..."
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Add internal notes about this opportunity..."
                />
              </div>
              
              <button
                onClick={saveGuidedAnswers}
                disabled={updating}
                className="mt-4 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition disabled:opacity-50"
              >
                {updating ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stage Update */}
            <div className="rounded-2xl bg-white border p-6" data-testid="stage-update-card">
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Update Stage</h2>
              <div className="space-y-2">
                {STAGES.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => updateStage(stage.value)}
                    disabled={updating || opportunity.stage === stage.value}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                      opportunity.stage === stage.value
                        ? `${stage.color} border-current`
                        : "hover:bg-slate-50 border-slate-200"
                    } disabled:opacity-50`}
                    data-testid={`stage-btn-${stage.value}`}
                  >
                    <div className="flex items-center gap-3">
                      {opportunity.stage === stage.value ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-current opacity-30" />
                      )}
                      <span className="font-medium">{stage.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl bg-white border p-6" data-testid="quick-actions-card">
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/admin/quotes/new?opportunity_id=${id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border hover:bg-slate-50 transition"
                  data-testid="create-quote-btn"
                >
                  <FileText className="w-5 h-5 text-[#20364D]" />
                  <span className="font-medium">Create Quote</span>
                </button>
                <button
                  onClick={() => window.open(`mailto:${opportunity.customer_email}`, "_blank")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border hover:bg-slate-50 transition"
                  data-testid="send-email-btn"
                >
                  <Send className="w-5 h-5 text-[#20364D]" />
                  <span className="font-medium">Send Email</span>
                </button>
              </div>
            </div>

            {/* Assignment Info */}
            {opportunity.assigned_to && (
              <div className="rounded-2xl bg-slate-100 border p-6">
                <h3 className="text-sm font-semibold text-slate-500 mb-2">Assigned To</h3>
                <div className="font-medium text-[#20364D]">
                  {opportunity.assigned_to_name || opportunity.assigned_to}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
