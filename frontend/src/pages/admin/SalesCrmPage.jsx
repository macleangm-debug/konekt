import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { Target, FileText, ShoppingCart, BarChart3, Plus, Send, X } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

const TABS = [
  { key: "leads", label: "Leads", icon: Target },
  { key: "quotes", label: "Quotes", icon: FileText },
  { key: "orders", label: "Active Orders", icon: ShoppingCart },
  { key: "performance", label: "Performance", icon: BarChart3 },
];

function QuoteBuilderModal({ lead, onClose, onCreated }) {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("full");
  const [depositPercent, setDepositPercent] = useState(30);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ name: "", quantity: 1, unit_price: "" }]);
  const [saving, setSaving] = useState(false);
  const [sendAfter, setSendAfter] = useState(true);

  const addItem = () => setItems([...items, { name: "", quantity: 1, unit_price: "" }]);
  const updateItem = (idx, field, val) => setItems(items.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const computedTotal = items.reduce((s, i) => s + (Number(i.unit_price) || 0) * (Number(i.quantity) || 1), 0);

  const handleCreate = async () => {
    const total = Number(amount) || computedTotal;
    if (total <= 0) return alert("Please enter a valid amount or add items with prices.");
    setSaving(true);
    try {
      const payload = {
        request_id: lead?.id,
        customer_id: lead?.customer_id || lead?.id,
        customer_email: lead?.customer_email || lead?.email || "",
        customer_name: lead?.customer_name || "",
        type: lead?.record_type || lead?.type || "service",
        amount: total,
        items: items.filter(i => i.name).map(i => ({ name: i.name, quantity: Number(i.quantity) || 1, unit_price: Number(i.unit_price) || 0, line_total: (Number(i.unit_price) || 0) * (Number(i.quantity) || 1) })),
        payment_type: paymentType,
        deposit_percent: paymentType === "installment" ? depositPercent : 0,
        notes,
      };
      const res = await adminApi.createQuoteFromLead(payload);
      const quoteId = res.data?.id;
      if (sendAfter && quoteId) {
        await adminApi.sendQuote(quoteId);
      }
      onCreated();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="quote-builder-modal">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#20364D]">Create Quote</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        {lead && (
          <div className="rounded-xl bg-slate-50 p-3 mb-4 text-sm">
            <span className="text-slate-500">For: </span>
            <span className="font-semibold text-[#20364D]">{lead.customer_name || lead.customer_id || "-"}</span>
            <span className="text-slate-500 ml-2">({lead.record_type || lead.type || "request"})</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-600">Line Items</label>
              <button onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={14} /> Add Item</button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Item name" value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} />
                <input className="w-16 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                <input className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm" type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", e.target.value)} />
                {items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X size={16} /></button>}
              </div>
            ))}
            {computedTotal > 0 && <p className="text-xs text-slate-500 mt-1">Items total: {money(computedTotal)}</p>}
          </div>

          {/* Override amount */}
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1">Total Amount (override)</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" type="number" placeholder={computedTotal ? String(computedTotal) : "Enter amount"} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          {/* Payment type */}
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1">Payment Type</label>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={paymentType} onChange={(e) => setPaymentType(e.target.value)} data-testid="payment-type-select">
              <option value="full">Full Payment</option>
              <option value="installment">Installment (Deposit + Balance)</option>
            </select>
          </div>

          {paymentType === "installment" && (
            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-1">Deposit % <span className="text-slate-400 font-normal">({depositPercent}% = {money((Number(amount) || computedTotal) * depositPercent / 100)})</span></label>
              <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" type="number" min="1" max="99" value={depositPercent} onChange={(e) => setDepositPercent(Number(e.target.value))} data-testid="deposit-percent-input" />
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1">Notes</label>
            <textarea className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms, delivery timeline, special instructions..." />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendAfter} onChange={(e) => setSendAfter(e.target.checked)} className="rounded" />
            <span>Send quote to customer immediately</span>
          </label>

          <button onClick={handleCreate} disabled={saving} data-testid="create-quote-btn"
            className="w-full rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2d4a66] disabled:opacity-50 flex items-center justify-center gap-2">
            <Send size={16} /> {saving ? "Creating..." : sendAfter ? "Create & Send Quote" : "Save as Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalesCrmPage() {
  const [tab, setTab] = useState("leads");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [quoteModal, setQuoteModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { search: search || undefined, status: statusFilter || undefined };
    const fetcher = tab === "leads" ? adminApi.getSalesCrmLeads(params)
      : tab === "quotes" ? adminApi.getQuotes(params)
      : tab === "orders" ? adminApi.getOrders(params)
      : adminApi.getSalesCrmPerformance();
    fetcher
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, statusFilter]);

  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(true);
    try {
      await adminApi.updateLeadStatusFacade({ lead_id: id, status: newStatus });
      setSelected(null); load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  const handleSendQuote = async (quoteId) => {
    setActionLoading(true);
    try {
      await adminApi.sendQuote(quoteId);
      setSelected(null); load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  return (
    <div data-testid="sales-crm-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Sales & CRM</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage leads, create quotes, and track orders through the full pipeline.</p>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" data-testid="sales-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); setStatusFilter(""); setSelected(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-[#20364D] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            data-testid={`tab-${t.key}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab !== "performance" && (
        <FilterBar search={search} onSearchChange={setSearch}
          filters={tab === "leads" ? [{
            key: "status", value: statusFilter, onChange: setStatusFilter,
            options: [{ value: "", label: "All" }, { value: "new", label: "New" }, { value: "contacted", label: "Contacted" }, { value: "quoting", label: "Quoting" }, { value: "qualified", label: "Qualified" }, { value: "converted", label: "Converted" }],
          }] : tab === "quotes" ? [{
            key: "status", value: statusFilter, onChange: setStatusFilter,
            options: [{ value: "", label: "All" }, { value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }, { value: "converted", label: "Converted" }, { value: "rejected", label: "Rejected" }],
          }] : []}
        />
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : tab === "performance" ? (
        rows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`perf-card-${i}`}>
                <p className="font-semibold text-[#20364D] text-lg">{r.name}</p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div><p className="text-xs text-slate-500">Leads</p><p className="text-lg font-bold text-[#20364D]">{r.leads}</p></div>
                  <div><p className="text-xs text-slate-500">Orders</p><p className="text-lg font-bold text-green-700">{r.orders}</p></div>
                  <div><p className="text-xs text-slate-500">Revenue</p><p className="text-lg font-bold text-[#D4A843]">{r.revenue}</p></div>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={BarChart3} title="No performance data" description="Sales performance data will appear once leads are assigned." />
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid={`${tab}-table`}>
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  {tab === "leads" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Assigned</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Action</th>
                  </>)}
                  {tab === "quotes" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Quote #</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Amount</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Payment</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Action</th>
                  </>)}
                  {tab === "orders" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Order #</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Total</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Date</th>
                  </>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} onClick={() => setSelected(row)} className="hover:bg-slate-50 cursor-pointer" data-testid={`row-${row.id || idx}`}>
                    {tab === "leads" && (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{row.customer_name || row.customer_id || "-"}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{row.record_type || row.type || "-"}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.assigned_to || "Unassigned"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {!["quoting", "converted"].includes(row.status) && (
                          <button onClick={() => setQuoteModal(row)} className="text-xs px-3 py-1.5 rounded-lg bg-[#20364D] text-white hover:bg-[#2d4a66]" data-testid="create-quote-btn">
                            <Plus size={12} className="inline mr-1" />Quote
                          </button>
                        )}
                        {row.status === "quoting" && <span className="text-xs text-blue-600 font-medium">Quote Sent</span>}
                        {row.status === "converted" && <span className="text-xs text-green-600 font-medium">Converted</span>}
                      </td>
                    </>)}
                    {tab === "quotes" && (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{row.quote_number || (row.id || "").slice(0, 12)}</td>
                      <td className="px-4 py-3 text-slate-700">{row.customer_name || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(row.total_amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{row.payment_type || "full"}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {row.status === "draft" && (
                          <button onClick={() => handleSendQuote(row.id)} disabled={actionLoading} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700" data-testid="send-quote-btn">
                            <Send size={12} className="inline mr-1" />Send
                          </button>
                        )}
                      </td>
                    </>)}
                    {tab === "orders" && (<>
                      <td className="px-4 py-3 font-semibold text-[#20364D]">{row.order_number || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.customer_name || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(row.total_amount || row.total)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                    </>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={tab === "leads" ? Target : tab === "quotes" ? FileText : ShoppingCart} title={`No ${tab} found`} description={tab === "leads" ? "Leads from requests appear here." : tab === "quotes" ? "Create quotes from the Leads tab." : "Orders appear after quote payment."} />
      )}

      {/* Detail Drawer */}
      <DetailDrawer open={!!selected && !quoteModal} onClose={() => setSelected(null)} title={tab === "leads" ? "Lead Detail" : tab === "quotes" ? "Quote Detail" : "Order Detail"}>
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-semibold text-[#20364D] mt-1">{selected.customer_name || selected.customer_id || "-"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{tab === "leads" ? "Status" : "Amount"}</p>
                {tab === "leads" ? <StatusBadge status={selected.status} /> : <p className="text-lg font-bold text-[#20364D] mt-1">{money(selected.total_amount || selected.total)}</p>}
              </div>
            </div>
            {tab === "quotes" && selected.payment_type === "installment" && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-semibold text-amber-700">Installment: {selected.deposit_percent}% deposit + {100 - selected.deposit_percent}% balance</p>
              </div>
            )}
            {selected.items && selected.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Items ({selected.items.length})</p>
                {selected.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span>{i.name || i.description || "Item"} x{i.quantity || 1}</span>
                    <span className="font-medium">{money(i.line_total || i.unit_price)}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === "leads" && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Actions</p>
                {!["quoting", "converted"].includes(selected.status) && (
                  <button onClick={() => setQuoteModal(selected)} className="w-full rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold hover:bg-[#2d4a66] flex items-center justify-center gap-2" data-testid="drawer-create-quote-btn">
                    <Plus size={16} /> Create Quote
                  </button>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {["new", "contacted", "qualified"].map(s => (
                    <button key={s} onClick={() => handleStatusUpdate(selected.id, s)} disabled={actionLoading || selected.status === s}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold capitalize text-slate-600 hover:bg-slate-50 disabled:opacity-40">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {tab === "quotes" && selected.status === "draft" && (
              <button onClick={() => handleSendQuote(selected.id)} disabled={actionLoading}
                className="w-full rounded-xl bg-blue-600 text-white px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Send size={16} /> Send to Customer
              </button>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* Quote Builder Modal */}
      {quoteModal && (
        <QuoteBuilderModal lead={quoteModal} onClose={() => setQuoteModal(null)} onCreated={() => { setQuoteModal(null); setTab("quotes"); load(); }} />
      )}
    </div>
  );
}
