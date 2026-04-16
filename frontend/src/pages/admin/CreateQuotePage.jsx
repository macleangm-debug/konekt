import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, UserPlus, Loader2, Send, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/adminApi";
import SystemItemSelector from "@/components/admin/SystemItemSelector";
import PhoneNumberField from "@/components/forms/PhoneNumberField";
import CanonicalDocumentRenderer from "@/components/documents/CanonicalDocumentRenderer";
import { toast } from "sonner";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

export default function CreateQuotePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", company: "", phone_prefix: "+255", phone: "", address: "" });

  // Items
  const [lineItems, setLineItems] = useState([]);

  // Options
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const taxRate = settings?.tax?.vat_rate ?? 18;
  const subtotal = lineItems.filter(i => i.pricing_status === "priced").reduce((s, i) => s + i.total, 0);
  const tax = Math.round(subtotal * taxRate / 100);
  const total = subtotal + tax;
  const allPriced = lineItems.length > 0 && lineItems.every(i => i.pricing_status === "priced");
  const hasCustomer = selectedCustomer || (newClient.name && newClient.email);

  useEffect(() => {
    Promise.all([
      adminApi.getCustomers().catch(() => ({ data: { customers: [] } })),
      adminApi.getBusinessSettings().catch(() => ({ data: {} })),
    ]).then(([cRes, sRes]) => {
      setCustomers(Array.isArray(cRes.data) ? cRes.data : cRes.data?.customers || []);
      setSettings(sRes.data);
      setLoading(false);
    });
  }, []);

  const selectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer || null);
    if (customer) setShowNewClient(false);
  };

  const getCustomerData = () => selectedCustomer ? {
    customer_name: selectedCustomer.contact_name || selectedCustomer.name || "",
    customer_email: selectedCustomer.email || "",
    customer_company: selectedCustomer.company_name || "",
    customer_phone: selectedCustomer.phone || "",
    customer_address: [selectedCustomer.address_line_1, selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(", "),
  } : {
    customer_name: newClient.name,
    customer_email: newClient.email,
    customer_company: newClient.company,
    customer_phone: newClient.phone ? `${newClient.phone_prefix}${newClient.phone}` : "",
    customer_address: newClient.address,
  };

  const createQuote = async () => {
    if (lineItems.length === 0) { toast.error("Add at least one item"); return; }
    if (!hasCustomer) { toast.error("Select or add a customer"); return; }

    setSaving(true);
    const waitingForPricing = lineItems.some((i) => i.pricing_status !== "priced");
    const customerData = getCustomerData();

    try {
      await adminApi.createQuote({
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
        subtotal, discount: 0, tax, tax_rate: taxRate, total,
        valid_until: validUntil || null,
        notes,
        status: waitingForPricing ? "waiting_for_pricing" : "draft",
        payment_term_type: selectedCustomer?.payment_term_type || "due_on_receipt",
        payment_term_days: selectedCustomer?.payment_term_days || 0,
      });
      toast.success(waitingForPricing ? "Quote saved (waiting for pricing)" : "Quote created");
      navigate("/admin/quotes");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create quote");
    }
    setSaving(false);
  };

  // Build live preview data
  const previewData = {
    document_type: "quote",
    quote_number: "DRAFT",
    date: new Date().toISOString(),
    valid_until: validUntil || null,
    ...getCustomerData(),
    line_items: lineItems.map((item) => ({
      description: item.name || item.description,
      quantity: item.quantity,
      unit_price: item.pricing_status === "priced" ? item.unit_price : 0,
      total: item.pricing_status === "priced" ? item.total : 0,
      unit_of_measurement: item.unit_of_measurement,
    })),
    subtotal, tax, vat_amount: tax, vat_rate: taxRate, total,
    discount: 0,
    notes,
    status: "draft",
    currency: "TZS",
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="create-quote-page">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/quotes")} className="text-slate-400 hover:text-slate-600" data-testid="back-to-quotes">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#20364D]">Create Quote</h1>
            <p className="text-xs text-slate-400">Select customer, add items from catalog</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!allPriced && lineItems.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 text-xs">Waiting for pricing</Badge>
          )}
          <Button
            onClick={createQuote}
            disabled={lineItems.length === 0 || !hasCustomer || saving}
            className="bg-[#20364D] hover:bg-[#1a2d40]"
            data-testid="save-quote-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
            {allPriced ? "Create Quote" : "Save (Waiting for Pricing)"}
          </Button>
        </div>
      </div>

      {/* Two-column: Builder | Preview */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 grid lg:grid-cols-2 gap-6">
        {/* LEFT — Builder */}
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="rounded-xl border bg-white p-5" data-testid="customer-section">
            <h2 className="text-sm font-bold text-[#20364D] uppercase tracking-wider mb-3">Customer</h2>
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
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border text-sm" data-testid="selected-customer-info">
                    <div className="font-semibold text-[#20364D]">{selectedCustomer.contact_name}</div>
                    <div className="text-xs text-slate-500">{selectedCustomer.email} {selectedCustomer.phone && `| ${selectedCustomer.phone}`}</div>
                    {selectedCustomer.company_name && <div className="text-xs text-slate-400">{selectedCustomer.company_name}</div>}
                    {selectedCustomer.payment_term_label && <Badge className="mt-1 text-[9px] bg-blue-50 text-blue-600">{selectedCustomer.payment_term_label}</Badge>}
                  </div>
                )}
                <button type="button" onClick={() => { setShowNewClient(true); setSelectedCustomerId(""); setSelectedCustomer(null); }} className="mt-2 text-xs text-[#D4A843] hover:underline flex items-center gap-1" data-testid="new-client-toggle">
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
                <button type="button" onClick={() => { setShowNewClient(false); }} className="text-xs text-slate-500 hover:text-slate-700">Back to existing customers</button>
              </div>
            )}
          </div>

          {/* Items from Catalog */}
          <SystemItemSelector items={lineItems} setItems={setLineItems} currency="TZS" />

          {/* Notes + Valid Until */}
          {lineItems.length > 0 && (
            <div className="rounded-xl border bg-white p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-slate-500 font-semibold uppercase">Valid Until</label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-0.5 text-sm" /></div>
                <div><label className="text-[10px] text-slate-500 font-semibold uppercase">Notes</label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." className="mt-0.5 text-sm" /></div>
              </div>
              {!allPriced && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                  Some items need pricing from Operations. Quote will be saved as "waiting for pricing" and cannot be sent until all prices are set.
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Live Branded Quote Preview */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="rounded-xl border bg-white overflow-hidden shadow-sm" data-testid="quote-live-preview">
            <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Preview</span>
              {lineItems.length > 0 && <Badge className="text-[9px] bg-emerald-50 text-emerald-600">{lineItems.length} item{lineItems.length !== 1 ? "s" : ""}</Badge>}
            </div>
            <div className="p-2 max-h-[calc(100vh-180px)] overflow-y-auto" style={{ transform: "scale(0.75)", transformOrigin: "top left", width: "133.33%" }}>
              {lineItems.length > 0 && hasCustomer ? (
                <CanonicalDocumentRenderer
                  documentType="quote"
                  documentData={previewData}
                />
              ) : (
                <div className="text-center py-20 text-slate-300">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm text-slate-400">Select a customer and add items to see the branded quote preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
