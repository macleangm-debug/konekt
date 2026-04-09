import React from "react";
import { Mail, FileText, ExternalLink } from "lucide-react";

/**
 * SettingsPreviewPanel — Live preview of branding across Navbar, Footer, Email, and Document.
 * Uses current form state directly (not saved data).
 * Sample data mode — no real data dependencies.
 */
export default function SettingsPreviewPanel({ state }) {
  const bp = state.business_profile || {};
  const br = state.branding || {};
  const ns = state.notification_sender || {};
  const pa = state.payment_accounts || {};

  const brandName = bp.brand_name || "Company";
  const legalName = bp.legal_name || brandName;
  const tagline = bp.tagline || "";
  const primaryColor = br.primary_color || "#20364D";
  const accentColor = br.accent_color || "#D4A843";
  const logoUrl = br.primary_logo_url || "";
  const senderName = ns.sender_name || brandName;
  const footerText = ns.email_footer_text || "";
  const email = bp.support_email || "support@example.com";
  const phone = bp.support_phone || "+255 XXX XXX XXX";

  return (
    <div className="space-y-6" data-testid="settings-preview-panel">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wide">
        <ExternalLink className="w-4 h-4" /> Live Preview
      </div>

      {/* Navbar Preview */}
      <PreviewCard title="Navbar">
        <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ background: primaryColor }}>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-auto object-contain brightness-0 invert" />
            ) : (
              <div className="text-lg font-bold text-white">{brandName}</div>
            )}
          </div>
          <div className="flex gap-4 text-xs text-white/60">
            <span>Products</span>
            <span>Services</span>
            <span>Account</span>
          </div>
        </div>
      </PreviewCard>

      {/* Footer Preview */}
      <PreviewCard title="Footer">
        <div className="rounded-xl px-5 py-4 text-xs" style={{ background: "#0f172a" }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-white font-bold text-sm">{brandName}</div>
              {tagline && <div className="text-slate-400 mt-0.5">{tagline}</div>}
            </div>
            <div className="text-right text-slate-400">
              {email && <div>{email}</div>}
              {phone && <div>{phone}</div>}
            </div>
          </div>
          <div className="border-t border-slate-700 mt-3 pt-2 text-slate-500 text-center">
            &copy; {new Date().getFullYear()} {legalName}. All rights reserved.
          </div>
        </div>
      </PreviewCard>

      {/* Email Preview */}
      <PreviewCard title="Email Notification" icon={<Mail className="w-3.5 h-3.5" />}>
        <div className="rounded-xl border overflow-hidden bg-white">
          {/* Header */}
          <div className="text-center py-3 border-b" style={{ borderColor: primaryColor, borderBottomWidth: 2 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-6 mx-auto" />
            ) : (
              <div className="font-bold" style={{ color: primaryColor }}>{brandName}</div>
            )}
          </div>
          {/* Body */}
          <div className="px-4 py-4 text-xs text-slate-600 space-y-2">
            <div className="text-slate-400 text-[10px]">From: {senderName}</div>
            <div className="font-semibold" style={{ color: primaryColor }}>Your order has been dispatched</div>
            <p className="leading-relaxed">Hello John, your order #ORD-2026-0042 is on its way. Track its status in your account dashboard.</p>
            <div className="text-center pt-2">
              <span className="inline-block rounded-lg px-5 py-2 text-white text-xs font-semibold" style={{ background: primaryColor }}>
                View Order
              </span>
            </div>
          </div>
          {/* Footer */}
          <div className="text-center py-2 border-t text-[9px] text-slate-400">
            {brandName} &middot; {footerText}
          </div>
        </div>
      </PreviewCard>

      {/* Document/Invoice Preview */}
      <PreviewCard title="Invoice Header" icon={<FileText className="w-3.5 h-3.5" />}>
        <div className="rounded-xl border bg-white px-4 py-4">
          <div className="flex justify-between items-start">
            <div>
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-8 mb-1" />
              ) : (
                <div className="font-bold text-sm" style={{ color: primaryColor }}>{legalName}</div>
              )}
              {bp.tax_id && <div className="text-[10px] text-slate-400">TIN: {bp.tax_id}</div>}
              {bp.business_address && <div className="text-[10px] text-slate-400">{bp.business_address}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase" style={{ color: primaryColor }}>Invoice</div>
              <div className="text-[10px] text-slate-400">#INV-2026-0001</div>
              <div className="text-[10px] text-slate-400">Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>
          {/* Sample line items */}
          <div className="mt-3 border-t pt-2">
            <div className="grid grid-cols-[1fr_50px_70px] text-[10px] text-slate-400 border-b pb-1 mb-1">
              <span>Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
            </div>
            <div className="grid grid-cols-[1fr_50px_70px] text-[10px] text-slate-600">
              <span>Branded T-Shirts (XL)</span><span className="text-right">50</span><span className="text-right">750,000</span>
            </div>
            <div className="grid grid-cols-[1fr_50px_70px] text-[10px] text-slate-600">
              <span>Business Cards (500 pcs)</span><span className="text-right">1</span><span className="text-right">120,000</span>
            </div>
          </div>
          {/* Bank details */}
          {pa.account_name && (
            <div className="mt-3 border-t pt-2 text-[10px] text-slate-500">
              <div className="font-semibold text-slate-600 mb-0.5">Bank Details</div>
              <div>{pa.account_name} &middot; {pa.bank_name} &middot; {pa.account_number}</div>
            </div>
          )}
        </div>
      </PreviewCard>
    </div>
  );
}

function PreviewCard({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
