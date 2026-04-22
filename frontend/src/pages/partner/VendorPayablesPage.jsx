import React, { useEffect, useState, useCallback } from "react";
import { FileText, Upload, DollarSign, Info, CheckCircle2, Clock, ArrowUpRight, Download, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const STATUS_PILL = {
  pending: "bg-slate-100 text-slate-700",
  invoice_uploaded: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-700",
  open: "bg-slate-100 text-slate-700",
};

function UploadInvoiceModal({ kind, entry, onClose, onDone }) {
  const [invNum, setInvNum] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!invNum.trim() || !file) { toast.error("Invoice number and file are required"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("invoice_number", invNum);
      fd.append("file", file);
      const url = kind === "statement"
        ? `/api/vendor/payables/statements/${entry.id}/upload-invoice`
        : `/api/vendor/payables/orders/${entry.id}/upload-invoice`;
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Invoice uploaded. Konekt Ops has been notified.");
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upload failed");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="vendor-upload-modal">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h3 className="text-lg font-bold mb-1">Upload your invoice</h3>
        <p className="text-xs text-slate-500 mb-4">
          {kind === "statement" ? `Statement ${entry.period}` : `Order ${entry.vendor_order_no}`} ·
          <span className="ml-1 font-semibold">{money(entry.amount || entry.total_amount)}</span>
        </p>
        <label className="text-xs font-semibold text-slate-600">Your invoice number</label>
        <Input value={invNum} onChange={(e) => setInvNum(e.target.value)} placeholder="e.g. INV-2025-0411" className="mb-3" data-testid="vendor-invoice-number" />
        <label className="text-xs font-semibold text-slate-600">Invoice file (PDF or image, max 20MB)</label>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm mt-1 mb-4 file:mr-3 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" data-testid="vendor-invoice-file" />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy} data-testid="upload-cancel">Cancel</Button>
          <Button onClick={submit} disabled={busy} data-testid="upload-confirm">
            {busy ? "Uploading…" : "Upload & notify Ops"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalityCard({ modality, pending, onRequest }) {
  const otherModality = modality === "pay_per_order" ? "monthly_statement" : "pay_per_order";
  const [showReq, setShowReq] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setBusy(true);
    try {
      await api.post("/api/vendor/payables/request-modality", { requested_modality: otherModality, reason });
      toast.success("Request sent to Konekt Ops");
      onRequest?.();
      setShowReq(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
    setBusy(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-5" data-testid="vendor-modality-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase font-semibold text-indigo-500 tracking-wide">Your payment terms</div>
          <div className="text-xl font-bold mt-1 text-[#20364D]">
            {modality === "pay_per_order" ? "Pay per order" : "Monthly statement"}
          </div>
          <div className="text-xs text-slate-600 mt-1 max-w-md">
            {modality === "pay_per_order"
              ? "You upload your invoice against each order. Konekt Ops pays before releasing fulfillment."
              : "Konekt generates one consolidated statement per month. You upload a single invoice against it."}
          </div>
        </div>
        <Banknote className="w-8 h-8 text-indigo-300" />
      </div>
      {pending ? (
        <div className="mt-4 text-xs bg-amber-50 text-amber-700 px-3 py-2 rounded-lg inline-flex items-center gap-2" data-testid="modality-pending">
          <Clock className="w-3 h-3" /> Request pending review
        </div>
      ) : showReq ? (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold text-slate-600">
            Why do you want to switch to {otherModality.replace("_", " ")}? (optional)
          </label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. We've delivered 30 orders, would like consolidated monthly billing" className="text-sm" data-testid="request-modality-reason" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowReq(false)} disabled={busy}>Cancel</Button>
            <Button size="sm" onClick={request} disabled={busy} data-testid="send-modality-request">
              {busy ? "Sending…" : "Request change"}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowReq(true)} data-testid="open-request-modality">
          <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Request switch to {otherModality.replace("_", " ")}
        </Button>
      )}
    </div>
  );
}

export default function VendorPayablesPage() {
  const [tab, setTab] = useState("orders");
  const [modality, setModality] = useState(null);
  const [pending, setPending] = useState(null);
  const [orders, setOrders] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadEntry, setUploadEntry] = useState(null);
  const [uploadKind, setUploadKind] = useState("order");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, o, s] = await Promise.all([
        api.get("/api/vendor/payables/modality"),
        api.get("/api/vendor/payables/orders"),
        api.get("/api/vendor/payables/statements"),
      ]);
      setModality(m.data?.modality || "pay_per_order");
      setPending(m.data?.pending_request);
      setOrders(o.data || []);
      setStatements(s.data || []);
    } catch (e) {
      toast.error("Failed to load payables");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-select relevant tab
  useEffect(() => {
    if (modality === "monthly_statement") setTab("statements");
  }, [modality]);

  const totalOutstanding =
    orders.filter((o) => o.vendor_payment_status !== "paid").reduce((s, o) => s + (o.amount || 0), 0)
    + statements.filter((s) => s.status !== "paid").reduce((sum, s) => sum + (s.total_amount || 0), 0);

  return (
    <div className="p-6 space-y-6" data-testid="vendor-payables-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">My Payables</h1>
        <p className="text-sm text-slate-500 mt-1">Upload your invoice, get paid faster. Konekt is your single client.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <ModalityCard modality={modality || "pay_per_order"} pending={pending} onRequest={load} />
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-5">
          <div className="text-xs uppercase font-semibold text-amber-600 tracking-wide">Outstanding</div>
          <div className="text-2xl font-bold mt-1 text-[#20364D]" data-testid="vendor-total-outstanding">{money(totalOutstanding)}</div>
          <div className="text-xs text-slate-600 mt-1">
            {orders.filter((o) => o.vendor_payment_status !== "paid").length} orders ·
            {" "}{statements.filter((s) => s.status !== "paid").length} statements
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-white border rounded-2xl p-5">
          <div className="text-xs uppercase font-semibold text-slate-500 tracking-wide flex items-center gap-1"><Info className="w-3 h-3" /> How to get paid</div>
          <ol className="text-xs text-slate-700 mt-2 list-decimal ml-4 space-y-1">
            <li>Complete the order.</li>
            <li>Upload your invoice (PDF/image) with your invoice number.</li>
            <li>Konekt Ops reviews and pays.</li>
            <li>You'll see "paid" status and the reference here.</li>
          </ol>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { k: "orders", label: `Per-Order (${orders.length})` },
          { k: "statements", label: `Monthly Statements (${statements.length})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${tab === t.k ? "border-[#20364D] text-[#20364D]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            data-testid={`vendor-payables-tab-${t.k}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Ref / Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">{loading ? "Loading…" : "No orders yet"}</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t hover:bg-slate-50/40" data-testid={`vendor-payable-${o.id}`}>
                  <td className="px-4 py-3 font-mono text-xs">{o.vendor_order_no}<div className="text-[10px] text-slate-400">{o.created_at?.slice(0, 10)}</div></td>
                  <td className="px-4 py-3 text-right font-semibold">{money(o.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[o.vendor_payment_status] || STATUS_PILL.pending}`}>
                      {(o.vendor_payment_status || "pending").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.vendor_invoice_file ? (
                      <a href={o.vendor_invoice_file} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1">
                        <Download className="w-3 h-3" /> {o.vendor_invoice_number || "View"}
                      </a>
                    ) : <span className="text-slate-400 text-xs">Not uploaded</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {o.vendor_payment_status === "paid"
                      ? <span className="text-emerald-700"><CheckCircle2 className="inline w-3 h-3 mr-0.5" /> {o.vendor_payment_reference || "Paid"}</span>
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {o.vendor_payment_status !== "paid" && (
                      <Button size="sm" variant={o.vendor_invoice_file ? "outline" : "default"} onClick={() => { setUploadKind("order"); setUploadEntry(o); }} data-testid={`upload-invoice-${o.id}`}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> {o.vendor_invoice_file ? "Replace" : "Upload invoice"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "statements" && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Period</th>
                <th className="text-right px-4 py-3">Orders</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {statements.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No statements yet. Ask Konekt Ops to upgrade your terms once you've delivered a few orders.</td></tr>
              )}
              {statements.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50/40" data-testid={`vendor-statement-${s.id}`}>
                  <td className="px-4 py-3 font-mono text-xs">{s.period}</td>
                  <td className="px-4 py-3 text-right">{s.order_count}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(s.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[s.status] || STATUS_PILL.open}`}>
                      {(s.status || "open").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.vendor_invoice_file ? (
                      <a href={s.vendor_invoice_file} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1">
                        <Download className="w-3 h-3" /> {s.vendor_invoice_number || "View"}
                      </a>
                    ) : <span className="text-slate-400 text-xs">Not uploaded</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.status !== "paid" && (
                      <Button size="sm" variant={s.vendor_invoice_file ? "outline" : "default"} onClick={() => { setUploadKind("statement"); setUploadEntry(s); }} data-testid={`upload-stmt-${s.id}`}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> {s.vendor_invoice_file ? "Replace" : "Upload invoice"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uploadEntry && (
        <UploadInvoiceModal kind={uploadKind} entry={uploadEntry} onClose={() => setUploadEntry(null)} onDone={load} />
      )}
    </div>
  );
}
