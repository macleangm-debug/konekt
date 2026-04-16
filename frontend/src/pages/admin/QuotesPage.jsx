import React, { useEffect, useMemo, useState } from "react";
import { FileText, Send, Search, Plus, UserPlus, Loader2, ArrowRightCircle, AlertTriangle, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/adminApi";
import { calculateTotals, formatMoney } from "@/utils/finance";
import SystemItemSelector from "@/components/admin/SystemItemSelector";
import PhoneNumberField from "@/components/forms/PhoneNumberField";
import { safeDisplay } from "@/utils/safeDisplay";
import { toast } from "sonner";
import api from "@/lib/api";

const quoteStatuses = ["draft", "waiting_for_pricing", "ready_to_send", "sent", "approved", "rejected", "expired", "converted"];
const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  waiting_for_pricing: "bg-amber-100 text-amber-700",
  ready_to_send: "bg-teal-100 text-teal-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  converted: "bg-purple-100 text-purple-700",
};

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", company: "", phone_prefix: "+255", phone: "", address: "", tin: "" });

  // Items
  const [lineItems, setLineItems] = useState([]);

  // Quote options
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const taxRate = settings?.tax?.vat_rate ?? 18;
  const subtotal = lineItems.filter(i => i.pricing_status === "priced").reduce((s, i) => s + i.total, 0);
  const tax = Math.round(subtotal * taxRate / 100);
  const total = subtotal + tax;

  const allPriced = lineItems.length > 0 && lineItems.every(i => i.pricing_status === "priced");
  const canSendQuote = allPriced && (selectedCustomer || (newClient.name && newClient.email));

  const load = async () => {
    setLoading(true);
    try {
      const [qRes, cRes, sRes] = await Promise.all([
        adminApi.getQuotes().catch((e) => { console.error("getQuotes error:", e); return { data: [] }; }),
        adminApi.getCustomers().catch((e) => { console.error("getCustomers error:", e); return { data: { customers: [] } }; }),
        adminApi.getBusinessSettings().catch((e) => { console.error("getBusinessSettings error:", e); return { data: {} }; }),
      ]);
      const quotesData = Array.isArray(qRes.data) ? qRes.data : qRes.data?.quotes || [];
      setQuotes(quotesData);
      setCustomers(Array.isArray(cRes.data) ? cRes.data : cRes.data?.customers || []);
      setSettings(sRes.data);
    } catch (e) {
      console.error("load error:", e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer || null);
    if (customer) setShowNewClient(false);
  };

  const createQuote = async (e) => {
    e.preventDefault();
    if (lineItems.length === 0) { toast.error("Add at least one item"); return; }

    const waitingForPricing = lineItems.some((i) => i.pricing_status !== "priced");
    const quoteStatus = waitingForPricing ? "waiting_for_pricing" : "draft";

    const customerData = selectedCustomer ? {
      customer_name: selectedCustomer.contact_name || selectedCustomer.name || "",
      customer_email: selectedCustomer.email || "",
      customer_company: selectedCustomer.company_name || "",
      customer_phone: selectedCustomer.phone || "",
      customer_address: [selectedCustomer.address_line_1, selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(", "),
      customer_tin: selectedCustomer.tax_number || "",
    } : {
      customer_name: newClient.name,
      customer_email: newClient.email,
      customer_company: newClient.company,
      customer_phone: newClient.phone ? `${newClient.phone_prefix}${newClient.phone}` : "",
      customer_address: newClient.address,
      customer_tin: newClient.tin,
    };

    const payload = {
      ...customerData,
      currency: "TZS",
      line_items: lineItems.map((item) => ({
        description: item.description || item.name,
        name: item.name,
        product_id: item.product_id,
        sku: item.sku,
        category: item.category,
        unit_of_measurement: item.unit_of_measurement,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
        pricing_status: item.pricing_status || "priced",
        vendor_cost: item.vendor_cost || 0,
      })),
      subtotal,
      discount: 0,
      tax,
      tax_rate: taxRate,
      total,
      valid_until: validUntil || null,
      notes,
      terms: "",
      status: quoteStatus,
      payment_term_type: selectedCustomer?.payment_term_type || "due_on_receipt",
      payment_term_days: selectedCustomer?.payment_term_days || 0,
    };

    try {
      await adminApi.createQuote(payload);
      toast.success(waitingForPricing ? "Quote created (waiting for pricing from Vendor Ops)" : "Quote created");
      setLineItems([]);
      setNotes("");
      setValidUntil("");
      setSelectedCustomerId("");
      setSelectedCustomer(null);
      setShowNewClient(false);
      setNewClient({ name: "", email: "", company: "", phone_prefix: "+255", phone: "", address: "", tin: "" });
      setShowForm(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create quote");
    }
  };

  const changeStatus = async (quoteId, status) => {
    try {
      await adminApi.updateQuoteStatus(quoteId, status);
      toast.success(`Quote ${status.replace(/_/g, " ")}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const sendQuote = async (quoteId) => {
    try {
      await adminApi.sendQuoteDocument(quoteId);
      toast.success("Quote sent");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send");
    }
  };

  const requestDiscount = async (quoteId, quoteNumber) => {
    const reason = prompt("Why does this deal need a discount?");
    if (!reason) return;
    try {
      await api.post("/api/staff/discount-requests", {
        quote_id: quoteId,
        quote_number: quoteNumber,
        reason,
        requested_by: "sales",
      });
      toast.success("Discount request submitted for approval");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit discount request");
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (q.quote_number || "").toLowerCase().includes(term) || (q.customer_name || "").toLowerCase().includes(term) || (q.customer_company || "").toLowerCase().includes(term);
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="quotes-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-[#20364D]">
              <FileText className="w-6 h-6 text-[#D4A843]" /> Quotes
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Select customer, add items from catalog, system handles pricing</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className={showForm ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-[#20364D] hover:bg-[#1a2d40]"} data-testid="create-quote-btn">
            {showForm ? "Cancel" : <><Plus className="w-4 h-4 mr-1" /> Create Quote</>}
          </Button>
        </div>

        <div className="grid xl:grid-cols-[520px_1fr] gap-6">
          {/* Create Quote Form */}
          {showForm && (
            <form onSubmit={createQuote} className="space-y-4" data-testid="quote-form">
              {/* Step 1: Customer Selection */}
              <div className="rounded-2xl border bg-white p-5" data-testid="customer-section">
                <h2 className="text-base font-bold text-[#20364D] mb-3">1. Select Customer</h2>
                {!showNewClient ? (
                  <>
                    <select
                      className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
                      value={selectedCustomerId}
                      onChange={(e) => selectCustomer(e.target.value)}
                      data-testid="customer-select"
                    >
                      <option value="">Choose existing customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.company_name || c.contact_name} — {c.email}</option>
                      ))}
                    </select>
                    {selectedCustomer && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 border text-sm" data-testid="selected-customer-info">
                        <div className="font-semibold text-[#20364D]">{selectedCustomer.contact_name}</div>
                        <div className="text-xs text-slate-500">{selectedCustomer.email} {selectedCustomer.phone && `| ${selectedCustomer.phone}`}</div>
                        {selectedCustomer.company_name && <div className="text-xs text-slate-400">{selectedCustomer.company_name}</div>}
                        {selectedCustomer.payment_term_label && <Badge className="mt-1 text-[9px] bg-blue-50 text-blue-600">{selectedCustomer.payment_term_label}</Badge>}
                      </div>
                    )}
                    <button type="button" onClick={() => setShowNewClient(true)} className="mt-2 text-xs text-[#D4A843] hover:underline flex items-center gap-1" data-testid="new-client-toggle">
                      <UserPlus className="w-3 h-3" /> New client not in the system?
                    </button>
                  </>
                ) : (
                  <div className="space-y-3" data-testid="new-client-form">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[10px] text-slate-500">Contact Name *</label><Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Full name" className="mt-0.5" data-testid="new-client-name" /></div>
                      <div><label className="text-[10px] text-slate-500">Email *</label><Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="email@company.com" className="mt-0.5" data-testid="new-client-email" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[10px] text-slate-500">Company</label><Input value={newClient.company} onChange={(e) => setNewClient({ ...newClient, company: e.target.value })} placeholder="Company name" className="mt-0.5" /></div>
                      <PhoneNumberField label="Phone" prefix={newClient.phone_prefix} number={newClient.phone} onPrefixChange={(v) => setNewClient({ ...newClient, phone_prefix: v })} onNumberChange={(v) => setNewClient({ ...newClient, phone: v })} testIdPrefix="new-client-phone" />
                    </div>
                    <button type="button" onClick={() => { setShowNewClient(false); setSelectedCustomerId(""); setSelectedCustomer(null); }} className="text-xs text-slate-500 hover:text-slate-700">
                      Back to existing customers
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Items from Catalog */}
              <div data-testid="items-section">
                <SystemItemSelector items={lineItems} setItems={setLineItems} currency="TZS" />
              </div>

              {/* Step 3: Summary + Notes */}
              {lineItems.length > 0 && (
                <div className="rounded-2xl border bg-white p-5 space-y-3" data-testid="summary-section">
                  <h2 className="text-base font-bold text-[#20364D]">3. Summary</h2>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium">{money(subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">VAT ({taxRate}%)</span><span>{money(tax)}</span></div>
                  <div className="flex justify-between text-base font-bold border-t pt-2"><span>Total</span><span className="text-[#20364D]">{money(total)}</span></div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div><label className="text-[10px] text-slate-500">Valid Until</label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-0.5 text-sm" /></div>
                    <div><label className="text-[10px] text-slate-500">Internal Notes</label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." className="mt-0.5 text-sm" /></div>
                  </div>

                  {!allPriced && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800" data-testid="pricing-incomplete-notice">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Some items need pricing from Vendor Ops. Quote will be saved as "waiting for pricing".
                    </div>
                  )}

                  <Button type="submit" className="w-full bg-[#20364D] hover:bg-[#1a2d40] text-white font-semibold py-3" data-testid="save-quote-btn">
                    {allPriced ? "Create Quote" : "Save Quote (Waiting for Pricing)"}
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* Quotes List */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search quotes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" data-testid="quote-search" />
              </div>
              <span className="text-xs text-slate-400">{filteredQuotes.length} quotes</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border"><FileText className="w-10 h-10 mx-auto mb-2 text-slate-200" /><p className="text-sm text-slate-400">No quotes yet</p></div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden" data-testid="quotes-table">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-50/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Quote #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Customer</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredQuotes.map((q) => (
                      <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`quote-row-${q.id}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#20364D]">{safeDisplay(q.quote_number)}</div>
                          <div className="text-[10px] text-slate-400">{q.created_at ? new Date(q.created_at).toLocaleDateString() : ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">{safeDisplay(q.customer_name || q.customer_company)}</div>
                          <div className="text-[10px] text-slate-400">{safeDisplay(q.customer_email)}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoney(q.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`${statusColors[q.status] || "bg-slate-100 text-slate-500"} text-[9px]`} data-testid={`quote-status-${q.id}`}>
                            {(q.status || "draft").replace(/_/g, " ")}
                          </Badge>
                          {q.generated_invoice && <div className="text-[9px] text-emerald-600 mt-0.5">{q.generated_invoice}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {(q.status === "draft" || q.status === "ready_to_send") && (
                              <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => sendQuote(q.id)} data-testid={`quote-send-${q.id}`}>
                                <Send className="w-3 h-3 mr-0.5" /> Send
                              </Button>
                            )}
                            {q.status === "waiting_for_pricing" && (
                              <Badge className="bg-amber-50 text-amber-600 text-[9px]">Awaiting Vendor Ops</Badge>
                            )}
                            {q.status === "sent" && (
                              <>
                                <Button size="sm" variant="outline" className="text-[10px] h-7 text-emerald-600 border-emerald-200" onClick={() => changeStatus(q.id, "approved")} data-testid={`quote-approve-${q.id}`}>Approve</Button>
                                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => requestDiscount(q.id, q.quote_number)} data-testid={`quote-discount-${q.id}`}>
                                  <Tag className="w-3 h-3 mr-0.5" /> Request Discount
                                </Button>
                              </>
                            )}
                            {q.status === "approved" && q.generated_order && (
                              <Badge className="bg-green-50 text-green-600 text-[9px]">Order: {q.generated_order}</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
