import React, { useEffect, useState, useCallback } from "react";
import { Building2, CreditCard, FileText, BarChart3, Users, Globe, Bell, Shield, Rocket } from "lucide-react";
import api from "../../lib/api";
import SettingsSectionCard from "../../components/admin/settings/SettingsSectionCard";
import SettingsNumberField from "../../components/admin/settings/SettingsNumberField";
import SettingsToggleField from "../../components/admin/settings/SettingsToggleField";
import SettingsSelectField from "../../components/admin/settings/SettingsSelectField";
import SettingsTextField from "../../components/admin/settings/SettingsTextField";
import InvoiceBrandingSettings from "../../components/admin/settings/InvoiceBrandingSettings";

const TABS = [
  { key: "profile", label: "Business Profile", icon: Building2 },
  { key: "payment", label: "Payment Details", icon: CreditCard },
  { key: "branding", label: "Invoice Branding", icon: FileText },
  { key: "commercial", label: "Commercial Rules", icon: BarChart3 },
  { key: "sales", label: "Sales & Commissions", icon: Users },
  { key: "affiliate", label: "Affiliate & Referrals", icon: Globe },
  { key: "workflows", label: "Workflows & Vendors", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "launch", label: "Launch Controls", icon: Rocket },
];

const defaultState = {
  commercial: { minimum_company_margin_percent: 20, distribution_layer_percent: 10, commission_mode: "fair_balanced", affiliate_attribution_reduces_sales_commission: true, vat_percent: 18 },
  margin_rules: { allow_product_group_margin_override: true, allow_product_margin_override: true, allow_service_group_margin_override: true, allow_service_margin_override: true, pricing_below_minimum_margin_requires_admin_override: true },
  promotions: { default_promo_type: "safe_distribution", allow_margin_touching_promos: false, max_public_promo_discount_percent: 5, affiliate_visible_campaigns: true, campaign_start_end_required: true },
  affiliate: { default_affiliate_commission_percent: 10, affiliate_registration_requires_approval: true, default_affiliate_status: "pending", personal_promo_code_enabled: true, commission_trigger: "payment_approved", commission_duration: "per_successful_sale", attribution_sources: "link_and_code", attribution_window_days: 30, minimum_payout_threshold: 50000, payout_cycle: "monthly", manual_payout_approval: true, watchlist_logic_enabled: true, paused_logic_enabled: true, suspend_for_abuse_enabled: true },
  sales: { default_sales_commission_self_generated: 15, default_sales_commission_affiliate_generated: 10, assignment_mode: "auto", smart_assignment_enabled: true, lead_source_visibility: true, commission_type_visibility: true, sales_referral_link_enabled: true },
  payments: { bank_only_payments: true, card_payments_enabled: false, mobile_money_enabled: false, kwikpay_enabled: false, payment_proof_required: true, payment_proof_auto_link_to_invoice: true, payment_verification_mode: "manual", commission_creation_on_payment_approval: true },
  payment_accounts: { default_country: "TZ", account_name: "KONEKT LIMITED", account_number: "015C8841347002", bank_name: "CRDB BANK", swift_code: "CORUTZTZ", branch_name: "", currency: "TZS", show_on_invoice: true, show_on_checkout: true },
  progress_workflows: { hide_internal_provider_details_from_customer: true, customer_safe_external_statuses_only: true, product_workflow_enabled: true, service_workflow_enabled: true },
  ai_assistant: { ai_enabled: true, human_handoff_enabled: true, handoff_after_unresolved_exchanges: 3, lead_capture_on_handoff: true, customer_safe_status_translation_only: true },
  notifications: { customer_notifications_enabled: true, sales_notifications_enabled: true, affiliate_notifications_enabled: true, admin_notifications_enabled: true, vendor_notifications_enabled: true },
  vendors: { vendor_can_update_internal_progress: true, vendor_sees_only_assigned_jobs: true, vendor_cannot_see_customer_financials: true, vendor_cannot_see_commissions: true },
  numbering_rules: { sku_auto_numbering_enabled: true, quote_format: "KON-QT-[YY]-[SEQ]", invoice_format: "KON-IN-[YY]-[SEQ]", order_format: "KON-OR-[YY]-[SEQ]" },
  launch_controls: { system_mode: "controlled_launch", manual_payment_verification: true, manual_payout_approval: true, affiliate_approval_required: true, ai_enabled: true, bank_only_payments: true, audit_notifications_enabled: true },
  business_profile: { legal_name: "KONEKT LIMITED", brand_name: "Konekt", support_email: "support@konekt.co.tz", support_phone: "+255 XXX XXX XXX", business_address: "Dar es Salaam, Tanzania", tax_id: "", vat_number: "" },
};

function U(state, section, field, value) {
  return { ...state, [section]: { ...state[section], [field]: value } };
}

export default function AdminSettingsHubPage() {
  const [state, setState] = useState(defaultState);
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/admin/settings-hub").then((res) => setState((prev) => {
      const merged = { ...prev };
      Object.keys(res.data || {}).forEach((k) => {
        if (typeof merged[k] === "object" && typeof res.data[k] === "object") {
          merged[k] = { ...merged[k], ...res.data[k] };
        }
      });
      return merged;
    }));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/admin/settings-hub", state);
      alert("Settings saved successfully.");
    } catch { alert("Error saving settings."); }
    setSaving(false);
  };

  return (
    <div className="space-y-0" data-testid="settings-hub-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20364D]">Business Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage all company, branding, and go-live defaults.</p>
        </div>
        <button onClick={save} disabled={saving} data-testid="save-all-settings" className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-50 transition-colors">
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px mb-6" data-testid="settings-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`settings-tab-${t.key}`}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-xs font-semibold transition-all ${
                active
                  ? "border-b-2 border-[#20364D] text-[#20364D] bg-slate-50/70"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {tab === "profile" && <ProfileTab state={state} setState={setState} />}
        {tab === "payment" && <PaymentTab state={state} setState={setState} />}
        {tab === "branding" && <BrandingTab />}
        {tab === "commercial" && <CommercialTab state={state} setState={setState} />}
        {tab === "sales" && <SalesTab state={state} setState={setState} />}
        {tab === "affiliate" && <AffiliateTab state={state} setState={setState} />}
        {tab === "workflows" && <WorkflowsTab state={state} setState={setState} />}
        {tab === "notifications" && <NotificationsTab state={state} setState={setState} />}
        {tab === "launch" && <LaunchTab state={state} setState={setState} />}
      </div>
    </div>
  );
}

/* ─── Tab Components ─── */

function ProfileTab({ state, setState }) {
  const s = state.business_profile || {};
  const n = state.numbering_rules || {};
  return (
    <>
      <SettingsSectionCard title="Company Information" description="Legal identity and contact details.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsTextField label="Legal Company Name" value={s.legal_name} onChange={(v) => setState(U(state, "business_profile", "legal_name", v))} />
          <SettingsTextField label="Brand Name" value={s.brand_name} onChange={(v) => setState(U(state, "business_profile", "brand_name", v))} />
          <SettingsTextField label="Support Email" value={s.support_email} onChange={(v) => setState(U(state, "business_profile", "support_email", v))} />
          <SettingsTextField label="Support Phone" value={s.support_phone} onChange={(v) => setState(U(state, "business_profile", "support_phone", v))} />
          <SettingsTextField label="Business Address" value={s.business_address} onChange={(v) => setState(U(state, "business_profile", "business_address", v))} />
          <SettingsTextField label="Tax/VAT ID" value={s.tax_id} onChange={(v) => setState(U(state, "business_profile", "tax_id", v))} />
          <SettingsTextField label="Default Country" value={state.payment_accounts?.default_country} onChange={(v) => setState(U(state, "payment_accounts", "default_country", v))} />
          <SettingsTextField label="Default Currency" value={state.payment_accounts?.currency} onChange={(v) => setState(U(state, "payment_accounts", "currency", v))} />
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Document Numbering" description="Set professional document numbering defaults.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="SKU auto-numbering" checked={n.sku_auto_numbering_enabled} onChange={(v) => setState(U(state, "numbering_rules", "sku_auto_numbering_enabled", v))} />
          <SettingsTextField label="Quote Format" value={n.quote_format} onChange={(v) => setState(U(state, "numbering_rules", "quote_format", v))} />
          <SettingsTextField label="Invoice Format" value={n.invoice_format} onChange={(v) => setState(U(state, "numbering_rules", "invoice_format", v))} />
          <SettingsTextField label="Order Format" value={n.order_format} onChange={(v) => setState(U(state, "numbering_rules", "order_format", v))} />
        </div>
      </SettingsSectionCard>
    </>
  );
}

function PaymentTab({ state, setState }) {
  const a = state.payment_accounts || {};
  const p = state.payments || {};
  return (
    <>
      <SettingsSectionCard title="Bank Account Details" description="Used on invoices, checkout, and payment pages.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsTextField label="Account Name" value={a.account_name} onChange={(v) => setState(U(state, "payment_accounts", "account_name", v))} />
          <SettingsTextField label="Account Number" value={a.account_number} onChange={(v) => setState(U(state, "payment_accounts", "account_number", v))} />
          <SettingsTextField label="Bank Name" value={a.bank_name} onChange={(v) => setState(U(state, "payment_accounts", "bank_name", v))} />
          <SettingsTextField label="SWIFT Code" value={a.swift_code} onChange={(v) => setState(U(state, "payment_accounts", "swift_code", v))} />
          <SettingsTextField label="Branch Name" value={a.branch_name} onChange={(v) => setState(U(state, "payment_accounts", "branch_name", v))} />
          <SettingsToggleField label="Show on invoice" checked={a.show_on_invoice} onChange={(v) => setState(U(state, "payment_accounts", "show_on_invoice", v))} />
          <SettingsToggleField label="Show on checkout" checked={a.show_on_checkout} onChange={(v) => setState(U(state, "payment_accounts", "show_on_checkout", v))} />
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Payment Methods" description="Control live payment method behavior and verification.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="Bank-only payments" checked={p.bank_only_payments} onChange={(v) => setState(U(state, "payments", "bank_only_payments", v))} />
          <SettingsToggleField label="Card payments" checked={p.card_payments_enabled} onChange={(v) => setState(U(state, "payments", "card_payments_enabled", v))} />
          <SettingsToggleField label="Mobile money" checked={p.mobile_money_enabled} onChange={(v) => setState(U(state, "payments", "mobile_money_enabled", v))} />
          <SettingsToggleField label="KwikPay" checked={p.kwikpay_enabled} onChange={(v) => setState(U(state, "payments", "kwikpay_enabled", v))} />
          <SettingsToggleField label="Payment proof required" checked={p.payment_proof_required} onChange={(v) => setState(U(state, "payments", "payment_proof_required", v))} />
          <SettingsToggleField label="Auto-link proof to invoice" checked={p.payment_proof_auto_link_to_invoice} onChange={(v) => setState(U(state, "payments", "payment_proof_auto_link_to_invoice", v))} />
          <SettingsSelectField label="Verification Mode" value={p.payment_verification_mode} onChange={(v) => setState(U(state, "payments", "payment_verification_mode", v))} options={[{ value: "manual", label: "Manual" }, { value: "auto", label: "Auto" }]} />
          <SettingsToggleField label="Commission on payment approval" checked={p.commission_creation_on_payment_approval} onChange={(v) => setState(U(state, "payments", "commission_creation_on_payment_approval", v))} />
        </div>
      </SettingsSectionCard>
    </>
  );
}

function BrandingTab() {
  return <InvoiceBrandingSettings />;
}

function CommercialTab({ state, setState }) {
  const c = state.commercial || {};
  const m = state.margin_rules || {};
  const p = state.promotions || {};
  return (
    <>
      <SettingsSectionCard title="Core Commercials" description="Company protection and distribution settings.">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <SettingsNumberField label="Minimum Margin %" value={c.minimum_company_margin_percent} onChange={(v) => setState(U(state, "commercial", "minimum_company_margin_percent", v))} />
          <SettingsNumberField label="Distribution Layer %" value={c.distribution_layer_percent} onChange={(v) => setState(U(state, "commercial", "distribution_layer_percent", v))} />
          <SettingsNumberField label="VAT %" value={c.vat_percent} onChange={(v) => setState(U(state, "commercial", "vat_percent", v))} />
          <SettingsSelectField label="Commission Mode" value={c.commission_mode} onChange={(v) => setState(U(state, "commercial", "commission_mode", v))} options={[{ value: "fair_balanced", label: "Fair Balanced" }, { value: "sales_priority", label: "Sales Priority" }, { value: "affiliate_priority", label: "Affiliate Priority" }, { value: "fixed_split", label: "Fixed Split" }]} />
          <SettingsToggleField label="Affiliate reduces sales commission" checked={c.affiliate_attribution_reduces_sales_commission} onChange={(v) => setState(U(state, "commercial", "affiliate_attribution_reduces_sales_commission", v))} />
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Margin Rules" description="Control margin overrides across products and services.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsToggleField label="Product group margin override" checked={m.allow_product_group_margin_override} onChange={(v) => setState(U(state, "margin_rules", "allow_product_group_margin_override", v))} />
          <SettingsToggleField label="Product margin override" checked={m.allow_product_margin_override} onChange={(v) => setState(U(state, "margin_rules", "allow_product_margin_override", v))} />
          <SettingsToggleField label="Service group margin override" checked={m.allow_service_group_margin_override} onChange={(v) => setState(U(state, "margin_rules", "allow_service_group_margin_override", v))} />
          <SettingsToggleField label="Service margin override" checked={m.allow_service_margin_override} onChange={(v) => setState(U(state, "margin_rules", "allow_service_margin_override", v))} />
          <SettingsToggleField label="Below-minimum requires admin override" checked={m.pricing_below_minimum_margin_requires_admin_override} onChange={(v) => setState(U(state, "margin_rules", "pricing_below_minimum_margin_requires_admin_override", v))} />
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Promotions" description="Safe public and affiliate campaign controls.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsSelectField label="Default Promo Type" value={p.default_promo_type} onChange={(v) => setState(U(state, "promotions", "default_promo_type", v))} options={[{ value: "safe_distribution", label: "Safe / Distribution" }, { value: "margin_touching", label: "Margin Touching" }]} />
          <SettingsNumberField label="Max Public Promo Discount %" value={p.max_public_promo_discount_percent} onChange={(v) => setState(U(state, "promotions", "max_public_promo_discount_percent", v))} />
          <SettingsToggleField label="Margin touching promos" checked={p.allow_margin_touching_promos} onChange={(v) => setState(U(state, "promotions", "allow_margin_touching_promos", v))} />
          <SettingsToggleField label="Affiliate visible campaigns" checked={p.affiliate_visible_campaigns} onChange={(v) => setState(U(state, "promotions", "affiliate_visible_campaigns", v))} />
        </div>
      </SettingsSectionCard>
    </>
  );
}

function SalesTab({ state, setState }) {
  const s = state.sales || {};
  return (
    <SettingsSectionCard title="Sales Settings" description="Default sales commission and assignment behavior.">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SettingsNumberField label="Commission % (Self-Generated)" value={s.default_sales_commission_self_generated} onChange={(v) => setState(U(state, "sales", "default_sales_commission_self_generated", v))} />
        <SettingsNumberField label="Commission % (Affiliate Lead)" value={s.default_sales_commission_affiliate_generated} onChange={(v) => setState(U(state, "sales", "default_sales_commission_affiliate_generated", v))} />
        <SettingsSelectField label="Assignment Mode" value={s.assignment_mode} onChange={(v) => setState(U(state, "sales", "assignment_mode", v))} options={[{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }]} />
        <SettingsToggleField label="Smart assignment" checked={s.smart_assignment_enabled} onChange={(v) => setState(U(state, "sales", "smart_assignment_enabled", v))} />
        <SettingsToggleField label="Lead source visibility" checked={s.lead_source_visibility} onChange={(v) => setState(U(state, "sales", "lead_source_visibility", v))} />
        <SettingsToggleField label="Commission type visibility" checked={s.commission_type_visibility} onChange={(v) => setState(U(state, "sales", "commission_type_visibility", v))} />
        <SettingsToggleField label="Sales referral link" checked={s.sales_referral_link_enabled} onChange={(v) => setState(U(state, "sales", "sales_referral_link_enabled", v))} />
      </div>
    </SettingsSectionCard>
  );
}

function AffiliateTab({ state, setState }) {
  const a = state.affiliate || {};
  return (
    <SettingsSectionCard title="Affiliate Program" description="Default affiliate economics, approval, payout, and governance.">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SettingsNumberField label="Default Commission %" value={a.default_affiliate_commission_percent} onChange={(v) => setState(U(state, "affiliate", "default_affiliate_commission_percent", v))} />
        <SettingsSelectField label="Default Status" value={a.default_affiliate_status} onChange={(v) => setState(U(state, "affiliate", "default_affiliate_status", v))} options={[{ value: "pending", label: "Pending" }, { value: "active", label: "Active" }]} />
        <SettingsSelectField label="Commission Trigger" value={a.commission_trigger} onChange={(v) => setState(U(state, "affiliate", "commission_trigger", v))} options={[{ value: "payment_approved", label: "Payment Approved" }, { value: "order_completed", label: "Order Completed" }]} />
        <SettingsSelectField label="Commission Duration" value={a.commission_duration} onChange={(v) => setState(U(state, "affiliate", "commission_duration", v))} options={[{ value: "per_successful_sale", label: "Per Sale" }, { value: "first_order_only", label: "First Order Only" }]} />
        <SettingsSelectField label="Attribution Sources" value={a.attribution_sources} onChange={(v) => setState(U(state, "affiliate", "attribution_sources", v))} options={[{ value: "link_and_code", label: "Link + Code" }, { value: "link_only", label: "Link Only" }, { value: "code_only", label: "Code Only" }]} />
        <SettingsNumberField label="Attribution Window (days)" value={a.attribution_window_days} onChange={(v) => setState(U(state, "affiliate", "attribution_window_days", v))} />
        <SettingsNumberField label="Min Payout Threshold (TZS)" value={a.minimum_payout_threshold} onChange={(v) => setState(U(state, "affiliate", "minimum_payout_threshold", v))} />
        <SettingsSelectField label="Payout Cycle" value={a.payout_cycle} onChange={(v) => setState(U(state, "affiliate", "payout_cycle", v))} options={[{ value: "monthly", label: "Monthly" }, { value: "weekly", label: "Weekly" }]} />
        <SettingsToggleField label="Requires approval" checked={a.affiliate_registration_requires_approval} onChange={(v) => setState(U(state, "affiliate", "affiliate_registration_requires_approval", v))} />
        <SettingsToggleField label="Personal promo code" checked={a.personal_promo_code_enabled} onChange={(v) => setState(U(state, "affiliate", "personal_promo_code_enabled", v))} />
        <SettingsToggleField label="Manual payout approval" checked={a.manual_payout_approval} onChange={(v) => setState(U(state, "affiliate", "manual_payout_approval", v))} />
        <SettingsToggleField label="Watchlist logic" checked={a.watchlist_logic_enabled} onChange={(v) => setState(U(state, "affiliate", "watchlist_logic_enabled", v))} />
      </div>
    </SettingsSectionCard>
  );
}

function WorkflowsTab({ state, setState }) {
  const w = state.progress_workflows || {};
  const v = state.vendors || {};
  return (
    <>
      <SettingsSectionCard title="Progress Workflows" description="Control customer-facing status display rules.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="Hide provider details from customer" checked={w.hide_internal_provider_details_from_customer} onChange={(v2) => setState(U(state, "progress_workflows", "hide_internal_provider_details_from_customer", v2))} />
          <SettingsToggleField label="Customer-safe statuses only" checked={w.customer_safe_external_statuses_only} onChange={(v2) => setState(U(state, "progress_workflows", "customer_safe_external_statuses_only", v2))} />
          <SettingsToggleField label="Product workflow" checked={w.product_workflow_enabled} onChange={(v2) => setState(U(state, "progress_workflows", "product_workflow_enabled", v2))} />
          <SettingsToggleField label="Service workflow" checked={w.service_workflow_enabled} onChange={(v2) => setState(U(state, "progress_workflows", "service_workflow_enabled", v2))} />
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Vendor / Partner Rules" description="Protect data while allowing execution updates.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="Can update internal progress" checked={v.vendor_can_update_internal_progress} onChange={(v2) => setState(U(state, "vendors", "vendor_can_update_internal_progress", v2))} />
          <SettingsToggleField label="Sees only assigned jobs" checked={v.vendor_sees_only_assigned_jobs} onChange={(v2) => setState(U(state, "vendors", "vendor_sees_only_assigned_jobs", v2))} />
          <SettingsToggleField label="Cannot see customer financials" checked={v.vendor_cannot_see_customer_financials} onChange={(v2) => setState(U(state, "vendors", "vendor_cannot_see_customer_financials", v2))} />
          <SettingsToggleField label="Cannot see commissions" checked={v.vendor_cannot_see_commissions} onChange={(v2) => setState(U(state, "vendors", "vendor_cannot_see_commissions", v2))} />
        </div>
      </SettingsSectionCard>
    </>
  );
}

function NotificationsTab({ state, setState }) {
  const n = state.notifications || {};
  const ai = state.ai_assistant || {};
  return (
    <>
      <SettingsSectionCard title="Notifications" description="Choose which parties receive default notifications.">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <SettingsToggleField label="Customer" checked={n.customer_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "customer_notifications_enabled", v))} />
          <SettingsToggleField label="Sales" checked={n.sales_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "sales_notifications_enabled", v))} />
          <SettingsToggleField label="Affiliate" checked={n.affiliate_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "affiliate_notifications_enabled", v))} />
          <SettingsToggleField label="Admin" checked={n.admin_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "admin_notifications_enabled", v))} />
          <SettingsToggleField label="Vendor" checked={n.vendor_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "vendor_notifications_enabled", v))} />
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="AI Assistant" description="Control AI help, handoff, and customer-safe behavior.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="AI enabled" checked={ai.ai_enabled} onChange={(v) => setState(U(state, "ai_assistant", "ai_enabled", v))} />
          <SettingsToggleField label="Human handoff" checked={ai.human_handoff_enabled} onChange={(v) => setState(U(state, "ai_assistant", "human_handoff_enabled", v))} />
          <SettingsNumberField label="Handoff after exchanges" value={ai.handoff_after_unresolved_exchanges} onChange={(v) => setState(U(state, "ai_assistant", "handoff_after_unresolved_exchanges", v))} />
          <SettingsToggleField label="Lead capture on handoff" checked={ai.lead_capture_on_handoff} onChange={(v) => setState(U(state, "ai_assistant", "lead_capture_on_handoff", v))} />
        </div>
      </SettingsSectionCard>
    </>
  );
}

function LaunchTab({ state, setState }) {
  const l = state.launch_controls || {};
  return (
    <SettingsSectionCard title="Launch Controls" description="Recommended defaults for controlled launch.">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SettingsSelectField label="System Mode" value={l.system_mode} onChange={(v) => setState(U(state, "launch_controls", "system_mode", v))} options={[{ value: "controlled_launch", label: "Controlled Launch" }, { value: "full_live", label: "Full Live" }]} />
        <SettingsToggleField label="Manual payment verification" checked={l.manual_payment_verification} onChange={(v) => setState(U(state, "launch_controls", "manual_payment_verification", v))} />
        <SettingsToggleField label="Manual payout approval" checked={l.manual_payout_approval} onChange={(v) => setState(U(state, "launch_controls", "manual_payout_approval", v))} />
        <SettingsToggleField label="Affiliate approval required" checked={l.affiliate_approval_required} onChange={(v) => setState(U(state, "launch_controls", "affiliate_approval_required", v))} />
        <SettingsToggleField label="AI enabled" checked={l.ai_enabled} onChange={(v) => setState(U(state, "launch_controls", "ai_enabled", v))} />
        <SettingsToggleField label="Bank-only payments" checked={l.bank_only_payments} onChange={(v) => setState(U(state, "launch_controls", "bank_only_payments", v))} />
        <SettingsToggleField label="Audit notifications" checked={l.audit_notifications_enabled} onChange={(v) => setState(U(state, "launch_controls", "audit_notifications_enabled", v))} />
      </div>
    </SettingsSectionCard>
  );
}
