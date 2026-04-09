import React from "react";
import { Building, Mail, Phone, MapPin, Landmark } from "lucide-react";

/**
 * Shared Document Footer Section — used in Quote, Invoice, Delivery Note, Purchase Order previews.
 * Renders: Bank Details | Authorized Signature | Company Stamp | Footer Bar
 *
 * Props:
 *   settings — the business settings object from /api/admin/business-settings/public
 *   documentNumber — used as payment reference
 *   brandName — the trading/brand name
 */
export default function DocumentFooterSection({ settings = {}, documentNumber = "", brandName = "Konekt" }) {
  const bankName = settings.bank_name || "";
  const bankAccount = settings.bank_account_name || "";
  const bankNumber = settings.bank_account_number || "";
  const bankBranch = settings.bank_branch || "";
  const swiftCode = settings.swift_code || "";
  const companyName = settings.company_name || brandName;
  const email = settings.email || "";
  const phone = settings.phone || "";
  const tin = settings.tin || settings.tin_number || "";
  const brn = settings.brn || "";
  const address = [settings.address_line_1, settings.city, settings.country].filter(Boolean).join(", ") || settings.address || "";

  const hasBankInfo = bankName && bankNumber;

  return (
    <div className="mt-8 space-y-6 print:break-inside-avoid" data-testid="document-footer-section">
      {/* Payment & Authorization Row */}
      <div className={`grid gap-6 ${hasBankInfo ? "md:grid-cols-[1fr_260px]" : "md:grid-cols-1 justify-items-end"}`}>
        {/* Bank Transfer Details */}
        {hasBankInfo && (
          <div className="border border-slate-200 bg-slate-50 rounded-2xl p-5" data-testid="bank-details-block">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3 flex items-center gap-2">
              <Landmark className="w-3.5 h-3.5" />
              Bank Transfer Details
            </h4>
            <div className="space-y-1.5 text-sm text-[#20364D]">
              <div><span className="inline-block w-32 text-slate-500 font-medium">Bank:</span> {bankName}</div>
              <div><span className="inline-block w-32 text-slate-500 font-medium">Account Name:</span> {bankAccount}</div>
              <div><span className="inline-block w-32 text-slate-500 font-medium">Account No:</span> <span className="font-mono font-semibold">{bankNumber}</span></div>
              {bankBranch && <div><span className="inline-block w-32 text-slate-500 font-medium">Branch:</span> {bankBranch}</div>}
              {swiftCode && <div><span className="inline-block w-32 text-slate-500 font-medium">SWIFT:</span> {swiftCode}</div>}
              {documentNumber && <div><span className="inline-block w-32 text-slate-500 font-medium">Reference:</span> <span className="font-mono font-semibold text-[#D4A843]">{documentNumber}</span></div>}
            </div>
          </div>
        )}

        {/* Signature + Stamp Column */}
        <div className="flex flex-col gap-4" data-testid="auth-column">
          {/* Signature Block */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white text-center" data-testid="signature-block">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Authorized By</p>
            <div className="h-10 border-b-2 border-slate-200 mb-2" />
            <p className="text-xs font-bold text-[#20364D]">Chief Finance Officer</p>
            <p className="text-[11px] text-slate-500">{companyName}</p>
          </div>

          {/* Stamp Block */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white text-center" data-testid="stamp-block">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Company Stamp</p>
            <div className="w-[90px] h-[90px] mx-auto border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center">
              <span className="text-[9px] text-slate-400 font-medium text-center leading-tight px-1">
                {companyName.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <div className="border-t border-slate-200 pt-4 text-center space-y-1" data-testid="document-footer-bar">
        <p className="text-xs text-slate-500">
          Thank you for choosing {brandName}. Please include the document number as payment reference.
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 flex-wrap">
          {companyName && (
            <span className="flex items-center gap-1">
              <Building className="w-3 h-3" /> {companyName}
            </span>
          )}
          {email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {email}
            </span>
          )}
          {phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {phone}
            </span>
          )}
          {address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {address}
            </span>
          )}
        </div>
        {(tin || brn) && (
          <p className="text-[10px] text-slate-400">
            {tin && <>TIN: {tin}</>}
            {tin && brn && <> &bull; </>}
            {brn && <>BRN: {brn}</>}
          </p>
        )}
      </div>
    </div>
  );
}
