import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";

export default function LeadDetailPage() {
  const { leadId } = useParams();
  const [data, setData] = useState(null);
  const [note, setNote] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [stageForm, setStageForm] = useState({ stage: "", note: "", lost_reason: "", win_reason: "" });
  const [quoteForm, setQuoteForm] = useState({ line_items_json: '[{"description":"Item","quantity":1,"unit_price":0,"total":0}]', subtotal: "", tax: "", discount: "", total: "", currency: "TZS" });
  const [invoiceForm, setInvoiceForm] = useState({ line_items_json: '[{"description":"Item","quantity":1,"unit_price":0,"total":0}]', subtotal: "", tax: "", discount: "", total: "", currency: "TZS" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigned_to: "", status: "todo", priority: "medium", due_date: "" });
  const [wonForm, setWonForm] = useState({ win_reason: "", note: "" });

  const load = async () => {
    try {
      const res = await api.get(`/api/admin/crm-deals/leads/${leadId}`);
      setData(res.data);
      setStageForm(prev => ({ ...prev, stage: res.data.lead.stage || "" }));
    } catch (error) {
      console.error("Failed to load lead:", error);
    }
  };

  useEffect(() => { load(); }, [leadId]);

  const addNote = async () => {
    if (!note.trim()) return;
    await api.post(`/api/admin/crm-intelligence/leads/${leadId}/note`, { note });
    setNote("");
    load();
  };

  const saveFollowUp = async () => {
    if (!followUpAt) return;
    await api.post(`/api/admin/crm-intelligence/leads/${leadId}/follow-up`, { next_follow_up_at: followUpAt, note: "Follow-up scheduled" });
    load();
  };

  const updateStage = async () => {
    await api.post(`/api/admin/crm-intelligence/leads/${leadId}/status`, stageForm);
    load();
  };

  const createQuote = async () => {
    await api.post(`/api/admin/crm-relationships/leads/${leadId}/create-quote`, {
      line_items: JSON.parse(quoteForm.line_items_json || "[]"),
      subtotal: Number(quoteForm.subtotal || 0),
      tax: Number(quoteForm.tax || 0),
      discount: Number(quoteForm.discount || 0),
      total: Number(quoteForm.total || 0),
      currency: quoteForm.currency,
    });
    load();
  };

  const createInvoice = async () => {
    await api.post(`/api/admin/crm-relationships/leads/${leadId}/create-invoice`, {
      line_items: JSON.parse(invoiceForm.line_items_json || "[]"),
      subtotal: Number(invoiceForm.subtotal || 0),
      tax: Number(invoiceForm.tax || 0),
      discount: Number(invoiceForm.discount || 0),
      total: Number(invoiceForm.total || 0),
      currency: invoiceForm.currency,
    });
    load();
  };

  const createTask = async () => {
    await api.post(`/api/admin/crm-relationships/leads/${leadId}/create-task`, taskForm);
    load();
  };

  const convertToWon = async () => {
    await api.post(`/api/admin/crm-relationships/leads/${leadId}/convert-to-won`, wonForm);
    load();
  };

  if (!data) return <div className="p-10" data-testid="loading-state">Loading lead...</div>;

  const { lead, related } = data;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="lead-detail-page">
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm text-slate-500">{lead.source || "Lead"}</div>
        <div className="text-3xl font-bold mt-2">{lead.name}</div>
        <div className="text-slate-600 mt-2">{lead.company_name || "-"} • {lead.email || "-"} • {lead.phone || "-"}</div>
        {lead.email && (
          <div className="mt-5">
            <Link to={`/admin/customer-accounts/${encodeURIComponent(lead.email)}`} className="rounded-xl border px-4 py-2 font-semibold" data-testid="account-link">
              Open Customer Account
            </Link>
          </div>
        )}
        <div className="grid md:grid-cols-4 gap-4 mt-6">
          <Info label="Stage" value={lead.stage} />
          <Info label="Lead Score" value={lead.lead_score || 0} />
          <Info label="Expected Value" value={`TZS ${Number(lead.expected_value || 0).toLocaleString()}`} />
          <Info label="Next Follow-up" value={lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString() : "-"} />
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <Panel title="Timeline" testId="timeline-panel">
            {(lead.timeline || []).length ? lead.timeline.map((item, idx) => (
              <div key={idx} className="rounded-2xl border bg-slate-50 p-4">
                <div className="font-semibold">{item.label}</div>
                <div className="text-sm text-slate-500 mt-1">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</div>
                {item.note && <div className="text-slate-700 mt-2">{item.note}</div>}
              </div>
            )) : <Empty text="No timeline activity yet." />}
          </Panel>

          <Panel title="Related Quotes" testId="quotes-panel">
            {(related.quotes || []).length ? related.quotes.map(q => (
              <RowCard key={q.id} title={q.quote_number || "Quote"} subtitle={`TZS ${Number(q.total || 0).toLocaleString()} • ${q.status || "-"}`} />
            )) : <Empty text="No related quotes." />}
          </Panel>

          <Panel title="Related Invoices" testId="invoices-panel">
            {(related.invoices || []).length ? related.invoices.map(inv => (
              <RowCard key={inv.id} title={inv.invoice_number || "Invoice"} subtitle={`TZS ${Number(inv.total || 0).toLocaleString()} • ${inv.status || "-"}`} />
            )) : <Empty text="No related invoices." />}
          </Panel>

          <Panel title="Related Payments" testId="payments-panel">
            {(related.payments || []).length ? related.payments.map(p => (
              <RowCard key={p.id} title={p.reference || "Payment"} subtitle={`TZS ${Number(p.amount || 0).toLocaleString()} • ${p.status || "-"}`} />
            )) : <Empty text="No related payments." />}
          </Panel>

          <Panel title="Related Tasks" testId="tasks-panel">
            {(related.tasks || []).length ? related.tasks.map(task => (
              <RowCard key={task.id} title={task.title || "Task"} subtitle={`${task.status || "-"} • ${task.assigned_to || "-"}`} />
            )) : <Empty text="No related tasks." />}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Add Note">
            <textarea className="w-full border rounded-xl px-4 py-3 min-h-[100px]" value={note} onChange={e => setNote(e.target.value)} placeholder="Write note" data-testid="note-input" />
            <button onClick={addNote} className="mt-4 rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold" data-testid="save-note-btn">Save Note</button>
          </Panel>

          <Panel title="Schedule Follow-up">
            <input type="datetime-local" className="w-full border rounded-xl px-4 py-3" value={followUpAt} onChange={e => setFollowUpAt(e.target.value)} data-testid="followup-input" />
            <button onClick={saveFollowUp} className="mt-4 rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold" data-testid="save-followup-btn">Schedule</button>
          </Panel>

          <Panel title="Update Stage">
            <select className="w-full border rounded-xl px-4 py-3" value={stageForm.stage} onChange={e => setStageForm({ ...stageForm, stage: e.target.value })} data-testid="stage-select">
              <option value="new_lead">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="meeting_demo">Meeting / Demo</option>
              <option value="quote_sent">Quote Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="dormant">Dormant</option>
            </select>
            <input className="w-full border rounded-xl px-4 py-3 mt-4" placeholder="Lost reason" value={stageForm.lost_reason} onChange={e => setStageForm({ ...stageForm, lost_reason: e.target.value })} />
            <input className="w-full border rounded-xl px-4 py-3 mt-4" placeholder="Win reason" value={stageForm.win_reason} onChange={e => setStageForm({ ...stageForm, win_reason: e.target.value })} />
            <textarea className="w-full border rounded-xl px-4 py-3 mt-4 min-h-[80px]" placeholder="Stage note" value={stageForm.note} onChange={e => setStageForm({ ...stageForm, note: e.target.value })} />
            <button onClick={updateStage} className="mt-4 rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold" data-testid="update-stage-btn">Update Stage</button>
          </Panel>

          <Panel title="Create Quote">
            <textarea className="w-full border rounded-xl px-4 py-3 min-h-[90px] text-sm" value={quoteForm.line_items_json} onChange={e => setQuoteForm({ ...quoteForm, line_items_json: e.target.value })} placeholder="Line items JSON" />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <input className="border rounded-xl px-4 py-3" placeholder="Subtotal" value={quoteForm.subtotal} onChange={e => setQuoteForm({ ...quoteForm, subtotal: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Tax" value={quoteForm.tax} onChange={e => setQuoteForm({ ...quoteForm, tax: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Discount" value={quoteForm.discount} onChange={e => setQuoteForm({ ...quoteForm, discount: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Total" value={quoteForm.total} onChange={e => setQuoteForm({ ...quoteForm, total: e.target.value })} />
            </div>
            <button onClick={createQuote} className="mt-4 rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold" data-testid="create-quote-btn">Create Quote</button>
          </Panel>

          <Panel title="Create Invoice">
            <textarea className="w-full border rounded-xl px-4 py-3 min-h-[90px] text-sm" value={invoiceForm.line_items_json} onChange={e => setInvoiceForm({ ...invoiceForm, line_items_json: e.target.value })} placeholder="Line items JSON" />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <input className="border rounded-xl px-4 py-3" placeholder="Subtotal" value={invoiceForm.subtotal} onChange={e => setInvoiceForm({ ...invoiceForm, subtotal: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Tax" value={invoiceForm.tax} onChange={e => setInvoiceForm({ ...invoiceForm, tax: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Discount" value={invoiceForm.discount} onChange={e => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} />
              <input className="border rounded-xl px-4 py-3" placeholder="Total" value={invoiceForm.total} onChange={e => setInvoiceForm({ ...invoiceForm, total: e.target.value })} />
            </div>
            <button onClick={createInvoice} className="mt-4 rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold" data-testid="create-invoice-btn">Create Invoice</button>
          </Panel>

          <Panel title="Create Task">
            <input className="w-full border rounded-xl px-4 py-3" placeholder="Title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
            <textarea className="w-full border rounded-xl px-4 py-3 mt-4 min-h-[80px]" placeholder="Description" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
            <input className="w-full border rounded-xl px-4 py-3 mt-4" placeholder="Assigned to email" value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })} />
            <input type="datetime-local" className="w-full border rounded-xl px-4 py-3 mt-4" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            <button onClick={createTask} className="mt-4 rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-semibold" data-testid="create-task-btn">Create Task</button>
          </Panel>

          <Panel title="Convert to Won">
            <input className="w-full border rounded-xl px-4 py-3" placeholder="Win reason" value={wonForm.win_reason} onChange={e => setWonForm({ ...wonForm, win_reason: e.target.value })} />
            <textarea className="w-full border rounded-xl px-4 py-3 mt-4 min-h-[80px]" placeholder="Note" value={wonForm.note} onChange={e => setWonForm({ ...wonForm, note: e.target.value })} />
            <button onClick={convertToWon} className="mt-4 rounded-xl bg-emerald-700 text-white px-5 py-3 font-semibold" data-testid="convert-won-btn">Mark as Won</button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, testId }) {
  return (
    <div className="rounded-3xl border bg-white p-6" data-testid={testId}>
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="font-semibold mt-2">{value || "-"}</div>
    </div>
  );
}

function RowCard({ title, subtitle }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="text-sm text-slate-500">{text}</div>;
}
