import React, { useEffect, useState, useCallback } from "react";
import { Building2, CreditCard, FileText, BarChart3, Users, Globe, Bell, Shield, Rocket, Wallet, Eye, CalendarClock, Settings, Truck, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../../lib/api";
import SettingsSectionCard from "../../components/admin/settings/SettingsSectionCard";
import SettingsNumberField from "../../components/admin/settings/SettingsNumberField";
import SettingsToggleField from "../../components/admin/settings/SettingsToggleField";
import SettingsSelectField from "../../components/admin/settings/SettingsSelectField";
import SettingsTextField from "../../components/admin/settings/SettingsTextField";
import InvoiceBrandingSettings from "../../components/admin/settings/InvoiceBrandingSettings";
import CustomerActivityRulesCard from "../../components/admin/settings/CustomerActivityRulesCard";
import SettingsPreviewPanel from "../../components/admin/settings/SettingsPreviewPanel";
import NotificationPreferencesSection from "../../components/shared/NotificationPreferencesSection";
import ReportScheduleSection from "../../components/admin/settings/ReportScheduleSection";

const TABS = [
  { key: "profile", label: "Business Profile", icon: Building2 },
  { key: "payment", label: "Payment Details", icon: CreditCard },
  { key: "branding", label: "Document Branding", icon: FileText },
  { key: "preview", label: "Preview", icon: Eye },
  { key: "pricing_policy", label: "Pricing Policy", icon: BarChart3 },
  { key: "commercial", label: "Commercial Rules", icon: BarChart3 },
  { key: "operations", label: "Operational Rules", icon: Settings },
  { key: "sales", label: "Sales & Commissions", icon: Users },
  { key: "affiliate", label: "Affiliate & Referrals", icon: Globe },
  { key: "payout", label: "Payout Settings", icon: Wallet },
  { key: "workflows", label: "Workflows & Vendors", icon: Shield },
  { key: "partners", label: "Partner Policy", icon: Truck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "report_delivery", label: "Report Delivery", icon: CalendarClock },
  { key: "launch", label: "Launch Controls", icon: Rocket },
];

const defaultState = {
  commercial: { minimum_company_margin_percent: 20, distribution_layer_percent: 10, protected_company_margin_percent: 8, commission_mode: "fair_balanced", affiliate_attribution_reduces_sales_commission: true, vat_percent: 18, referral_pct: 10, max_wallet_usage_pct: 30, referral_min_order_amount: 0, referral_max_reward_per_order: 0, welcome_bonus_enabled: false, welcome_bonus_type: "fixed", welcome_bonus_value: 5000, welcome_bonus_max_cap: 10000, welcome_bonus_first_purchase_only: true, welcome_bonus_trigger_event: "payment_verified", welcome_bonus_stack_with_referral: false, welcome_bonus_stack_with_wallet: true },
  margin_rules: { allow_product_group_margin_override: true, allow_product_margin_override: true, allow_service_group_margin_override: true, allow_service_margin_override: true, pricing_below_minimum_margin_requires_admin_override: true },
  promotions: { default_promo_type: "safe_distribution", allow_margin_touching_promos: false, max_public_promo_discount_percent: 5, affiliate_visible_campaigns: true, campaign_start_end_required: true },
  affiliate: { default_affiliate_commission_percent: 10, affiliate_registration_requires_approval: true, default_affiliate_status: "pending", personal_promo_code_enabled: true, commission_trigger: "payment_approved", commission_duration: "per_successful_sale", attribution_sources: "link_and_code", attribution_window_days: 30, watchlist_logic_enabled: true, paused_logic_enabled: true, suspend_for_abuse_enabled: true },
  payouts: { affiliate_minimum_payout: 50000, sales_minimum_payout: 100000, payout_cycle: "monthly", payout_methods_enabled: ["mobile_money", "bank_transfer"], manual_payout_approval: true, payout_review_mode: "admin_required" },
  sales: { default_sales_commission_self_generated: 15, default_sales_commission_affiliate_generated: 10, assignment_mode: "auto", smart_assignment_enabled: true, lead_source_visibility: true, commission_type_visibility: true, sales_referral_link_enabled: true },
  payments: { bank_only_payments: true, card_payments_enabled: false, mobile_money_enabled: false, kwikpay_enabled: false, payment_proof_required: true, payment_proof_auto_link_to_invoice: true, payment_verification_mode: "manual", commission_creation_on_payment_approval: true },
  payment_accounts: { default_country: "TZ", account_name: "", account_number: "", bank_name: "", swift_code: "", branch_name: "", currency: "TZS", show_on_invoice: true, show_on_checkout: true },
  progress_workflows: { hide_internal_provider_details_from_customer: true, customer_safe_external_statuses_only: true, product_workflow_enabled: true, service_workflow_enabled: true },
  ai_assistant: { ai_enabled: true, human_handoff_enabled: true, handoff_after_unresolved_exchanges: 3, lead_capture_on_handoff: true, customer_safe_status_translation_only: true },
  notifications: { customer_notifications_enabled: true, sales_notifications_enabled: true, affiliate_notifications_enabled: true, admin_notifications_enabled: true, vendor_notifications_enabled: true },
  vendors: { vendor_can_update_internal_progress: true, vendor_sees_only_assigned_jobs: true, vendor_cannot_see_customer_financials: true, vendor_cannot_see_commissions: true },
  numbering_rules: { sku_auto_numbering_enabled: true, quote_format: "KON-QT-[YY]-[SEQ]", invoice_format: "KON-IN-[YY]-[SEQ]", order_format: "KON-OR-[YY]-[SEQ]" },
  launch_controls: { system_mode: "controlled_launch", manual_payment_verification: true, manual_payout_approval: true, affiliate_approval_required: true, ai_enabled: true, bank_only_payments: true, audit_notifications_enabled: true },
  business_profile: { legal_name: "", brand_name: "", tagline: "", support_email: "", support_phone: "", business_address: "", tax_id: "", vat_number: "", website: "" },
  branding: { primary_logo_url: "", secondary_logo_url: "", favicon_url: "", primary_color: "#20364D", accent_color: "#D4A843", dark_bg_color: "#0f172a" },
  notification_sender: { sender_name: "", sender_email: "", whatsapp_number: "", email_footer_text: "" },
  customer_activity_rules: { active_days: 30, at_risk_days: 90, default_new_customer_status: "active", signals: { orders: true, invoices: true, quotes: true, requests: true, sales_notes: true, account_logins: false } },
  discount_governance: { enabled: true, critical_threshold: 3, warning_threshold: 5, rolling_window_days: 7, dedup_window_hours: 24 },
  operational_rules: { date_format: "DD MMM YYYY", time_format: "HH:mm", timezone: "Africa/Dar_es_Salaam", default_country: "TZ", follow_up_threshold_days: 3, stale_deal_threshold_days: 7, quote_response_threshold_days: 5, payment_overdue_threshold_days: 7 },
  distribution_config: { protected_company_margin_percent: 8, affiliate_percent_of_distributable: 10, sales_percent_of_distributable: 15, promo_percent_of_distributable: 10, referral_percent_of_distributable: 5, country_bonus_percent_of_distributable: 5 },
  partner_policy: { auto_assignment_mode: "capability_match", logistics_handling_default: "konekt_managed", vendor_types: ["product_supplier", "service_provider", "logistics_partner"] },
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
        {tab === "preview" && (
          <div className="max-w-xl mx-auto">
            <SettingsPreviewPanel state={state} />
          </div>
        )}
        {tab === "pricing_policy" && <PricingPolicyTab />}
        {tab === "commercial" && <CommercialTab state={state} setState={setState} />}
        {tab === "operations" && <OperationsTab state={state} setState={setState} />}
        {tab === "sales" && <SalesTab state={state} setState={setState} />}
        {tab === "affiliate" && <AffiliateTab state={state} setState={setState} />}
        {tab === "payout" && <PayoutTab state={state} setState={setState} />}
        {tab === "workflows" && <WorkflowsTab state={state} setState={setState} />}
        {tab === "partners" && <PartnersTab state={state} setState={setState} />}
        {tab === "notifications" && <NotificationsTab state={state} setState={setState} />}
        {tab === "report_delivery" && <ReportScheduleSection />}
        {tab === "launch" && <LaunchTab state={state} setState={setState} />}
      </div>
    </div>
  );
}

/* ─── Tab Components ─── */

function ProfileTab({ state, setState }) {
  const s = state.business_profile || {};
  const n = state.numbering_rules || {};
  const b = state.branding || {};
  const ns = state.notification_sender || {};
  return (
    <>
      <SettingsSectionCard title="Company Information" description="Legal identity and contact details.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsTextField label="Legal Company Name" value={s.legal_name} onChange={(v) => setState(U(state, "business_profile", "legal_name", v))} />
          <SettingsTextField label="Brand Name" value={s.brand_name} onChange={(v) => setState(U(state, "business_profile", "brand_name", v))} />
          <SettingsTextField label="Tagline" value={s.tagline} onChange={(v) => setState(U(state, "business_profile", "tagline", v))} />
          <SettingsTextField label="Support Email" value={s.support_email} onChange={(v) => setState(U(state, "business_profile", "support_email", v))} />
          <SettingsTextField label="Support Phone" value={s.support_phone} onChange={(v) => setState(U(state, "business_profile", "support_phone", v))} />
          <SettingsTextField label="Website" value={s.website} onChange={(v) => setState(U(state, "business_profile", "website", v))} />
          <SettingsTextField label="Business Address" value={s.business_address} onChange={(v) => setState(U(state, "business_profile", "business_address", v))} />
          <SettingsTextField label="Tax/VAT ID" value={s.tax_id} onChange={(v) => setState(U(state, "business_profile", "tax_id", v))} />
          <SettingsTextField label="Default Country" value={state.payment_accounts?.default_country} onChange={(v) => setState(U(state, "payment_accounts", "default_country", v))} />
          <SettingsTextField label="Default Currency" value={state.payment_accounts?.currency} onChange={(v) => setState(U(state, "payment_accounts", "currency", v))} />
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Branding" description="Logo, colors, and visual identity. Used across frontend, emails, and documents.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsTextField label="Primary Logo URL" value={b.primary_logo_url} onChange={(v) => setState(U(state, "branding", "primary_logo_url", v))} />
          <SettingsTextField label="Secondary Logo URL" value={b.secondary_logo_url} onChange={(v) => setState(U(state, "branding", "secondary_logo_url", v))} />
          <SettingsTextField label="Favicon URL" value={b.favicon_url} onChange={(v) => setState(U(state, "branding", "favicon_url", v))} />
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={b.primary_color || "#20364D"} onChange={(e) => setState(U(state, "branding", "primary_color", e.target.value))} className="w-10 h-10 rounded-lg border cursor-pointer" />
              <input type="text" value={b.primary_color || ""} onChange={(e) => setState(U(state, "branding", "primary_color", e.target.value))} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="#20364D" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Accent Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={b.accent_color || "#D4A843"} onChange={(e) => setState(U(state, "branding", "accent_color", e.target.value))} className="w-10 h-10 rounded-lg border cursor-pointer" />
              <input type="text" value={b.accent_color || ""} onChange={(e) => setState(U(state, "branding", "accent_color", e.target.value))} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="#D4A843" />
            </div>
          </div>
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Notification Sender" description="Sender identity for emails and WhatsApp messages.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsTextField label="Sender Name" value={ns.sender_name} onChange={(v) => setState(U(state, "notification_sender", "sender_name", v))} />
          <SettingsTextField label="Sender Email" value={ns.sender_email} onChange={(v) => setState(U(state, "notification_sender", "sender_email", v))} />
          <SettingsTextField label="WhatsApp Number" value={ns.whatsapp_number} onChange={(v) => setState(U(state, "notification_sender", "whatsapp_number", v))} />
          <SettingsTextField label="Email Footer Text" value={ns.email_footer_text} onChange={(v) => setState(U(state, "notification_sender", "email_footer_text", v))} />
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
  const dg = state.discount_governance || {};
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
      <SettingsSectionCard title="Referral & Wallet" description="Configure referral reward allocation (from distribution margin) and wallet usage limits.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsNumberField label="Referral Reward % (of dist. margin)" value={c.referral_pct} onChange={(v) => setState(U(state, "commercial", "referral_pct", v))} />
          <SettingsNumberField label="Max Wallet Usage % per Order" value={c.max_wallet_usage_pct} onChange={(v) => setState(U(state, "commercial", "max_wallet_usage_pct", v))} />
          <SettingsNumberField label="Min Order for Referral Reward" value={c.referral_min_order_amount} onChange={(v) => setState(U(state, "commercial", "referral_min_order_amount", v))} />
          <SettingsNumberField label="Max Reward per Order (0=no cap)" value={c.referral_max_reward_per_order} onChange={(v) => setState(U(state, "commercial", "referral_max_reward_per_order", v))} />
        </div>
        <p className="text-xs text-slate-400 mt-3">Referral rewards are funded from the distribution margin pool. Ensure total allocations (affiliate + sales + discount + referral) do not exceed 100%.</p>
      </SettingsSectionCard>
      <SettingsSectionCard title="Welcome Bonus Campaign" description="One-time bonus for referred users on their first verified purchase. Funded strictly from the distribution margin.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="Enable Welcome Bonus" checked={c.welcome_bonus_enabled} onChange={(v) => setState(U(state, "commercial", "welcome_bonus_enabled", v))} />
          <SettingsSelectField label="Bonus Type" value={c.welcome_bonus_type} onChange={(v) => setState(U(state, "commercial", "welcome_bonus_type", v))} options={[{ value: "fixed", label: "Fixed Amount (TZS)" }, { value: "percentage", label: "% of Dist. Margin" }]} />
          <SettingsNumberField label={c.welcome_bonus_type === "percentage" ? "Bonus % of Margin" : "Bonus Amount (TZS)"} value={c.welcome_bonus_value} onChange={(v) => setState(U(state, "commercial", "welcome_bonus_value", v))} />
          <SettingsNumberField label="Max Cap (TZS, 0=none)" value={c.welcome_bonus_max_cap} onChange={(v) => setState(U(state, "commercial", "welcome_bonus_max_cap", v))} />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          <SettingsToggleField label="First purchase only" checked={c.welcome_bonus_first_purchase_only} onChange={(v) => setState(U(state, "commercial", "welcome_bonus_first_purchase_only", v))} />
          <SettingsToggleField label="Stack with referral reward" checked={c.welcome_bonus_stack_with_referral} onChange={(v) => setState(U(state, "commercial", "welcome_bonus_stack_with_referral", v))} />
          <SettingsToggleField label="Stack with wallet usage" checked={c.welcome_bonus_stack_with_wallet} onChange={(v) => setState(U(state, "commercial", "welcome_bonus_stack_with_wallet", v))} />
        </div>
        {!c.welcome_bonus_enabled && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
            Campaign is <strong>disabled</strong>. Enable it above to activate the welcome bonus for new referred users.
          </div>
        )}
        {c.welcome_bonus_enabled && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            Active: Referred users receive a {c.welcome_bonus_type === "fixed" ? `TZS ${(c.welcome_bonus_value || 0).toLocaleString()} bonus` : `${c.welcome_bonus_value || 0}% of distributable margin bonus`} on their first verified purchase.
            {!c.welcome_bonus_stack_with_referral && " Will NOT stack with referral rewards on the same order."}
          </div>
        )}
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
      <SettingsSectionCard title="Discount Governance" description="Control risk-behavior alert sensitivity for sales discount patterns.">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <SettingsToggleField label="Alerting enabled" checked={dg.enabled} onChange={(v) => setState(U(state, "discount_governance", "enabled", v))} />
          <SettingsNumberField label="Critical threshold (requests)" value={dg.critical_threshold} onChange={(v) => setState(U(state, "discount_governance", "critical_threshold", v))} />
          <SettingsNumberField label="Warning threshold (requests)" value={dg.warning_threshold} onChange={(v) => setState(U(state, "discount_governance", "warning_threshold", v))} />
          <SettingsNumberField label="Rolling window (days)" value={dg.rolling_window_days} onChange={(v) => setState(U(state, "discount_governance", "rolling_window_days", v))} />
          <SettingsNumberField label="De-dup window (hours)" value={dg.dedup_window_hours} onChange={(v) => setState(U(state, "discount_governance", "dedup_window_hours", v))} />
        </div>
        <div className="mt-3 p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
          When a sales rep submits <strong>{dg.critical_threshold || 3}+</strong> critical-risk or <strong>{dg.warning_threshold || 5}+</strong> warning-level discount requests within <strong>{dg.rolling_window_days || 7} days</strong>, an alert is created for admin review. Duplicate alerts are suppressed for <strong>{dg.dedup_window_hours || 24} hours</strong>.
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Customer Activity Rules" description="Control how the CRM computes Active, At Risk, and Inactive customer status.">
        <CustomerActivityRulesCard
          value={state.customer_activity_rules}
          onChange={(v) => setState((prev) => ({ ...prev, customer_activity_rules: v }))}
        />
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
    <SettingsSectionCard title="Affiliate Program" description="Default affiliate economics, approval, and governance.">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SettingsNumberField label="Default Commission %" value={a.default_affiliate_commission_percent} onChange={(v) => setState(U(state, "affiliate", "default_affiliate_commission_percent", v))} />
        <SettingsSelectField label="Default Status" value={a.default_affiliate_status} onChange={(v) => setState(U(state, "affiliate", "default_affiliate_status", v))} options={[{ value: "pending", label: "Pending" }, { value: "active", label: "Active" }]} />
        <SettingsSelectField label="Commission Trigger" value={a.commission_trigger} onChange={(v) => setState(U(state, "affiliate", "commission_trigger", v))} options={[{ value: "payment_approved", label: "Payment Approved" }, { value: "order_completed", label: "Order Completed" }]} />
        <SettingsSelectField label="Commission Duration" value={a.commission_duration} onChange={(v) => setState(U(state, "affiliate", "commission_duration", v))} options={[{ value: "per_successful_sale", label: "Per Sale" }, { value: "first_order_only", label: "First Order Only" }]} />
        <SettingsSelectField label="Attribution Sources" value={a.attribution_sources} onChange={(v) => setState(U(state, "affiliate", "attribution_sources", v))} options={[{ value: "link_and_code", label: "Link + Code" }, { value: "link_only", label: "Link Only" }, { value: "code_only", label: "Code Only" }]} />
        <SettingsNumberField label="Attribution Window (days)" value={a.attribution_window_days} onChange={(v) => setState(U(state, "affiliate", "attribution_window_days", v))} />
        <SettingsToggleField label="Requires approval" checked={a.affiliate_registration_requires_approval} onChange={(v) => setState(U(state, "affiliate", "affiliate_registration_requires_approval", v))} />
        <SettingsToggleField label="Personal promo code" checked={a.personal_promo_code_enabled} onChange={(v) => setState(U(state, "affiliate", "personal_promo_code_enabled", v))} />
        <SettingsToggleField label="Watchlist logic" checked={a.watchlist_logic_enabled} onChange={(v) => setState(U(state, "affiliate", "watchlist_logic_enabled", v))} />
      </div>
    </SettingsSectionCard>
  );
}

function PayoutTab({ state, setState }) {
  const p = state.payouts || {};
  return (
    <SettingsSectionCard title="Payout Settings" description="Minimum payout amounts, supported methods, cycle, and approval rules.">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SettingsNumberField label="Affiliate Min Payout (TZS)" value={p.affiliate_minimum_payout} onChange={(v) => setState(U(state, "payouts", "affiliate_minimum_payout", v))} />
        <SettingsNumberField label="Sales Min Payout (TZS)" value={p.sales_minimum_payout} onChange={(v) => setState(U(state, "payouts", "sales_minimum_payout", v))} />
        <SettingsSelectField label="Payout Cycle" value={p.payout_cycle} onChange={(v) => setState(U(state, "payouts", "payout_cycle", v))} options={[{ value: "monthly", label: "Monthly" }, { value: "bi_weekly", label: "Bi-Weekly" }, { value: "weekly", label: "Weekly" }]} />
        <SettingsSelectField label="Review Mode" value={p.payout_review_mode} onChange={(v) => setState(U(state, "payouts", "payout_review_mode", v))} options={[{ value: "admin_required", label: "Admin Approval Required" }, { value: "auto_approve", label: "Auto-Approve" }]} />
        <SettingsToggleField label="Manual payout approval" checked={p.manual_payout_approval} onChange={(v) => setState(U(state, "payouts", "manual_payout_approval", v))} />
      </div>
      <div className="mt-4 p-4 rounded-xl bg-slate-50 text-sm text-slate-600">
        <strong>Supported payout methods:</strong> Mobile Money, Bank Transfer. These methods are available to affiliates and sales team when requesting withdrawals.
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
      <SettingsSectionCard title="System-Wide Notifications" description="Choose which parties receive default notifications.">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <SettingsToggleField label="Customer" checked={n.customer_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "customer_notifications_enabled", v))} />
          <SettingsToggleField label="Sales" checked={n.sales_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "sales_notifications_enabled", v))} />
          <SettingsToggleField label="Affiliate" checked={n.affiliate_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "affiliate_notifications_enabled", v))} />
          <SettingsToggleField label="Admin" checked={n.admin_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "admin_notifications_enabled", v))} />
          <SettingsToggleField label="Vendor" checked={n.vendor_notifications_enabled} onChange={(v) => setState(U(state, "notifications", "vendor_notifications_enabled", v))} />
        </div>
      </SettingsSectionCard>
      <NotificationPreferencesSection apiClient={api} />
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

function OperationsTab({ state, setState }) {
  const o = state.operational_rules || {};
  return (
    <>
      <SettingsSectionCard title="Date & Time" description="Global formatting and timezone used across the platform.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsSelectField label="Date Format" value={o.date_format} onChange={(v) => setState(U(state, "operational_rules", "date_format", v))} options={[{ value: "DD MMM YYYY", label: "DD MMM YYYY (10 Apr 2026)" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-04-10)" }, { value: "DD/MM/YYYY", label: "DD/MM/YYYY (10/04/2026)" }, { value: "MM/DD/YYYY", label: "MM/DD/YYYY (04/10/2026)" }]} />
          <SettingsSelectField label="Time Format" value={o.time_format} onChange={(v) => setState(U(state, "operational_rules", "time_format", v))} options={[{ value: "HH:mm", label: "24-hour (14:30)" }, { value: "hh:mm A", label: "12-hour (2:30 PM)" }]} />
          <SettingsSelectField label="Timezone" value={o.timezone} onChange={(v) => setState(U(state, "operational_rules", "timezone", v))} options={[{ value: "Africa/Dar_es_Salaam", label: "East Africa (EAT)" }, { value: "Africa/Nairobi", label: "Nairobi (EAT)" }, { value: "Africa/Lagos", label: "West Africa (WAT)" }, { value: "Africa/Johannesburg", label: "South Africa (SAST)" }, { value: "UTC", label: "UTC" }]} />
          <SettingsTextField label="Default Country" value={o.default_country} onChange={(v) => setState(U(state, "operational_rules", "default_country", v))} />
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Automation Thresholds" description="Control when follow-up alerts, stale warnings, and overdue notices trigger.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsNumberField label="Follow-up threshold (days)" value={o.follow_up_threshold_days} onChange={(v) => setState(U(state, "operational_rules", "follow_up_threshold_days", v))} />
          <SettingsNumberField label="Stale deal threshold (days)" value={o.stale_deal_threshold_days} onChange={(v) => setState(U(state, "operational_rules", "stale_deal_threshold_days", v))} />
          <SettingsNumberField label="Quote response threshold (days)" value={o.quote_response_threshold_days} onChange={(v) => setState(U(state, "operational_rules", "quote_response_threshold_days", v))} />
          <SettingsNumberField label="Payment overdue threshold (days)" value={o.payment_overdue_threshold_days} onChange={(v) => setState(U(state, "operational_rules", "payment_overdue_threshold_days", v))} />
        </div>
        <div className="mt-3 p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
          These thresholds are used by the background sales follow-up automation. Changes take effect within 30 seconds.
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Commission Distribution" description="Distribution percentages are now managed in the Pricing Policy tab as part of each tier's distribution split.">
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
          Distribution percentages (affiliate, sales, promo, referral, reserve) are now tier-specific and managed under the <strong>Pricing Policy</strong> tab. Each tier defines its own distribution split, giving you precise control over how margins are shared at every order value range.
        </div>
      </SettingsSectionCard>
    </>
  );
}

function PartnersTab({ state, setState }) {
  const pp = state.partner_policy || {};
  return (
    <SettingsSectionCard title="Partner & Vendor Policy" description="Control assignment, logistics defaults, and vendor type configurations.">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SettingsSelectField label="Auto-Assignment Mode" value={pp.auto_assignment_mode} onChange={(v) => setState(U(state, "partner_policy", "auto_assignment_mode", v))} options={[{ value: "capability_match", label: "Capability Match" }, { value: "round_robin", label: "Round Robin" }, { value: "manual", label: "Manual Only" }]} />
        <SettingsSelectField label="Logistics Handling Default" value={pp.logistics_handling_default} onChange={(v) => setState(U(state, "partner_policy", "logistics_handling_default", v))} options={[{ value: "konekt_managed", label: "Konekt Managed" }, { value: "vendor_managed", label: "Vendor Managed" }, { value: "customer_pickup", label: "Customer Pickup" }]} />
      </div>
      <div className="mt-4 p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
        <strong>Supported vendor types:</strong> Product Supplier, Service Provider, Logistics Partner. These types are used for partner classification and assignment matching.
      </div>
    </SettingsSectionCard>
  );
}



function PricingPolicyTab() {
  const [tiers, setTiers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [previewCost, setPreviewCost] = React.useState("");
  const [previewResult, setPreviewResult] = React.useState(null);
  const [validationErrors, setValidationErrors] = React.useState([]);

  React.useEffect(() => {
    api.get("/api/commission-engine/pricing-policy-tiers").then((res) => {
      setTiers(res.data?.tiers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateTier = (idx, field, value) => {
    setTiers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const updateSplit = (idx, field, value) => {
    setTiers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], distribution_split: { ...next[idx].distribution_split, [field]: value } };
      return next;
    });
  };

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMin = lastTier ? lastTier.max_amount + 1 : 0;
    setTiers([...tiers, {
      label: "New Tier",
      min_amount: newMin,
      max_amount: newMin + 100000,
      total_margin_pct: 20,
      protected_platform_margin_pct: 14,
      distributable_margin_pct: 6,
      distribution_split: { affiliate_pct: 25, promotion_pct: 20, sales_pct: 20, referral_pct: 20, reserve_pct: 15 },
    }]);
  };

  const removeTier = (idx) => {
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const errs = [];
    tiers.forEach((t, i) => {
      const s = t.distribution_split || {};
      const splitTotal = (s.affiliate_pct || 0) + (s.promotion_pct || 0) + (s.sales_pct || 0) + (s.referral_pct || 0) + (s.reserve_pct || 0);
      if (splitTotal > 100) errs.push(`Tier ${i + 1}: split total is ${splitTotal}%, exceeds 100%`);
      const marginSum = (t.protected_platform_margin_pct || 0) + (t.distributable_margin_pct || 0);
      if (marginSum > (t.total_margin_pct || 0) + 0.01) errs.push(`Tier ${i + 1}: protected(${t.protected_platform_margin_pct}%) + distributable(${t.distributable_margin_pct}%) exceeds total margin(${t.total_margin_pct}%)`);
    });
    setValidationErrors(errs);
    return errs.length === 0;
  };

  const saveTiers = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.put("/api/commission-engine/pricing-policy-tiers", { tiers });
      alert("Pricing policy tiers saved.");
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (detail?.errors) {
        setValidationErrors(detail.errors);
      } else {
        alert("Error saving tiers.");
      }
    }
    setSaving(false);
  };

  const runPreview = async () => {
    if (!previewCost) return;
    try {
      const res = await api.post("/api/commission-engine/preview", {
        base_cost: parseFloat(previewCost),
        has_affiliate: true,
        has_referral: false,
        has_sales: true,
      });
      setPreviewResult(res.data);
    } catch { setPreviewResult(null); }
  };

  if (loading) return <div className="text-sm text-slate-400 py-8 text-center">Loading pricing policy...</div>;

  const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

  return (
    <>
      <SettingsSectionCard
        title="Margin & Distribution Tiers"
        description="Unified pricing policy. Each tier defines margin percentages and how the distributable pool is split. This is the single source of truth for margins, promotions, affiliate, referral, sales, and wallet rules."
      >
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1" data-testid="pricing-validation-errors">
            <div className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Validation Errors</div>
            {validationErrors.map((e, i) => <div key={i}>- {e}</div>)}
          </div>
        )}

        <div className="space-y-4">
          {tiers.map((tier, idx) => {
            const s = tier.distribution_split || {};
            const splitTotal = (s.affiliate_pct || 0) + (s.promotion_pct || 0) + (s.sales_pct || 0) + (s.referral_pct || 0) + (s.reserve_pct || 0);
            const marginSum = (tier.protected_platform_margin_pct || 0) + (tier.distributable_margin_pct || 0);
            const splitValid = splitTotal <= 100;
            const marginValid = marginSum <= (tier.total_margin_pct || 0) + 0.01;

            return (
              <div key={idx} className="rounded-xl border border-slate-200 p-4 space-y-3" data-testid={`pricing-tier-${idx}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#20364D] bg-slate-100 px-2 py-0.5 rounded-md">Tier {idx + 1}</span>
                    <input
                      type="text"
                      value={tier.label || ""}
                      onChange={(e) => updateTier(idx, "label", e.target.value)}
                      className="text-sm font-semibold text-slate-700 border-b border-transparent hover:border-slate-300 focus:border-[#20364D] focus:outline-none bg-transparent px-1"
                      data-testid={`tier-label-${idx}`}
                    />
                  </div>
                  <button onClick={() => removeTier(idx)} className="text-red-400 hover:text-red-600 transition-colors" data-testid={`remove-tier-${idx}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Amount Range */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <TierNumberField label="Min Amount (TZS)" value={tier.min_amount} onChange={(v) => updateTier(idx, "min_amount", v)} testId={`tier-min-${idx}`} />
                  <TierNumberField label="Max Amount (TZS)" value={tier.max_amount} onChange={(v) => updateTier(idx, "max_amount", v)} testId={`tier-max-${idx}`} />
                </div>

                {/* Margin Percentages */}
                <div className="grid grid-cols-3 gap-3">
                  <TierNumberField label="Total Margin %" value={tier.total_margin_pct} onChange={(v) => updateTier(idx, "total_margin_pct", v)} testId={`tier-total-margin-${idx}`} />
                  <TierNumberField label="Protected/Platform %" value={tier.protected_platform_margin_pct} onChange={(v) => updateTier(idx, "protected_platform_margin_pct", v)} testId={`tier-protected-${idx}`} />
                  <TierNumberField label="Distributable %" value={tier.distributable_margin_pct} onChange={(v) => updateTier(idx, "distributable_margin_pct", v)} testId={`tier-distributable-${idx}`} />
                </div>
                {!marginValid && (
                  <div className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Protected + Distributable ({marginSum}%) exceeds Total Margin ({tier.total_margin_pct}%)
                  </div>
                )}

                {/* Distribution Split */}
                <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Distribution Split (% of distributable pool)</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <TierNumberField label="Affiliate" value={s.affiliate_pct} onChange={(v) => updateSplit(idx, "affiliate_pct", v)} testId={`tier-split-affiliate-${idx}`} />
                    <TierNumberField label="Promotion" value={s.promotion_pct} onChange={(v) => updateSplit(idx, "promotion_pct", v)} testId={`tier-split-promotion-${idx}`} />
                    <TierNumberField label="Sales" value={s.sales_pct} onChange={(v) => updateSplit(idx, "sales_pct", v)} testId={`tier-split-sales-${idx}`} />
                    <TierNumberField label="Referral" value={s.referral_pct} onChange={(v) => updateSplit(idx, "referral_pct", v)} testId={`tier-split-referral-${idx}`} />
                    <TierNumberField label="Reserve" value={s.reserve_pct} onChange={(v) => updateSplit(idx, "reserve_pct", v)} testId={`tier-split-reserve-${idx}`} />
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${splitValid ? "text-emerald-600" : "text-red-500"}`}>
                    {splitValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    Split total: {splitTotal}%{splitTotal < 100 ? ` (${(100 - splitTotal).toFixed(1)}% unallocated)` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button onClick={addTier} className="flex items-center gap-1.5 text-xs font-semibold text-[#20364D] hover:text-[#D4A843] transition-colors" data-testid="add-tier-btn">
            <Plus className="w-3.5 h-3.5" /> Add Tier
          </button>
          <button onClick={saveTiers} disabled={saving} className="rounded-xl bg-[#20364D] text-white px-5 py-2 text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-50 transition-colors" data-testid="save-pricing-tiers-btn">
            {saving ? "Saving..." : "Save Pricing Policy"}
          </button>
        </div>
      </SettingsSectionCard>

      {/* Live Preview */}
      <SettingsSectionCard title="Pricing Preview" description="Test how a specific base cost resolves through the pricing policy.">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 block">Base Cost (TZS)</label>
            <input
              type="number"
              value={previewCost}
              onChange={(e) => setPreviewCost(e.target.value)}
              placeholder="e.g. 3000000"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-[#20364D] focus:border-[#20364D] outline-none"
              data-testid="pricing-preview-input"
            />
          </div>
          <button onClick={runPreview} className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors" data-testid="pricing-preview-btn">
            Preview
          </button>
        </div>
        {previewResult && (
          <div className="mt-4 rounded-xl border border-slate-200 p-4 space-y-2 text-sm" data-testid="pricing-preview-result">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <PreviewField label="Tier" value={previewResult.tier_label} />
              <PreviewField label="Base Cost" value={money(previewResult.base_cost)} />
              <PreviewField label="Selling Price" value={money(previewResult.selling_price)} />
              <PreviewField label="Total Margin" value={`${previewResult.total_margin_pct}% → ${money(previewResult.total_margin_amount)}`} />
              <PreviewField label="Protected" value={`${previewResult.protected_platform_margin_pct}% → ${money(previewResult.protected_platform_margin_amount)}`} />
              <PreviewField label="Distributable Pool" value={`${previewResult.distributable_margin_pct}% → ${money(previewResult.distributable_pool)}`} />
            </div>
            {previewResult.allocations && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Allocations (from distributable pool)</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <PreviewField label="Affiliate" value={`${previewResult.allocations.affiliate_pct_applied}% → ${money(previewResult.allocations.affiliate_amount)}`} />
                  <PreviewField label="Promotion" value={`${previewResult.allocations.promotion_pct_applied}% → ${money(previewResult.allocations.promotion_amount)}`} />
                  <PreviewField label="Sales" value={`${previewResult.allocations.sales_pct_applied}% → ${money(previewResult.allocations.sales_amount)}`} />
                  <PreviewField label="Referral" value={`${previewResult.allocations.referral_pct_applied}% → ${money(previewResult.allocations.referral_amount)}`} />
                  <PreviewField label="Reserve" value={`${previewResult.allocations.reserve_pct_applied}% → ${money(previewResult.allocations.reserve_amount)}`} />
                </div>
              </div>
            )}
          </div>
        )}
      </SettingsSectionCard>

      {/* Rules Info */}
      <SettingsSectionCard title="Policy Rules" description="Enforced automatically by the pricing engine.">
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> <span><strong>Referral overrides Affiliate:</strong> If referral exists, affiliate allocation = 0 for that order.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> <span><strong>Hard validation:</strong> If total split exceeds 100%, the order is rejected (no silent scaling).</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> <span><strong>Wallet protection:</strong> Wallet usage can never consume vendor base cost or protected platform margin. Only distributable pool.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> <span><strong>Tier resolution by base cost:</strong> Each line item resolves to its own tier independently.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> <span><strong>Reserve buffer:</strong> Always maintained per tier to protect against edge cases.</span></div>
        </div>
      </SettingsSectionCard>
    </>
  );
}

function TierNumberField({ label, value, onChange, testId }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#20364D] focus:border-[#20364D] outline-none"
        data-testid={testId}
      />
    </div>
  );
}

function PreviewField({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
      <div className="text-sm font-semibold text-slate-700">{value}</div>
    </div>
  );
}
