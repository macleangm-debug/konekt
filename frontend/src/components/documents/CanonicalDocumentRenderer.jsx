import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Building, Mail, Phone, MapPin, Landmark } from "lucide-react";
import api from "@/lib/api";
import html2canvas from "html2canvas";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

/**
 * CanonicalDocumentRenderer — Single shared renderer for all business documents.
 * 
 * Props:
 *   docType: "invoice" | "quote" | "delivery_note" | "purchase_order" | "statement"
 *   docNumber: string
 *   docDate: string
 *   dueDate?: string
 *   status?: string
 *   fromOverrides?: {} — overrides for company info (optional)
 *   toBlock: { name, address, email, phone, tin? }
 *   lineItems: [{ description, quantity, unit_price, total }]
 *   subtotal: number
 *   tax?: number
 *   discount?: number
 *   total: number
 *   currency: string
 *   notes?: string
 *   children?: ReactNode — extra content between items and footer
 *   ref: exposes { exportAsImage }
 */
const CanonicalDocumentRenderer = forwardRef(function CanonicalDocumentRenderer({
  docType = "invoice",
  docNumber = "",
  docDate = "",
  dueDate = "",
  status = "",
  toBlock = {},
  lineItems = [],
  subtotal = 0,
  tax = 0,
  discount = 0,
  total = 0,
  currency = "TZS",
  notes = "",
  children,
}, ref) {
  const [settings, setSettings] = useState(null);
  const [hubSettings, setHubSettings] = useState(null);
  const docRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/admin/business-settings/public").then(r => r.data).catch(() => ({})),
      api.get("/api/admin/settings-hub").then(r => r.data).catch(() => ({})),
    ]).then(([bs, hub]) => {
      setSettings(bs);
      setHubSettings(hub);
    });
  }, []);

  useImperativeHandle(ref, () => ({
    async exportAsImage(filename) {
      if (!docRef.current) return;
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = filename || `${docNumber || docType}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    },
  }));

  if (!settings) return null;

  const fmt = (v) => `${currency} ${Number(v || 0).toLocaleString()}`;
  const companyName = settings.company_name || settings.trading_name || "";
  const logoUrl = settings.logo_url ? (settings.logo_url.startsWith("http") ? settings.logo_url : `${API_URL}/api/files/serve/${settings.logo_url}`) : "";
  const stampUrl = settings.stamp_url ? (settings.stamp_url.startsWith("http") ? settings.stamp_url : `${API_URL}/api/files/serve/${settings.stamp_url}`) : "";

  // Document footer settings
  const df = hubSettings?.doc_footer || {};
  const showAddress = df.show_address !== false;
  const showEmail = df.show_email !== false;
  const showPhone = df.show_phone !== false;
  const showReg = df.show_registration || false;
  const customFooter = df.custom_footer_text || "";

  const docTypeLabels = {
    invoice: "INVOICE",
    quote: "QUOTATION",
    delivery_note: "DELIVERY NOTE",
    purchase_order: "PURCHASE ORDER",
    statement: "STATEMENT OF ACCOUNT",
    service_handover: "SERVICE HANDOVER",
  };

  const address = [settings.address, settings.city, settings.country].filter(Boolean).join(", ");

  return (
    <div ref={docRef} className="bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 794, margin: "0 auto" }} data-testid="canonical-document">
      {/* Header */}
      <div style={{ backgroundColor: "#20364D", color: "#fff", padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {logoUrl ? (
            <img src={logoUrl} alt="" crossOrigin="anonymous" style={{ height: 48, width: "auto", objectFit: "contain", marginBottom: 12 }} onError={(e) => { e.target.style.display = "none"; }} />
          ) : (
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{companyName}</div>
          )}
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2, marginTop: 4 }}>{docTypeLabels[docType] || docType.toUpperCase()}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{docNumber}</div>
          {status && (
            <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", backgroundColor: status === "paid" ? "#dcfce7" : status === "overdue" ? "#fef2f2" : "#f1f5f9", color: status === "paid" ? "#15803d" : status === "overdue" ? "#dc2626" : "#475569" }}>
              {status}
            </span>
          )}
        </div>
      </div>

      {/* Company/Client Row */}
      <div style={{ padding: "28px 40px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>From</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#20364D" }}>{companyName}</div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, marginTop: 4 }}>
            {settings.address && <div>{settings.address}</div>}
            {settings.city && <div>{settings.city}, {settings.country}</div>}
            {settings.email && <div>{settings.email}</div>}
            {settings.phone && <div>{settings.phone}</div>}
            {settings.tin && <div>TIN: {settings.tin}</div>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>To</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#20364D" }}>{toBlock.name || ""}</div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, marginTop: 4 }}>
            {toBlock.address && <div>{toBlock.address}</div>}
            {toBlock.email && <div>{toBlock.email}</div>}
            {toBlock.phone && <div>{toBlock.phone}</div>}
            {toBlock.tin && <div>TIN: {toBlock.tin}</div>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>Details</div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
            <div><span style={{ display: "inline-block", width: 80, fontWeight: 600, color: "#475569" }}>Date:</span> {docDate}</div>
            {dueDate && <div><span style={{ display: "inline-block", width: 80, fontWeight: 600, color: "#475569" }}>Due:</span> {dueDate}</div>}
            <div><span style={{ display: "inline-block", width: 80, fontWeight: 600, color: "#475569" }}>Ref:</span> {docNumber}</div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div style={{ padding: "0 40px 24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>#</th>
              <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Description</th>
              <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Unit Price</th>
              <th style={{ textAlign: "right", padding: "10px 0", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 0", color: "#94a3b8", fontSize: 12 }}>{i + 1}</td>
                <td style={{ padding: "10px 8px", color: "#20364D", fontWeight: 500 }}>{item.description || item.name || ""}</td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#475569" }}>{item.quantity || 1}</td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#475569" }}>{fmt(item.unit_price)}</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#20364D" }}>{fmt(item.total || (item.quantity || 1) * (item.unit_price || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#64748b" }}>
              <span>Subtotal</span><span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#dc2626" }}>
                <span>Discount</span><span style={{ fontWeight: 600 }}>-{fmt(discount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#64748b" }}>
                <span>Tax</span><span style={{ fontWeight: 600 }}>{fmt(tax)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 16, fontWeight: 800, color: "#20364D", borderTop: "2px solid #20364D", marginTop: 4 }}>
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ padding: "0 40px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{notes}</div>
        </div>
      )}

      {/* Extra content (children) */}
      {children && <div style={{ padding: "0 40px 20px" }}>{children}</div>}

      {/* Bank + Signature + Stamp Row */}
      <div style={{ padding: "16px 40px", display: "grid", gridTemplateColumns: settings.bank_name && settings.bank_account_number ? "1fr 240px" : "1fr", gap: 20 }}>
        {settings.bank_name && settings.bank_account_number && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              Bank Transfer Details
            </div>
            <div style={{ fontSize: 12, color: "#20364D", lineHeight: 1.8 }}>
              <div><span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Bank:</span> {settings.bank_name}</div>
              <div><span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Account:</span> {settings.bank_account_name}</div>
              <div><span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Account No:</span> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{settings.bank_account_number}</span></div>
              {settings.bank_branch && <div><span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Branch:</span> {settings.bank_branch}</div>}
              {settings.swift_code && <div><span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>SWIFT:</span> {settings.swift_code}</div>}
              <div><span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Reference:</span> <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#D4A843" }}>{docNumber}</span></div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Signature */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 6 }}>Authorized By</div>
            <div style={{ height: 32, borderBottom: "2px solid #e2e8f0", marginBottom: 6 }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#20364D" }}>Chief Finance Officer</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{companyName}</div>
          </div>
          {/* Stamp */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 6 }}>Company Stamp</div>
            {stampUrl ? (
              <img src={stampUrl} alt="stamp" crossOrigin="anonymous" style={{ height: 72, width: "auto", margin: "0 auto" }} onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <div style={{ width: 72, height: 72, margin: "0 auto", borderRadius: "50%", border: "2px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 8, color: "#94a3b8", fontWeight: 600, textAlign: "center", lineHeight: 1.2, padding: 4 }}>{companyName.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2e8f0", padding: "16px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
          Thank you for your business. Please include the document number as payment reference.
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 10, color: "#cbd5e1", flexWrap: "wrap" }}>
          {showAddress && address && <span>{address}</span>}
          {showEmail && settings.email && <span>{settings.email}</span>}
          {showPhone && settings.phone && <span>{settings.phone}</span>}
        </div>
        {showReg && (settings.tin || settings.brn) && (
          <div style={{ fontSize: 9, color: "#cbd5e1", marginTop: 4 }}>
            {settings.tin && <>TIN: {settings.tin}</>}
            {settings.tin && settings.brn && <> &bull; </>}
            {settings.brn && <>BRN: {settings.brn}</>}
          </div>
        )}
        {customFooter && <div style={{ fontSize: 9, color: "#cbd5e1", marginTop: 4 }}>{customFooter}</div>}
      </div>
    </div>
  );
});

export default CanonicalDocumentRenderer;
