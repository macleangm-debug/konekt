import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import QuoteLineDescriptionField from "@/components/quotes/QuoteLineDescriptionField";

const fmtCurrency = (v, c = "TZS") => `${c} ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

const EMPTY_ITEM = { description: "", quantity: 1, unit_price: 0, total: 0 };

function recalc(items) {
  const updated = items.map((item) => ({
    ...item,
    total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
  }));
  const subtotal = updated.reduce((sum, i) => sum + i.total, 0);
  return { items: updated, subtotal };
}

export default function QuoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable state
  const [lineItems, setLineItems] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/quotes-v2/${id}`);
      const q = res.data;
      setQuote(q);
      setLineItems(q.line_items?.length ? q.line_items : [{ ...EMPTY_ITEM }]);
      setCustomerName(q.customer_name || "");
      setCustomerEmail(q.customer_email || "");
      setCustomerCompany(q.customer_company || "");
      setCustomerPhone(q.customer_phone || "");
      setNotes(q.notes || "");
      setDiscount(q.discount || 0);
      setTaxRate(q.tax ? Math.round((q.tax / Math.max(q.subtotal, 1)) * 100) : 0);
    } catch {
      toast.error("Failed to load quote");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  const { items: calcItems, subtotal } = recalc(lineItems);
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal - Number(discount) + taxAmount;
  const currency = quote?.currency || "TZS";

  const updateItem = (idx, field, value) => {
    const next = [...lineItems];
    next[idx] = { ...next[idx], [field]: value };
    setLineItems(next);
    setSaved(false);
  };

  const addItem = () => {
    setLineItems([...lineItems, { ...EMPTY_ITEM }]);
    setSaved(false);
  };

  const removeItem = (idx) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/quotes-v2/${id}`, {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_company: customerCompany,
        customer_phone: customerPhone,
        line_items: calcItems,
        subtotal,
        tax: taxAmount,
        discount: Number(discount),
        total,
        notes,
        currency,
      });
      toast.success("Quote saved");
      setSaved(true);
    } catch {
      toast.error("Failed to save quote");
    }
    setSaving(false);
  };

  const handleSendQuote = async () => {
    await handleSave();
    try {
      await api.patch(`/api/admin/quotes-v2/${id}/status`, null, { params: { status: "sent" } });
      toast.success("Quote marked as sent");
      navigate(`/admin/quotes/${id}`);
    } catch {
      toast.error("Failed to send quote");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-400">Loading quote editor...</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-slate-500">Quote not found</div>
        <button onClick={() => navigate("/admin/quotes")} className="text-blue-600 hover:underline text-sm">Back to Quotes</button>
      </div>
    );
  }

  const isConverted = quote.status === "converted";

  return (
    <div className="space-y-6" data-testid="quote-editor-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/admin/quotes/${id}`)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700" data-testid="back-to-preview">
            <ArrowLeft className="h-4 w-4" /> Back to Preview
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#20364D]">Edit Quote</h1>
            <p className="text-sm text-slate-400 mt-0.5">{quote.quote_number} — {quote.status?.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === "draft" && (
            <button onClick={handleSendQuote} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700" data-testid="send-quote-btn">
              <Send className="h-4 w-4" /> Save & Send
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || isConverted}
            className="flex items-center gap-2 rounded-xl bg-[#20364D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-40"
            data-testid="save-quote-btn"
          >
            {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : saved ? "Saved" : "Save Quote"}
          </button>
        </div>
      </div>

      {isConverted && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          This quote has been converted to an order and cannot be edited.
        </div>
      )}

      {/* Traceability */}
      {(quote.source_lead_id || quote.created_from_crm || quote.lead_id) && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700" data-testid="traceability-banner">
          Created from CRM {quote.lead_id || quote.source_lead_id ? `(Lead: ${quote.lead_id || quote.source_lead_id})` : ""}
          {quote.source_request_id ? ` — Request: ${quote.source_request_id}` : ""}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Info — Left Column */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#20364D]">Customer Details</h2>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Company</label>
            <input value={customerCompany} onChange={(e) => { setCustomerCompany(e.target.value); setSaved(false); }} disabled={isConverted}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" data-testid="edit-customer-company" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Contact Name</label>
            <input value={customerName} onChange={(e) => { setCustomerName(e.target.value); setSaved(false); }} disabled={isConverted}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" data-testid="edit-customer-name" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Email</label>
            <input value={customerEmail} onChange={(e) => { setCustomerEmail(e.target.value); setSaved(false); }} disabled={isConverted}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" data-testid="edit-customer-email" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Phone</label>
            <input value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setSaved(false); }} disabled={isConverted}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" data-testid="edit-customer-phone" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Notes</label>
            <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} disabled={isConverted} rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none disabled:bg-slate-50" data-testid="edit-notes" />
          </div>
        </div>

        {/* Line Items — Right 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-bold text-[#20364D]">Line Items</h2>
              {!isConverted && (
                <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700" data-testid="add-line-item-btn">
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {calcItems.map((item, idx) => (
                <div key={idx} className="p-4 space-y-3" data-testid={`line-item-${idx}`}>
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Description</label>
                      <QuoteLineDescriptionField
                        value={item.description}
                        onChange={(v) => updateItem(idx, "description", v)}
                        readOnly={isConverted}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Qty</label>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} disabled={isConverted}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" data-testid={`item-qty-${idx}`} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Unit Price</label>
                      <input type="number" min="0" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} disabled={isConverted}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50" data-testid={`item-price-${idx}`} />
                    </div>
                    <div className="col-span-2 text-right">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Total</label>
                      <div className="py-2 text-sm font-semibold text-[#20364D]">{fmtCurrency(item.total, currency)}</div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {!isConverted && lineItems.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1" data-testid={`remove-item-${idx}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5" data-testid="pricing-summary">
            <h2 className="text-sm font-bold text-[#20364D] mb-4">Pricing Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-[#20364D]">{fmtCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Tax (%)</span>
                  <input type="number" min="0" max="100" value={taxRate} onChange={(e) => { setTaxRate(Number(e.target.value)); setSaved(false); }} disabled={isConverted}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-center outline-none focus:border-blue-400 disabled:bg-slate-50" data-testid="tax-rate-input" />
                </div>
                <span className="font-medium text-[#20364D]">{fmtCurrency(taxAmount, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Discount</span>
                  <input type="number" min="0" value={discount} onChange={(e) => { setDiscount(Number(e.target.value)); setSaved(false); }} disabled={isConverted}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-center outline-none focus:border-blue-400 disabled:bg-slate-50" data-testid="discount-input" />
                </div>
                <span className="font-medium text-red-600">-{fmtCurrency(discount, currency)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="text-base font-bold text-[#20364D]">Total</span>
                <span className="text-xl font-extrabold text-[#20364D]">{fmtCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
