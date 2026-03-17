import React, { useState } from "react";
import { HelpCircle, Check, ChevronDown, ChevronUp, Lightbulb, AlertCircle } from "lucide-react";

/**
 * Guided questions for sales team when handling new leads.
 * These questions help qualify leads and capture important information.
 */
const guidedQuestionSets = {
  new_customer: {
    title: "New Customer Qualification",
    description: "Questions to help qualify and understand new customer leads",
    questions: [
      {
        id: "company_size",
        question: "What is the size of the company?",
        type: "select",
        options: ["1-10 employees", "11-50 employees", "51-200 employees", "200+ employees"],
        importance: "high",
        why: "Helps determine potential order volume and appropriate pricing tier",
      },
      {
        id: "budget_range",
        question: "What is their estimated budget for this purchase?",
        type: "select",
        options: ["Under TZS 500K", "TZS 500K - 2M", "TZS 2M - 5M", "TZS 5M - 10M", "Above TZS 10M"],
        importance: "high",
        why: "Qualifies the lead and helps prioritize accordingly",
      },
      {
        id: "timeline",
        question: "When do they need this delivered?",
        type: "select",
        options: ["Urgent (within 1 week)", "Standard (2-4 weeks)", "Flexible (1+ month)", "Just exploring"],
        importance: "medium",
        why: "Determines urgency and helps with resource planning",
      },
      {
        id: "decision_maker",
        question: "Are they the decision maker for this purchase?",
        type: "select",
        options: ["Yes, they approve purchases", "No, need manager approval", "Part of a committee", "Unknown"],
        importance: "high",
        why: "Affects how to approach the sales conversation",
      },
      {
        id: "existing_supplier",
        question: "Do they currently have a supplier for these products/services?",
        type: "select",
        options: ["Yes, looking to switch", "Yes, need additional supplier", "No, first time buying", "Unknown"],
        importance: "medium",
        why: "Helps understand competitive situation",
      },
      {
        id: "specific_requirements",
        question: "Do they have any specific requirements or customizations?",
        type: "text",
        importance: "medium",
        why: "Identifies special needs that may affect pricing or fulfillment",
      },
    ],
  },
  business_pricing: {
    title: "Business Pricing Qualification",
    description: "Questions for leads requesting commercial/business pricing",
    questions: [
      {
        id: "monthly_volume",
        question: "What is their estimated monthly order volume?",
        type: "select",
        options: ["Under TZS 1M", "TZS 1M - 5M", "TZS 5M - 20M", "Above TZS 20M"],
        importance: "high",
        why: "Determines discount tier eligibility",
      },
      {
        id: "payment_terms",
        question: "What payment terms are they expecting?",
        type: "select",
        options: ["Pay upfront", "Net 15", "Net 30", "Net 60", "Need credit facility"],
        importance: "high",
        why: "Affects credit assessment and account setup",
      },
      {
        id: "contract_length",
        question: "Are they open to a contract commitment?",
        type: "select",
        options: ["Yes, 12+ months", "Yes, 6-12 months", "Prefer no commitment", "Need to discuss"],
        importance: "medium",
        why: "Contract commitments can unlock better pricing",
      },
      {
        id: "industry",
        question: "What industry are they in?",
        type: "text",
        importance: "medium",
        why: "Helps tailor product recommendations",
      },
    ],
  },
  service_inquiry: {
    title: "Service Inquiry Qualification",
    description: "Questions for leads inquiring about services",
    questions: [
      {
        id: "service_type",
        question: "What type of service are they looking for?",
        type: "select",
        options: ["Printing & Branding", "Creative & Design", "Facilities Services", "Multiple services"],
        importance: "high",
        why: "Routes to appropriate team",
      },
      {
        id: "scope",
        question: "What is the scope of the project?",
        type: "select",
        options: ["One-time project", "Recurring/ongoing", "Annual contract", "Not sure yet"],
        importance: "medium",
        why: "Determines pricing model and resource allocation",
      },
      {
        id: "samples_needed",
        question: "Do they need samples or proofs before committing?",
        type: "select",
        options: ["Yes, definitely", "Would be nice", "No, not necessary", "Already have samples"],
        importance: "low",
        why: "Affects timeline and cost",
      },
    ],
  },
};

export default function SalesGuidedQuestions({ leadType = "new_customer", leadId, initialAnswers = {}, onSave }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [answers, setAnswers] = useState(initialAnswers);
  const [showWhy, setShowWhy] = useState({});

  const questionSet = guidedQuestionSets[leadType] || guidedQuestionSets.new_customer;

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(answers);
    }
  };

  const completedCount = Object.keys(answers).filter((k) => answers[k]).length;
  const totalCount = questionSet.questions.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="rounded-2xl border bg-white overflow-hidden" data-testid="sales-guided-questions">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-[#20364D] to-[#2a4a66] text-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold">{questionSet.title}</div>
            <div className="text-sm text-white/70">{questionSet.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm">{completedCount}/{totalCount}</span>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Questions */}
      {isExpanded && (
        <div className="p-5 space-y-5">
          {questionSet.questions.map((q, idx) => (
            <div
              key={q.id}
              className={`p-4 rounded-xl border transition ${
                answers[q.id] ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium text-[#20364D]">{q.question}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          q.importance === "high"
                            ? "bg-red-100 text-red-700"
                            : q.importance === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {q.importance} priority
                      </span>
                      <button
                        onClick={() => setShowWhy((p) => ({ ...p, [q.id]: !p[q.id] }))}
                        className="text-xs text-slate-500 hover:text-[#20364D] flex items-center gap-1"
                      >
                        <Lightbulb className="w-3 h-3" />
                        Why ask this?
                      </button>
                    </div>
                    {showWhy[q.id] && (
                      <div className="mt-2 text-sm text-slate-600 bg-slate-100 p-3 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        {q.why}
                      </div>
                    )}
                  </div>
                </div>
                {answers[q.id] && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              <div className="mt-4 pl-10">
                {q.type === "select" ? (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(q.id, opt)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          answers[q.id] === opt
                            ? "bg-[#20364D] text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    rows={2}
                    placeholder="Enter details..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#20364D] focus:ring-2 focus:ring-[#20364D]/20 outline-none resize-none"
                  />
                )}
              </div>
            </div>
          ))}

          {/* Save button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleSave}
              className="px-6 py-3 rounded-xl bg-[#20364D] text-white font-semibold hover:bg-[#2a4a66] transition flex items-center gap-2"
              data-testid="save-guided-answers"
            >
              <Check className="w-4 h-4" />
              Save Answers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
