import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Building2, Mail, MapPin, StickyNote,
  ShoppingCart, Loader2, ArrowLeft, Package, CheckCircle2,
  LogIn, UserPlus, Copy, Check, Upload, FileText, CreditCard,
  AlertCircle, ChevronRight, X, Image, File, Clock, Shield
} from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { toast } from "sonner";
import SalesAssistCtaCard from "../../components/marketplace/SalesAssistCtaCard";
import SalesAssistModal from "../../components/marketplace/SalesAssistModal";

const API_URL = process.env.REACT_APP_BACKEND_URL;
function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

// ─── Step indicators ────────────────────────────────────
const STEPS = [
  { key: "details", label: "Cart", num: "1", completed: true },
  { key: "details", label: "Details", num: "2" },
  { key: "payment", label: "Payment & Proof", num: "3" },
];

function StepBar({ current }) {
  const stageMap = { details: 1, payment: 2, done: 3 };
  const currentIdx = stageMap[current] || 0;
  const steps = [
    { label: "Cart", num: "1" },
    { label: "Details", num: "2" },
    { label: "Payment & Proof", num: "3" },
  ];
  return (
    <div className="flex items-center gap-1 mb-8" data-testid="checkout-steps">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.label}>
            {i > 0 && <div className={`flex-1 h-0.5 mx-1 rounded ${done ? "bg-green-400" : "bg-slate-200"}`} />}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
              ${done ? "bg-green-100 text-green-700" : active ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-400"}`}
              data-testid={`step-${step.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {done ? <Check className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold">{step.num}</span>}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Order summary (reused across stages) ───────
function OrderSummary({ orderItems, orderTotal, orderCount, orderNumber, compact, vatPercent, vatAmount, subtotal }) {
  if (!orderItems || orderItems.length === 0) return null;
  const hasVat = vatPercent > 0 && vatAmount > 0;
  return (
    <div className={`rounded-2xl border bg-white p-5 ${compact ? "" : "sticky top-24"}`} data-testid="checkout-summary">
      <h2 className="text-base font-bold text-[#20364D] mb-1">Order Summary</h2>
      {orderNumber && (
        <p className="text-xs text-slate-500 mb-3 font-mono bg-slate-50 inline-block px-2 py-0.5 rounded" data-testid="summary-order-number">
          {orderNumber}
        </p>
      )}
      <div className="text-xs text-slate-400 mb-2">{orderCount} item{orderCount !== 1 ? "s" : ""}</div>
      <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
        {orderItems.map((item, i) => (
          <div key={item.id || item.product_id || i} className="flex gap-3 pb-2.5 border-b last:border-0">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.product_name}</p>
              <p className="text-xs text-slate-500">Qty: {item.quantity} x {money(item.unit_price)}</p>
            </div>
            <span className="text-sm font-semibold flex-shrink-0">{money(item.subtotal || (item.quantity * item.unit_price))}</span>
          </div>
        ))}
      </div>
      <div className="border-t mt-3 pt-3 space-y-1.5">
        {hasVat && (
          <>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{money(subtotal || orderTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600" data-testid="vat-line">
              <span>VAT ({vatPercent}%)</span>
              <span>{money(vatAmount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-bold text-[#20364D] text-lg">
          <span>Total</span>
          <span data-testid="summary-total">{money(orderTotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Drag & Drop File Upload ────────────────────────────
function ProofFileUpload({ file, setFile, uploading, uploadProgress }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "pdf"];
    if (!allowed.includes(ext)) {
      toast.error(`Unsupported file type. Allowed: ${allowed.join(", ")}`);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, [setFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    handleFile(f);
  }, [handleFile]);

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div data-testid="proof-file-upload">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        <Upload className="w-3.5 h-3.5 inline mr-1" />Payment Proof (Image or PDF)
      </label>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragOver ? "border-[#D4A843] bg-amber-50/50" : "border-slate-300 hover:border-[#20364D]/40 hover:bg-slate-50"}`}
          data-testid="upload-dropzone"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              Drag & drop your payment proof here
            </p>
            <p className="text-xs text-slate-400">or click to browse</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Image className="w-3 h-3" /> JPG, PNG, WebP
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <File className="w-3 h-3" /> PDF
              </span>
              <span className="text-xs text-slate-300">Max 10MB</span>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
            data-testid="upload-input"
          />
        </div>
      ) : (
        <div className="border rounded-xl p-4 bg-slate-50" data-testid="upload-preview">
          <div className="flex items-start gap-3">
            {/* Preview */}
            <div className="w-16 h-16 rounded-lg bg-white border flex-shrink-0 flex items-center justify-center overflow-hidden">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-6 h-6 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              {uploading && (
                <div className="mt-2">
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className="bg-[#D4A843] h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Uploading... {uploadProgress}%</p>
                </div>
              )}
            </div>
            {!uploading && (
              <button onClick={removeFile} className="p-1 hover:bg-white rounded" data-testid="remove-file-btn">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function PublicCheckoutPage() {
  const navigate = useNavigate();
  const { items, total, itemCount, clearCart } = useCart();

  const [stage, setStage] = useState("details");
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [proofResult, setProofResult] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [orderSnapshot, setOrderSnapshot] = useState(null);
  const [showSalesAssist, setShowSalesAssist] = useState(false);

  // File upload state
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // VAT state (fetched from canonical source, 18% default)
  const [vatPercent, setVatPercent] = useState(18);

  // Fetch VAT rate on mount
  useEffect(() => {
    fetch(`${API_URL}/api/public/payment-info`)
      .then(r => r.json())
      .then(d => {
        setVatPercent(d.vat_percent || 0);
      })
      .catch(() => {});
  }, []);

  // Forms
  const [form, setForm] = useState({
    customer_name: "", email: "", phone_prefix: "+255", phone: "",
    company_name: "", delivery_address: "", city: "", country: "Tanzania", notes: "",
  });
  const [proofForm, setProofForm] = useState({
    payer_name: "", amount_paid: "", bank_reference: "",
    payment_method: "bank_transfer", payment_date: new Date().toISOString().split("T")[0], notes: "",
  });

  // Fetch bank details from canonical source on payment stage
  const [bankDetails, setBankDetails] = useState(null);
  useEffect(() => {
    if (stage === "payment") {
      fetch(`${API_URL}/api/public/payment-info`)
        .then(r => r.json())
        .then(d => {
          setBankDetails(d);
          if (d.vat_percent) setVatPercent(d.vat_percent);
        })
        .catch(() => {});
    }
  }, [stage]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setP = (k, v) => setProofForm(p => ({ ...p, [k]: v }));
  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(""), 2000);
  };

  // ─── Stage 1: Place Order ──────────────────────────────
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.email || !form.phone)
      return toast.error("Please fill in all required fields.");
    if (items.length === 0)
      return toast.error("Your cart is empty.");

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        items: items.map(item => ({
          product_id: item.product_id, product_name: item.product_name,
          quantity: item.quantity, unit_price: item.unit_price,
          subtotal: item.subtotal, size: item.size, color: item.color,
          variant: item.variant, listing_type: item.listing_type || "product",
        })),
      };
      const res = await fetch(`${API_URL}/api/public/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Checkout failed");

      setOrderSnapshot({
        items: [...items],
        total: data.total,
        itemCount,
        subtotal: data.subtotal,
        vat_percent: data.vat_percent,
        vat_amount: data.vat_amount,
      });
      setOrderResult(data);
      setProofForm(p => ({ ...p, payer_name: form.customer_name, amount_paid: String(data.total || total) }));
      setStage("payment");
      toast.success(`Order ${data.order_number} placed! Now submit your payment proof.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── File upload helper ────────────────────────────────
  const uploadProofFile = async () => {
    if (!proofFile) return null;
    setUploading(true);
    setUploadProgress(10);
    try {
      const formData = new FormData();
      formData.append("file", proofFile);
      setUploadProgress(30);
      const res = await fetch(`${API_URL}/api/public/upload-proof-file`, {
        method: "POST",
        body: formData,
      });
      setUploadProgress(80);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setUploadProgress(100);
      return data.url;
    } catch (err) {
      toast.error(`File upload failed: ${err.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ─── Stage 2: Submit Payment Proof ─────────────────────
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofForm.payer_name) return toast.error("Enter the payer name.");
    if (!proofForm.amount_paid) return toast.error("Enter the amount paid.");

    setSubmitting(true);
    try {
      // Upload file first if present
      let fileUrl = "";
      if (proofFile) {
        fileUrl = await uploadProofFile();
        if (fileUrl === null) {
          setSubmitting(false);
          return; // Upload failed, error already shown
        }
      }

      const res = await fetch(`${API_URL}/api/public/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderResult.order_number,
          email: form.email,
          payer_name: proofForm.payer_name,
          amount_paid: parseFloat(proofForm.amount_paid),
          bank_reference: proofForm.bank_reference,
          payment_method: proofForm.payment_method,
          payment_date: proofForm.payment_date,
          notes: proofForm.notes,
          proof_file_url: fileUrl || "",
          proof_file_name: proofFile?.name || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed");

      setProofResult(data);
      clearCart();
      setStage("done");
      toast.success("Payment proof submitted!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sideItems = orderSnapshot?.items || items;
  const sideTotal = orderSnapshot?.total || total;
  const sideCount = orderSnapshot?.itemCount || itemCount;

  // Compute VAT for display
  const cartSubtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const displayVatPercent = orderSnapshot?.vat_percent ?? vatPercent;
  const displayVatAmount = orderSnapshot?.vat_amount ?? Math.floor(cartSubtotal * (vatPercent / 100));
  const displaySubtotal = orderSnapshot?.subtotal ?? cartSubtotal;
  const displayTotal = orderSnapshot?.total ?? (cartSubtotal + displayVatAmount);

  // ─── Empty cart + no order in progress ─────────────────
  if (stage === "details" && items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#20364D]">Your cart is empty</h2>
        <p className="text-slate-500 mt-2">Add products before checking out.</p>
        <button onClick={() => navigate("/marketplace")}
          className="mt-4 rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold"
          data-testid="browse-marketplace-btn">
          Browse Marketplace
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // STAGE 3 — CONFIRMATION (with account CTA)
  // ═══════════════════════════════════════════════════════
  if (stage === "done") {
    const acc = proofResult?.account_info || orderResult?.account_info || {};
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10" data-testid="checkout-success">
        <StepBar current="done" />
        <div className="rounded-2xl bg-white border p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#20364D]">Payment Proof Submitted</h1>
            <p className="text-slate-600 mt-1">
              Order <span className="font-bold font-mono">{orderResult?.order_number}</span>
            </p>
          </div>

          {/* What happens next */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 mb-6" data-testid="what-happens-next">
            <h3 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> What happens next?
            </h3>
            <ol className="text-sm text-blue-800 space-y-1.5 list-decimal list-inside">
              <li>Our admin team will verify your payment proof</li>
              <li>Once verified, your order moves to our sales team for processing</li>
              <li>You will receive confirmation when your order is being fulfilled</li>
            </ol>
          </div>

          {/* Order snapshot */}
          {orderSnapshot && (
            <div className="mb-6">
              <OrderSummary orderItems={orderSnapshot.items} orderTotal={orderSnapshot.total} orderCount={orderSnapshot.itemCount} orderNumber={orderResult?.order_number} compact
                vatPercent={orderSnapshot.vat_percent} vatAmount={orderSnapshot.vat_amount} subtotal={orderSnapshot.subtotal} />
            </div>
          )}

          {/* Account CTA — ONLY after successful proof submission */}
          {acc.type && (
            <div className="rounded-xl bg-gradient-to-br from-[#0E1A2B] to-[#20364D] p-6 text-white mb-6" data-testid="account-cta-after-payment">
              <p className="font-bold text-lg">{acc.message}</p>
              <ul className="text-sm text-slate-300 mt-2 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> Track order status and updates</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> View invoices and payment history</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> Reorder faster next time</li>
              </ul>
              <div className="mt-4">
                {acc.type === "login" ? (
                  <button onClick={() => navigate("/login")}
                    className="flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-2.5 font-semibold hover:bg-[#c49a3d] transition"
                    data-testid="login-btn">
                    <LogIn className="w-4 h-4" /> Log In to Track Order
                  </button>
                ) : (
                  <button onClick={() => navigate(acc.invite_url || "/login")}
                    className="flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-2.5 font-semibold hover:bg-[#c49a3d] transition"
                    data-testid="create-account-btn">
                    <UserPlus className="w-4 h-4" /> Create Account to Track Order
                  </button>
                )}
              </div>
            </div>
          )}

          <button onClick={() => navigate("/marketplace")}
            className="w-full rounded-xl border px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition"
            data-testid="continue-browsing-btn">
            Continue Browsing
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // STAGE 2 — PAYMENT + PROOF
  // ═══════════════════════════════════════════════════════
  if (stage === "payment" && orderResult) {
    const bank = bankDetails || orderResult.bank_details || {};
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" data-testid="checkout-payment-stage">
        <StepBar current="payment" />
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          <div className="lg:col-span-3 space-y-6">

            {/* Order confirmed banner */}
            <div className="rounded-2xl bg-green-50 border border-green-200 p-4 sm:p-5 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-green-900">Order Placed Successfully</h2>
                <p className="text-green-800 text-sm">
                  Order <span className="font-bold font-mono">{orderResult.order_number}</span> — {money(orderResult.total)}
                </p>
                <p className="text-green-700 text-xs mt-1">Complete your payment and upload proof below to proceed.</p>
              </div>
            </div>

            {/* ─── BANK DETAILS BLOCK ─────────────────────── */}
            <div className="rounded-2xl border bg-white overflow-hidden" data-testid="bank-details">
              <div className="bg-[#0E1A2B] px-5 py-4">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#D4A843]" /> Bank Transfer Details
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">Transfer the exact amount to the account below</p>
              </div>

              <div className="p-5 space-y-3">
                {/* Payment reference — highlighted */}
                <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4 text-center" data-testid="payment-reference-block">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">Payment Reference</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold font-mono text-[#20364D]" data-testid="payment-reference">
                      {orderResult.order_number}
                    </span>
                    <button
                      onClick={() => handleCopy(orderResult.order_number, "reference")}
                      className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition"
                      data-testid="copy-reference-btn"
                    >
                      {copiedField === "reference" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
                    </button>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">Use this as your bank transfer reference</p>
                </div>

                {/* Bank details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { label: "Bank Name", value: bank.bank_name, key: "bank" },
                    { label: "Account Name", value: bank.account_name, key: "acct_name" },
                    { label: "Account Number", value: bank.account_number, key: "acct_num" },
                    { label: "Branch", value: bank.branch, key: "branch" },
                    { label: "SWIFT Code", value: bank.swift_code || bank.swift, key: "swift" },
                    { label: "Currency", value: bank.currency || "TZS", key: "currency" },
                  ].filter(r => r.value).map(({ label, value, key }) => (
                    <div key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-slate-500 block">{label}</span>
                        <p className="font-semibold text-[#20364D] text-sm truncate">{value}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(value, key)}
                        className="p-1 text-slate-300 hover:text-[#20364D] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        data-testid={`copy-${key}`}
                      >
                        {copiedField === key ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Amount to transfer */}
                <div className="rounded-lg bg-[#20364D] text-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-300">Amount to Transfer</p>
                    <p className="text-xl font-bold" data-testid="transfer-amount">{money(orderResult.total)}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(String(orderResult.total), "amount")}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                    data-testid="copy-amount"
                  >
                    {copiedField === "amount" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Payment instructions */}
                <div className="text-sm text-slate-600 space-y-1.5 pt-2">
                  <p className="font-medium text-[#20364D] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" /> Payment Instructions
                  </p>
                  <ol className="list-decimal list-inside text-xs space-y-1 text-slate-500 pl-1">
                    <li>Transfer the exact amount shown above to the bank account</li>
                    <li>Use the order number <strong>{orderResult.order_number}</strong> as payment reference</li>
                    <li>After payment, fill in the proof form below and upload your receipt</li>
                    <li>Our admin team will verify your payment within 1-2 business hours</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* ─── PAYMENT PROOF FORM ─────────────────────── */}
            <form onSubmit={handleSubmitProof} className="rounded-2xl border bg-white p-5 sm:p-6 space-y-4" data-testid="payment-proof-form">
              <div>
                <h2 className="text-lg font-bold text-[#20364D] flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Submit Payment Proof
                </h2>
                <p className="text-sm text-slate-500 mt-1">After completing your transfer, fill in the details and upload your receipt or screenshot.</p>
              </div>

              {/* File upload */}
              <ProofFileUpload
                file={proofFile}
                setFile={setProofFile}
                uploading={uploading}
                uploadProgress={uploadProgress}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payer Name *</label>
                  <input type="text" value={proofForm.payer_name} onChange={e => setP("payer_name", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    placeholder="Name on the bank transfer" required data-testid="pp-payer-name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid (TZS) *</label>
                  <input type="number" step="0.01" value={proofForm.amount_paid} onChange={e => setP("amount_paid", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    required data-testid="pp-amount" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Reference / Receipt No.</label>
                  <input type="text" value={proofForm.bank_reference} onChange={e => setP("bank_reference", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    placeholder="e.g. TXN-123456" data-testid="pp-reference" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
                  <select value={proofForm.payment_method} onChange={e => setP("payment_method", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    data-testid="pp-method">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money (M-Pesa, Tigo Pesa)</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
                  <input type="date" value={proofForm.payment_date} onChange={e => setP("payment_date", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    data-testid="pp-date" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Notes</label>
                <textarea value={proofForm.notes} onChange={e => setP("notes", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 min-h-[70px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Any details about the transfer..." data-testid="pp-notes" />
              </div>

              <button type="submit" disabled={submitting || uploading}
                className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="submit-payment-proof-btn">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Upload className="w-5 h-5" /> Submit Payment Proof</>}
              </button>

              {/* Admin verification note */}
              <div className="flex items-start gap-2 text-xs text-slate-500 pt-1">
                <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                <span>Payment is verified by our admin team first. Your order will move to sales processing only after verification is complete.</span>
              </div>
            </form>
          </div>

          {/* Sidebar — order summary */}
          <div className="lg:col-span-2">
            <OrderSummary
              orderItems={sideItems}
              orderTotal={displayTotal}
              orderCount={sideCount}
              orderNumber={orderResult?.order_number}
              vatPercent={displayVatPercent}
              vatAmount={displayVatAmount}
              subtotal={displaySubtotal}
            />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // STAGE 1 — DETAILS + ORDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" data-testid="public-checkout-page">
      <button onClick={() => navigate("/cart")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-4" data-testid="back-to-cart-btn">
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </button>

      <StepBar current="details" />

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
        {/* Form */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-3 space-y-6" data-testid="checkout-form">
          <section className="rounded-2xl border bg-white p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#20364D]">Contact Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5"><User className="w-3.5 h-3.5 inline mr-1" />Full Name *</label>
                <input type="text" value={form.customer_name} onChange={e => set("customer_name", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="John Doe" required data-testid="checkout-name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5"><Building2 className="w-3.5 h-3.5 inline mr-1" />Company</label>
                <input type="text" value={form.company_name} onChange={e => set("company_name", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Acme Corp" data-testid="checkout-company" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5"><Mail className="w-3.5 h-3.5 inline mr-1" />Email *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="you@company.com" required data-testid="checkout-email" />
              </div>
              <PhoneNumberField
                prefix={form.phone_prefix} number={form.phone}
                onPrefixChange={v => set("phone_prefix", v)} onNumberChange={v => set("phone", v)}
                required testIdPrefix="checkout-phone" />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#20364D]">Delivery Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Delivery Address</label>
                <input type="text" value={form.delivery_address} onChange={e => set("delivery_address", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Street address" data-testid="checkout-address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input type="text" value={form.city} onChange={e => set("city", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Dar es Salaam" data-testid="checkout-city" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                <input type="text" value={form.country} onChange={e => set("country", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  data-testid="checkout-country" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5"><StickyNote className="w-3.5 h-3.5 inline mr-1" />Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                className="w-full border rounded-xl px-4 py-2.5 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Any special instructions..." data-testid="checkout-notes" />
            </div>
          </section>

          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="place-order-btn">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : <>Place Order — {money(displayTotal)}</>}
          </button>

          <p className="text-xs text-center text-slate-400">
            No account required. You will see payment details on the next step.
          </p>
        </form>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-2">
          <OrderSummary orderItems={items} orderTotal={displayTotal} orderCount={itemCount}
            vatPercent={vatPercent} vatAmount={displayVatAmount} subtotal={cartSubtotal} />
          <div className="mt-4">
            <SalesAssistCtaCard
              title="Need a custom quote?"
              body="Let our sales team handle pricing, specs, and delivery arrangements for you."
              onClick={() => setShowSalesAssist(true)}
              compact
            />
          </div>
        </div>
      </div>
      <SalesAssistModal
        isOpen={showSalesAssist}
        onClose={() => setShowSalesAssist(false)}
        productName={items.map(i => i.product_name || i.name).filter(Boolean).join(", ")}
        source="checkout_sales_assist"
      />
    </div>
  );
}
