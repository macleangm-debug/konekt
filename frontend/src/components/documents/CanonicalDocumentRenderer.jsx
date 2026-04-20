import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import api from "@/lib/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

// ─── Template Style Definitions ───
const TEMPLATES = {
  classic: {
    headerBg: "#20364D",
    headerPad: "32px 40px",
    docTitleSize: 28,
    bodyPad: "28px 40px",
    tablePad: "0 40px 24px",
    labelSize: 10,
    companySize: 15,
    detailSize: 12,
    tableHeaderBg: "transparent",
    tableHeaderBorder: "2px solid #e2e8f0",
    rowBorder: "1px solid #f1f5f9",
    totalsBorder: "2px solid #20364D",
    accentColor: "#20364D",
    footerDivider: true,
  },
  modern: {
    headerBg: "#0f172a",
    headerPad: "28px 36px",
    docTitleSize: 24,
    bodyPad: "24px 36px",
    tablePad: "0 36px 20px",
    labelSize: 9,
    companySize: 14,
    detailSize: 11,
    tableHeaderBg: "transparent",
    tableHeaderBorder: "1px solid #e2e8f0",
    rowBorder: "1px solid #f8fafc",
    totalsBorder: "1px solid #0f172a",
    accentColor: "#0f172a",
    footerDivider: true,
  },
  compact: {
    headerBg: "#1e293b",
    headerPad: "20px 32px",
    docTitleSize: 22,
    bodyPad: "16px 32px",
    tablePad: "0 32px 16px",
    labelSize: 9,
    companySize: 13,
    detailSize: 11,
    tableHeaderBg: "transparent",
    tableHeaderBorder: "2px solid #e2e8f0",
    rowBorder: "1px solid #f1f5f9",
    totalsBorder: "2px solid #1e293b",
    accentColor: "#1e293b",
    footerDivider: true,
  },
  premium: {
    headerBg: "linear-gradient(135deg, #20364D 0%, #1a365d 100%)",
    headerPad: "36px 44px",
    docTitleSize: 30,
    bodyPad: "32px 44px",
    tablePad: "0 44px 28px",
    labelSize: 10,
    companySize: 16,
    detailSize: 12,
    tableHeaderBg: "transparent",
    tableHeaderBorder: "2px solid #D4A843",
    rowBorder: "1px solid #f1f5f9",
    totalsBorder: "2px solid #D4A843",
    accentColor: "#D4A843",
    footerDivider: true,
  },
};

/**
 * CanonicalDocumentRenderer — Single shared renderer for all business documents.
 *
 * Props:
 *   docType: "invoice" | "quote" | "delivery_note" | "purchase_order" | "service_handover"
 *   docNumber: string
 *   docDate: string (formatted)
 *   dueDate?: string (formatted)
 *   status?: string
 *   toBlock: { name, company, address, city, country, email, phone, tin, brn, client_type }
 *   lineItems: [{ description, quantity, unit_price, total }]
 *   subtotal: number
 *   taxRate?: number
 *   tax?: number
 *   discount?: number
 *   total: number
 *   currency: string
 *   notes?: string
 *   terms?: string
 *   paymentTermLabel?: string
 *   children?: ReactNode
 *   ref: exposes { exportAsPDF, exportAsImage }
 */
const CanonicalDocumentRenderer = forwardRef(function CanonicalDocumentRenderer(
  {
    docType = "invoice",
    docNumber = "",
    docDate = "",
    dueDate = "",
    status = "",
    toBlock = {},
    lineItems = [],
    subtotal = 0,
    taxRate,
    tax = 0,
    discount = 0,
    total = 0,
    currency = "TZS",
    notes = "",
    terms = "",
    paymentTermLabel = "",
    children,
  },
  ref
) {
  const [settings, setSettings] = useState(null);
  const docRef = useRef(null);

  useEffect(() => {
    api
      .get("/api/documents/render-settings")
      .then((r) => setSettings(r.data))
      .catch(() => setSettings({}));
  }, []);

  useImperativeHandle(ref, () => ({
    async exportAsPDF(filename) {
      if (!docRef.current) return;
      const el = docRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pxW = canvas.width;
      const pxH = canvas.height;
      // A4 in mm
      const pageW = 210;
      const pageH = 297;
      const ratio = pageW / pxW;
      const imgH = pxH * ratio;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let yOff = 0;
      while (yOff < imgH) {
        if (yOff > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yOff, pageW, imgH);
        yOff += pageH;
      }
      pdf.save(filename || `${docNumber || docType}.pdf`);
    },
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

  if (!settings) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        Loading document...
      </div>
    );
  }

  const fmt = (v) => {
    const num = Number(v || 0);
    return `${currency} ${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const companyName = settings.company_name || settings.trading_name || "Company";
  const resolveUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    if (url.startsWith("http")) return url;
    if (url.startsWith("/branding/") || url.startsWith("/logos/")) return url;
    return `${API_URL}/api/files/serve/${url}`;
  };
  const logoUrl = resolveUrl(settings.logo_url);
  const headerLogoUrl = resolveUrl(settings.secondary_logo_url || settings.logo_url);
  const signatureUrl = resolveUrl(settings.cfo_signature_url);
  const stampUrl = resolveUrl(settings.stamp_uploaded_url || settings.stamp_preview_url);

  const df = settings.doc_footer || {};
  const showAddress = df.show_address !== false;
  const showEmail = df.show_email !== false;
  const showPhone = df.show_phone !== false;
  const showReg = df.show_registration || false;
  const customFooter = df.custom_footer_text || "";

  const DOC_LABELS = {
    invoice: "INVOICE",
    quote: "QUOTATION",
    delivery_note: "DELIVERY NOTE",
    purchase_order: "PURCHASE ORDER",
    service_handover: "SERVICE HANDOVER",
    statement: "STATEMENT OF ACCOUNT",
  };

  const address = [settings.address, settings.city, settings.country].filter(Boolean).join(", ");

  // Client type awareness
  const isBusiness = toBlock.client_type === "business";
  const toLabel = docType === "quote" ? "PREPARED FOR" : "BILL TO";

  // Template-driven styling
  const template = settings.doc_template?.selected_template || "classic";
  const T = TEMPLATES[template] || TEMPLATES.classic;

  return (
    <div
      ref={docRef}
      className="bg-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 794, margin: "0 auto" }}
      data-testid="canonical-document"
    >
      {/* ═══ HEADER ═══ */}
      <div style={{
        background: T.headerBg,
        color: "#fff",
        padding: T.headerPad,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <div>
          {headerLogoUrl ? (
            <img
              src={headerLogoUrl}
              alt=""
              crossOrigin="anonymous"
              style={{ height: 48, width: "auto", objectFit: "contain", marginBottom: 12 }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{companyName}</div>
          )}
          <div style={{ fontSize: T.docTitleSize, fontWeight: 800, letterSpacing: 2, marginTop: 4 }}>
            {DOC_LABELS[docType] || docType.toUpperCase()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{docNumber}</div>
          {status && (
            <span
              style={{
                display: "inline-block",
                padding: "3px 12px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                backgroundColor:
                  status === "paid" || status === "approved" || status === "delivered"
                    ? "#dcfce7"
                    : status === "overdue" || status === "rejected" || status === "cancelled"
                    ? "#fef2f2"
                    : "#f1f5f9",
                color:
                  status === "paid" || status === "approved" || status === "delivered"
                    ? "#15803d"
                    : status === "overdue" || status === "rejected" || status === "cancelled"
                    ? "#dc2626"
                    : "#475569",
              }}
            >
              {status}
            </span>
          )}
        </div>
      </div>

      {/* ═══ COMPANY / CLIENT / DETAILS ROW ═══ */}
      <div style={{ padding: T.bodyPad, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        {/* FROM */}
        <div>
          <div style={{ fontSize: T.labelSize, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>From</div>
          <div style={{ fontSize: T.companySize, fontWeight: 700, color: T.accentColor }}>{companyName}</div>
          <div style={{ fontSize: T.detailSize, color: "#64748b", lineHeight: 1.6, marginTop: 4 }}>
            {settings.address && <div>{settings.address}</div>}
            {settings.city && <div>{settings.city}, {settings.country}</div>}
            {settings.email && <div>{settings.email}</div>}
            {settings.phone && <div>{settings.phone}</div>}
            {settings.tin && <div>TIN: {settings.tin}</div>}
          </div>
        </div>

        {/* TO — client-type aware */}
        <div>
          <div style={{ fontSize: T.labelSize, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>{toLabel}</div>
          {isBusiness ? (
            <>
              <div style={{ fontSize: T.companySize, fontWeight: 700, color: T.accentColor }}>{toBlock.company || toBlock.name || ""}</div>
              <div style={{ fontSize: T.detailSize, color: "#64748b", lineHeight: 1.6, marginTop: 4 }}>
                {toBlock.brn && <div>BRN: {toBlock.brn}</div>}
                {toBlock.tin && <div>VRN: {toBlock.tin}</div>}
                {toBlock.city && <div>{[toBlock.city, toBlock.country].filter(Boolean).join(", ")}</div>}
                {toBlock.email && <div>{toBlock.email}</div>}
                {toBlock.phone && <div>{toBlock.phone}</div>}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: T.companySize, fontWeight: 700, color: T.accentColor }}>{toBlock.name || ""}</div>
              <div style={{ fontSize: T.detailSize, color: "#64748b", lineHeight: 1.6, marginTop: 4 }}>
                {toBlock.company && <div>{toBlock.company}</div>}
                {toBlock.address && <div>{toBlock.address}</div>}
                {(toBlock.city || toBlock.country) && (
                  <div>{[toBlock.city, toBlock.country].filter(Boolean).join(", ")}</div>
                )}
                {toBlock.email && <div>{toBlock.email}</div>}
                {toBlock.phone && <div>{toBlock.phone}</div>}
                {toBlock.tin && <div>TIN: {toBlock.tin}</div>}
              </div>
            </>
          )}
        </div>

        {/* DETAILS */}
        <div>
          <div style={{ fontSize: T.labelSize, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>Details</div>
          <div style={{ fontSize: T.detailSize, color: "#64748b", lineHeight: 1.8 }}>
            <div>
              <span style={{ display: "inline-block", width: 90, fontWeight: 600, color: "#475569" }}>Date:</span>
              {docDate}
            </div>
            {dueDate && (
              <div>
                <span style={{ display: "inline-block", width: 90, fontWeight: 600, color: "#475569" }}>
                  {docType === "quote" ? "Valid Until:" : "Due:"}
                </span>
                {dueDate}
              </div>
            )}
            {paymentTermLabel && (
              <div>
                <span style={{ display: "inline-block", width: 90, fontWeight: 600, color: "#475569" }}>Terms:</span>
                {paymentTermLabel}
              </div>
            )}
            <div>
              <span style={{ display: "inline-block", width: 90, fontWeight: 600, color: "#475569" }}>Ref:</span>
              {docNumber}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LINE ITEMS TABLE ═══ */}
      <div style={{ padding: T.tablePad }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: T.tableHeaderBorder }}>
              {["#", "Description", "Qty", "Unit Price", "Total"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i < 2 ? "left" : "right",
                    padding: i === 0 ? "10px 0" : "10px 8px",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#64748b",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: T.rowBorder }}>
                <td style={{ padding: "10px 0", color: "#94a3b8", fontSize: 12 }}>{i + 1}</td>
                <td style={{ padding: "10px 8px", color: "#20364D", fontWeight: 500 }}>
                  {item.description || item.name || ""}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#475569" }}>
                  {item.quantity || 1}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#475569" }}>
                  {fmt(item.unit_price)}
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: T.accentColor }}>
                  {fmt(item.total || (item.quantity || 1) * (item.unit_price || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#64748b" }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#dc2626" }}>
                <span>Discount</span>
                <span style={{ fontWeight: 600 }}>-{fmt(discount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#64748b" }}>
                <span>VAT{taxRate ? ` (${taxRate}%)` : ""}</span>
                <span style={{ fontWeight: 600 }}>{fmt(tax)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                fontSize: 16,
                fontWeight: 800,
                color: "#20364D",
                borderTop: T.totalsBorder,
                marginTop: 4,
              }}
            >
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ NOTES / TERMS ═══ */}
      {notes && (
        <div style={{ padding: "0 40px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 4 }}>
            Notes
          </div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{notes}</div>
        </div>
      )}
      {terms && (
        <div style={{ padding: "0 40px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 4 }}>
            Terms & Conditions
          </div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{terms}</div>
        </div>
      )}

      {/* ═══ CHILDREN (extra content) ═══ */}
      {children && <div style={{ padding: "0 40px 16px" }}>{children}</div>}

      {/* ═══ BANK + SIGNATURE + STAMP ROW ═══ */}
      <div
        style={{
          padding: "16px 40px",
          display: "grid",
          gridTemplateColumns:
            docType !== "delivery_note" && settings.bank_name && settings.bank_account_number ? "1fr 240px" : "1fr",
          gap: 20,
        }}
      >
        {/* Bank Transfer Details — HIDDEN on delivery notes (logistics-only document) */}
        {docType !== "delivery_note" && settings.bank_name && settings.bank_account_number && (
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              backgroundColor: "#f8fafc",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94a3b8",
                marginBottom: 8,
              }}
            >
              Bank Transfer Details
            </div>
            <div style={{ fontSize: 12, color: "#20364D", lineHeight: 1.8 }}>
              <div>
                <span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Bank:</span>{" "}
                {settings.bank_name}
              </div>
              <div>
                <span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Account:</span>{" "}
                {settings.bank_account_name}
              </div>
              <div>
                <span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Account No:</span>{" "}
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{settings.bank_account_number}</span>
              </div>
              {settings.bank_branch && (
                <div>
                  <span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Branch:</span>{" "}
                  {settings.bank_branch}
                </div>
              )}
              {settings.swift_code && (
                <div>
                  <span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>SWIFT:</span>{" "}
                  {settings.swift_code}
                </div>
              )}
              <div>
                <span style={{ display: "inline-block", width: 110, color: "#64748b", fontWeight: 500 }}>Reference:</span>{" "}
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#D4A843" }}>{docNumber}</span>
              </div>
            </div>
          </div>
        )}

        {/* Signature + Stamp Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Delivery Note: Delivered/Received signatures */}
          {docType === "delivery_note" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 6 }}>Delivered By</div>
                <div style={{ height: 40, borderBottom: "2px solid #e2e8f0", marginBottom: 6 }} />
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Name & Signature</div>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 6 }}>Received By</div>
                <div style={{ height: 40, borderBottom: "2px solid #e2e8f0", marginBottom: 6 }} />
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Customer Signature</div>
              </div>
            </div>
          )}

          {/* Standard Authorized By (non-delivery notes) */}
          {docType !== "delivery_note" && (
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94a3b8",
                marginBottom: 6,
              }}
            >
              Authorized By
            </div>
            {settings.show_signature && signatureUrl ? (
              <img
                src={signatureUrl}
                alt="signature"
                crossOrigin="anonymous"
                style={{ height: 40, objectFit: "contain", margin: "0 auto 4px", display: "block", opacity: 0.75 }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div style={{ height: 32, borderBottom: "2px solid #e2e8f0", marginBottom: 6 }} />
            )}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#20364D" }}>
              {settings.cfo_name || settings.cfo_title || "Chief Finance Officer"}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              {settings.cfo_name ? settings.cfo_title : companyName}
            </div>
          </div>
          )}

          {/* Stamp Block */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94a3b8",
                marginBottom: 6,
              }}
            >
              Company Stamp
            </div>
            {settings.show_stamp && stampUrl ? (
              <img
                src={stampUrl}
                alt="stamp"
                crossOrigin="anonymous"
                style={{ height: 72, width: "auto", margin: "0 auto" }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: "0 auto",
                  borderRadius: "50%",
                  border: "2px dashed #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: "#94a3b8",
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.2,
                    padding: 4,
                  }}
                >
                  {companyName.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ borderTop: "1px solid #e2e8f0", padding: "16px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
          Thank you for your business. Please include the document number as payment reference.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            fontSize: 10,
            color: "#cbd5e1",
            flexWrap: "wrap",
          }}
        >
          {showAddress && address && <span>{address}</span>}
          {showEmail && (settings.contact_email || settings.email) && (
            <span>{settings.contact_email || settings.email}</span>
          )}
          {showPhone && (settings.contact_phone || settings.phone) && (
            <span>{settings.contact_phone || settings.phone}</span>
          )}
        </div>
        {showReg && (settings.tin || settings.brn) && (
          <div style={{ fontSize: 9, color: "#cbd5e1", marginTop: 4 }}>
            {settings.tin && <>TIN: {settings.tin}</>}
            {settings.tin && settings.brn && <> &bull; </>}
            {settings.brn && <>BRN: {settings.brn}</>}
          </div>
        )}
        {customFooter && (
          <div style={{ fontSize: 9, color: "#cbd5e1", marginTop: 4 }}>{customFooter}</div>
        )}
      </div>
    </div>
  );
});

export default CanonicalDocumentRenderer;
