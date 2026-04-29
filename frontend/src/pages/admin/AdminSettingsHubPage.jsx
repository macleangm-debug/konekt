import React, { useEffect, useState, useCallback } from "react";
import { Building2, CreditCard, FileText, BarChart3, Users, Globe, Bell, Shield, Rocket, Wallet, Eye, CalendarClock, Settings, Truck, Plus, Trash2, AlertTriangle, CheckCircle2, Target, Package, DollarSign, Bot } from "lucide-react";
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
import SystemNotificationControlPanel from "../../components/admin/settings/SystemNotificationControlPanel";
import SettingsLockGate from "../../components/admin/SettingsLockGate";
import AutomationEngineSection from "../../components/admin/settings/AutomationEngineSection";

import { toast } from "sonner";

const GROUPS = [
  {
    key: "business",
    label: "Business",
    icon: Building2,
    tabs: [
      { key: "profile", label: "Profile", icon: Building2 },
      { key: "payment", label: "Payment Details", icon: CreditCard },
      { key: "branding", label: "Document Branding", icon: FileText },
      { key: "doc_numbering", label: "Document Numbering", icon: FileText },
      { key: "countries", label: "Countries & Markets", icon: Globe },
      { key: "doc_footer", label: "Document Footer", icon: FileText },
      { key: "doc_template", label: "Document Template", icon: Eye },
      { key: "number_format", label: "Number & Currency", icon: DollarSign },
      { key: "notifications", label: "Notifications", icon: Bell },
      { key: "email_triggers", label: "Email Notifications", icon: Bell },
      { key: "report_delivery", label: "Report Delivery", icon: CalendarClock },
    ],
  },
  {
    key: "pricing",
    label: "Pricing Policy",
    icon: BarChart3,
    tabs: [
      { key: "pricing_policy", label: "Pricing Tiers", icon: BarChart3 },
      { key: "commercial", label: "Distribution Rules", icon: BarChart3 },
      { key: "sales", label: "Sales & Commission", icon: Users },
      { key: "payout", label: "Payout Settings", icon: Wallet },
      { key: "launch", label: "Launch Controls", icon: Rocket },
    ],
  },
  {
    key: "partner",
    label: "Partner Policy",
    icon: Truck,
    tabs: [
      { key: "affiliate", label: "Affiliate Policy", icon: Globe },
      { key: "workflows", label: "Vendor Policy", icon: Shield },
      { key: "partners", label: "Partner Config", icon: Truck },
      { key: "operations", label: "Operational Rules", icon: Settings },
      { key: "performance_targets", label: "Performance Targets", icon: Target },
    ],
  },
  {
    key: "automation",
    label: "Automation",
    icon: Bot,
    tabs: [
      { key: "automation_engine", label: "Promotion & Deal Engine", icon: Bot },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: Package,
    tabs: [
      { key: "catalog_units", label: "Units of Measurement", icon: Package },
      { key: "catalog_categories", label: "Product Categories", icon: Package },
      { key: "catalog_category_config", label: "Category Configuration", icon: Settings },
      { key: "catalog_variants", label: "Variant Types", icon: Package },
      { key: "catalog_sku", label: "SKU Configuration", icon: FileText },
      { key: "vendor_ops_settings", label: "Sourcing Strategy", icon: Truck },
    ],
  },
];

const TABS = GROUPS.flatMap((g) => g.tabs);

const TAB_DESCRIPTIONS = {
  profile: "Legal identity, contact details, country, and currency",
  payment: "Bank accounts and payment method configuration",
  branding: "Logo, signature, stamp, and document branding assets",
  doc_numbering: "Quote, Invoice, Order, Delivery Note, PO, and SKU numbering",
  countries: "Configure countries, currencies, and market-specific settings",
  doc_footer: "Footer content displayed on all business documents",
  doc_template: "Select document layout template",
  number_format: "Number formatting, thousand separators, decimal places, and currency display",
  pricing_policy: "Margin tiers and pricing tier configuration",
  commercial: "Distribution rules, margins, VAT, and referral limits",
  operations: "Date formats, timezone, and follow-up thresholds",
  sales: "Commission structure and assignment rules",
  affiliate: "Affiliate program, attribution, and commission policy",
  payout: "Payout cycles, minimums, and approval rules",
  workflows: "Order workflows and vendor visibility rules",
  partners: "Partner assignment and logistics policies",
  notifications: "Notification channels and preferences",
  email_triggers: "Email notification triggers and template controls",
  report_delivery: "Scheduled report delivery settings",
  launch: "System mode and go-live controls",
  preview: "Preview how documents look with current settings",
  performance_targets: "Monthly revenue targets, team sizes, and KPI thresholds",
  catalog_units: "Configure units of measurement for products (Piece, Kg, Litre, etc.)",
  catalog_categories: "Manage product categories available in the catalog",
  catalog_category_config: "Configure display mode, pricing behavior, and sourcing strategy per category",
  catalog_variants: "Define variant types (Size, Color, Material) for product listings",
  catalog_sku: "SKU format, prefix, and auto-generation configuration",
  vendor_ops_settings: "Sourcing mode, quote expiry, lead times, and vendor assignment strategy",
  automation_engine: "Self-running engine that keeps promotions and group deals stocked, scores winners, and silently fulfills group deals at expiry.",
};

const defaultState = {
  commercial: { minimum_company_margin_percent: 20, distribution_layer_percent: 10, protected_company_margin_percent: 8, commission_mode: "fair_balanced", affiliate_attribution_reduces_sales_commission: true, vat_percent: 18, referral_pct: 10, max_wallet_usage_pct: 30, referral_min_order_amount: 0, referral_max_reward_per_order: 0, welcome_bonus_enabled: false, welcome_bonus_type: "fixed", welcome_bonus_value: 5000, welcome_bonus_max_cap: 10000, welcome_bonus_first_purchase_only: true, welcome_bonus_trigger_event: "payment_verified", welcome_bonus_stack_with_referral: false, welcome_bonus_stack_with_wallet: true },
  margin_rules: { allow_product_group_margin_override: true, allow_product_margin_override: true, allow_service_group_margin_override: true, allow_service_margin_override: true, pricing_below_minimum_margin_requires_admin_override: true },
  promotions: { default_promo_type: "safe_distribution", allow_margin_touching_promos: false, max_public_promo_discount_percent: 5, affiliate_visible_campaigns: true, campaign_start_end_required: true },
  affiliate: { default_affiliate_commission_percent: 10, affiliate_registration_requires_approval: true, default_affiliate_status: "pending", personal_promo_code_enabled: true, commission_trigger: "payment_approved", commission_duration: "per_successful_sale", attribution_sources: "link_and_code", attribution_window_days: 30, watchlist_logic_enabled: true, paused_logic_enabled: true, suspend_for_abuse_enabled: true, max_active_affiliates: 0, contracts_starter_min_deals: 5, contracts_starter_min_earnings: 50000, contracts_growth_min_deals: 20, contracts_growth_min_earnings: 250000, contracts_top_min_deals: 60, contracts_top_min_earnings: 1000000, warning_threshold_pct: 50, probation_threshold_pct: 25 },
  payouts: { affiliate_minimum_payout: 50000, sales_minimum_payout: 100000, payout_cycle: "monthly", payout_methods_enabled: ["mobile_money", "bank_transfer"], manual_payout_approval: true, payout_review_mode: "admin_required" },
  sales: { default_sales_commission_self_generated: 15, default_sales_commission_affiliate_generated: 10, assignment_mode: "auto", smart_assignment_enabled: true, lead_source_visibility: true, commission_type_visibility: true, sales_referral_link_enabled: true, sales_promo_codes_enabled: true, assignment_policy: { primary_strategy: "customer_ownership", fallback_strategy: "round_robin", track_deal_source: true } },
  payments: { bank_only_payments: true, card_payments_enabled: false, mobile_money_enabled: false, kwikpay_enabled: false, payment_proof_required: true, payment_proof_auto_link_to_invoice: true, payment_verification_mode: "manual", commission_creation_on_payment_approval: true },
  payment_accounts: { default_country: "TZ", account_name: "", account_number: "", bank_name: "", swift_code: "", branch_name: "", currency: "TZS", show_on_invoice: true, show_on_checkout: true },
  progress_workflows: { hide_internal_provider_details_from_customer: true, customer_safe_external_statuses_only: true, product_workflow_enabled: true, service_workflow_enabled: true },
  ai_assistant: { ai_enabled: true, human_handoff_enabled: true, handoff_after_unresolved_exchanges: 3, lead_capture_on_handoff: true, customer_safe_status_translation_only: true },
  notifications: { customer_notifications_enabled: true, sales_notifications_enabled: true, affiliate_notifications_enabled: true, admin_notifications_enabled: true, vendor_notifications_enabled: true },
  vendors: { vendor_can_update_internal_progress: true, vendor_sees_only_assigned_jobs: true, vendor_cannot_see_customer_financials: true, vendor_cannot_see_commissions: true },
  numbering_rules: { sku_auto_numbering_enabled: true, quote_format: "KON-QT-[YY]-[SEQ]", invoice_format: "KON-IN-[YY]-[SEQ]", order_format: "KON-OR-[YY]-[SEQ]" },
  doc_numbering: {
    country_code: "TZ",
    quote_prefix: "QT", quote_digits: 6, quote_start: 1, quote_type: "sequential",
    invoice_prefix: "IN", invoice_digits: 6, invoice_start: 1, invoice_type: "sequential",
    order_prefix: "ORD", order_digits: 6, order_start: 1, order_type: "sequential",
    delivery_note_prefix: "DN", delivery_note_digits: 6, delivery_note_start: 1, delivery_note_type: "sequential",
    purchase_order_prefix: "PO", purchase_order_digits: 4, purchase_order_start: 1, purchase_order_type: "sequential",
    sku_prefix: "SKU", sku_digits: 6, sku_start: 1, sku_type: "sequential",
    use_shared_sequence: true,
  },
  doc_footer: {
    show_address: true, show_email: true, show_phone: true, show_registration: false, custom_footer_text: "",
  },
  doc_template: { selected_template: "classic" },
  launch_controls: { system_mode: "controlled_launch", manual_payment_verification: true, manual_payout_approval: true, affiliate_approval_required: true, ai_enabled: true, bank_only_payments: true, audit_notifications_enabled: true },
  business_profile: { legal_name: "", brand_name: "", tagline: "Everything Your Business Needs", support_email: "", support_phone: "", business_address: "", tax_id: "", vat_number: "", website: "", base_public_url: "" },
  branding: { primary_logo_url: "", secondary_logo_url: "", favicon_url: "", primary_color: "#20364D", accent_color: "#D4A843", dark_bg_color: "#0f172a" },
  notification_sender: { sender_name: "", sender_email: "", whatsapp_number: "", email_footer_text: "" },
  customer_activity_rules: { active_days: 30, at_risk_days: 90, default_new_customer_status: "active", signals: { orders: true, invoices: true, quotes: true, requests: true, sales_notes: true, account_logins: false } },
  discount_governance: { enabled: true, critical_threshold: 3, warning_threshold: 5, rolling_window_days: 7, dedup_window_hours: 24 },
  operational_rules: { date_format: "DD MMM YYYY", time_format: "HH:mm", timezone: "Africa/Dar_es_Salaam", default_country: "TZ", follow_up_threshold_days: 3, stale_deal_threshold_days: 7, quote_response_threshold_days: 5, payment_overdue_threshold_days: 7 },
  distribution_config: { protected_company_margin_percent: 8, affiliate_percent_of_distributable: 10, sales_percent_of_distributable: 15, promo_percent_of_distributable: 10, referral_percent_of_distributable: 5, country_bonus_percent_of_distributable: 5 },
  partner_policy: { auto_assignment_mode: "capability_match", logistics_handling_default: "konekt_managed", vendor_types: ["product_supplier", "service_provider", "logistics_partner"] },
  performance_targets: { monthly_revenue_target: 500000000, target_margin_pct: 20, channel_allocation: { sales_pct: 50, affiliate_pct: 30, direct_pct: 10, group_deals_pct: 10 }, sales_staff_count: 10, affiliate_count: 10, sales_min_kpi_pct: 70, affiliate_min_kpi_pct: 60, min_rating_threshold: 3, rating_weight_in_kpi_pct: 20 },
  ratings: { enabled: true, trigger: "delivery_confirmed", scale: 5, allow_comment: true },
  sales_visibility: { show_total_commission: true, show_monthly_commission: true, show_pending_commission: true, show_paid_commission: true, show_revenue: false, show_profit_breakdown: false },
  email_triggers: { payment_submitted: true, payment_approved: true, order_confirmed: true, order_completed: true, group_deal_joined: true, group_deal_successful: true, withdrawal_approved: true, affiliate_application_approved: true, rating_request: true },
  affiliate_emails: { send_application_received: true, send_application_approved: true, send_application_rejected: true, sla_response_text: "We will review your application within 48-72 hours." },
  catalog: {
    units_of_measurement: [
      { name: "Piece", abbr: "pcs", type: "count", active: true },
      { name: "Pair", abbr: "pr", type: "count", active: true },
      { name: "Pack", abbr: "pk", type: "count", active: true },
      { name: "Box", abbr: "bx", type: "count", active: true },
      { name: "Carton", abbr: "ctn", type: "count", active: true },
      { name: "Roll", abbr: "rl", type: "count", active: true },
      { name: "Set", abbr: "set", type: "count", active: true },
      { name: "Dozen", abbr: "dz", type: "count", active: true },
      { name: "Bundle", abbr: "bdl", type: "count", active: true },
      { name: "Kg", abbr: "kg", type: "weight", active: true },
      { name: "Gram", abbr: "g", type: "weight", active: true },
      { name: "Litre", abbr: "L", type: "volume", active: true },
      { name: "Millilitre", abbr: "ml", type: "volume", active: true },
      { name: "Meter", abbr: "m", type: "length", active: true },
      { name: "Square Meter", abbr: "sqm", type: "length", active: true },
      { name: "Service Unit", abbr: "svc", type: "service", active: true },
    ],
    product_categories: [
      "Office Equipment", "Printing & Stationery", "IT & Electronics",
      "Furniture", "Promotional Materials", "Industrial Supplies",
      "Cleaning & Hygiene", "Safety & PPE", "Packaging",
      "Food & Beverages", "Fashion & Apparel", "Other"
    ],
    variant_types: ["Size", "Color", "Material", "Weight", "Volume"],
    sku_prefix: "KNT",
    sku_format: "{PREFIX}-{CATEGORY}-{RANDOM}",
  },
  vendor_ops: {
    default_sourcing_mode: "preferred",
    max_vendors_per_request: 3,
    default_quote_expiry_hours: 48,
    default_lead_time_days: 3,
    auto_select_best_quote: true,
  },
};

function U(state, section, field, value) {
  return { ...state, [section]: { ...state[section], [field]: value } };
}

export default function AdminSettingsHubPage() {
  const [state, setState] = useState(defaultState);
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [activeCountry, setActiveCountry] = useState("TZ");
  const [countries, setCountries] = useState([
    { code: "TZ", name: "Tanzania", currency: "TZS", live: true },
    { code: "KE", name: "Kenya", currency: "KES", live: false },
    { code: "UG", name: "Uganda", currency: "UGX", live: false },
  ]);

  const FLAGS = { TZ: "\u{1F1F9}\u{1F1FF}", KE: "\u{1F1F0}\u{1F1EA}", UG: "\u{1F1FA}\u{1F1EC}" };

  // Load settings for active country
  useEffect(() => {
    api.get(`/api/admin/settings-hub?country=${activeCountry}`).then((res) => {
      const data = res.data || {};
      // Load available countries from the response
      const countryList = data.countries?.available_countries;
      if (countryList && countryList.length > 0) {
        setCountries(countryList.map(c => ({
          code: c.code, name: c.name, currency: c.currency,
          live: c.live !== false && c.code === (data.countries?.active_country || "TZ"),
        })));
      }
      setState((prev) => {
        const merged = { ...prev };
        Object.keys(data).forEach((k) => {
          if (typeof merged[k] === "object" && typeof data[k] === "object") {
            merged[k] = { ...merged[k], ...data[k] };
          }
        });
        return merged;
      });
    });
  }, [activeCountry]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/settings-hub?country=${activeCountry}`, state);
      toast.success(`Settings saved for ${countries.find(c => c.code === activeCountry)?.name || activeCountry}`);
    } catch { toast.error("Error saving settings"); }
    setSaving(false);
  };

  const replicateToCountry = async (targetCode) => {
    try {
      await api.post("/api/admin/settings-hub/replicate", {
        source_country: activeCountry,
        target_country: targetCode,
      });
      toast.success(`Settings replicated to ${targetCode}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to replicate");
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]" data-testid="settings-hub-page">
      {/* ─── Country Selector Bar ─── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between" data-testid="settings-country-bar">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Country:</span>
          <div className="flex gap-1.5">
            {countries.map((c) => (
              <button
                key={c.code}
                onClick={() => setActiveCountry(c.code)}
                data-testid={`country-btn-${c.code}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeCountry === c.code
                    ? "bg-[#20364D] text-white shadow-sm"
                    : c.live !== false
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-dashed border-slate-300"
                }`}
              >
                <span>{FLAGS[c.code] || "\u{1F30D}"}</span>
                {c.name}
                {c.live === false && <span className="text-[8px] ml-1 opacity-60">Soon</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {countries.filter(c => c.code !== activeCountry).map(c => (
            <button
              key={c.code}
              onClick={() => replicateToCountry(c.code)}
              className="text-[10px] text-slate-400 hover:text-[#D4A843] transition"
              title={`Copy current settings to ${c.name}`}
            >
              Copy to {c.code}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1">
      {/* ─── Sidebar ─── */}
      <aside className="w-[240px] shrink-0 border-r border-slate-200 bg-white py-5 overflow-y-auto hidden lg:block">
        <div className="px-4 mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settings</h2>
        </div>
        <nav className="space-y-4 px-2" data-testid="settings-sidebar">
          {GROUPS.map((group) => {
            const GIcon = group.icon;
            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <GIcon className="w-3 h-3" />
                  {group.label}
                </div>
                <div className="space-y-0.5 mt-1">
                  {group.tabs.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        data-testid={`settings-tab-${t.key}`}
                        className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all text-left ${active ? "bg-[#20364D] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ─── Mobile Tab Bar (shown only on small screens) ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 overflow-x-auto flex gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[9px] font-semibold shrink-0 transition-colors ${
                active ? "text-[#20364D] bg-slate-100" : "text-slate-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* ─── Content Panel ─── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[960px] pl-8 pr-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#20364D]">
                {TABS.find((t) => t.key === tab)?.label || "Settings"}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {TAB_DESCRIPTIONS[tab] || "Configure system settings"}
              </p>
            </div>
            <button onClick={save} disabled={saving} data-testid="save-all-settings" className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          {/* Active Section */}
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
            {tab === "commercial" && <SettingsLockGate><CommercialTab state={state} setState={setState} /></SettingsLockGate>}
            {tab === "operations" && <OperationsTab state={state} setState={setState} />}
            {tab === "sales" && <SettingsLockGate><SalesTab state={state} setState={setState} /></SettingsLockGate>}
            {tab === "affiliate" && <SettingsLockGate><AffiliateTab state={state} setState={setState} /></SettingsLockGate>}
            {tab === "payout" && <SettingsLockGate><PayoutTab state={state} setState={setState} /></SettingsLockGate>}
            {tab === "workflows" && <WorkflowsTab state={state} setState={setState} />}
            {tab === "partners" && <PartnersTab state={state} setState={setState} />}
            {tab === "performance_targets" && <PerformanceTargetsTab state={state} setState={setState} />}
            {tab === "notifications" && <NotificationsTab state={state} setState={setState} />}
            {tab === "email_triggers" && <EmailTriggersTab state={state} setState={setState} />}
            {tab === "report_delivery" && <ReportScheduleSection />}
            {tab === "launch" && <LaunchTab state={state} setState={setState} />}
            {tab === "doc_numbering" && <DocNumberingTab state={state} setState={setState} />}
            {tab === "countries" && <CountriesTab state={state} setState={setState} />}
            {tab === "doc_footer" && <DocFooterTab state={state} setState={setState} />}
            {tab === "doc_template" && <DocTemplateTab state={state} setState={setState} />}
            {tab === "number_format" && <NumberFormatTab state={state} setState={setState} />}
            {tab === "catalog_units" && <CatalogUnitsTab state={state} setState={setState} />}
            {tab === "catalog_categories" && <CatalogCategoriesTab state={state} setState={setState} />}
            {tab === "catalog_category_config" && <SettingsLockGate><CategoryConfigTab /></SettingsLockGate>}
            {tab === "catalog_variants" && <CatalogVariantsTab state={state} setState={setState} />}
            {tab === "catalog_sku" && <CatalogSkuTab state={state} setState={setState} />}
            {tab === "vendor_ops_settings" && <VendorOpsSettingsTab state={state} setState={setState} />}
            {tab === "automation_engine" && <SettingsLockGate><AutomationEngineSection mode="config" /></SettingsLockGate>}
          </div>
        </div>
      </main>
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
          <SettingsTextField label="Base Public URL" value={s.base_public_url} onChange={(v) => setState(U(state, "business_profile", "base_public_url", v))} placeholder="https://connect.co.tz" />
          <SettingsTextField label="Business Address" value={s.business_address} onChange={(v) => setState(U(state, "business_profile", "business_address", v))} />
          <SettingsTextField label="Tax/VAT ID" value={s.tax_id} onChange={(v) => setState(U(state, "business_profile", "tax_id", v))} />
          <SettingsSelectField label="Country" value={state.payment_accounts?.default_country || "TZ"} onChange={(v) => {
            const currMap = { TZ: "TZS", KE: "KES", UG: "UGX", RW: "RWF", BI: "BIF", ET: "ETB", ZA: "ZAR", NG: "NGN", GH: "GHS", EG: "EGP", US: "USD", GB: "GBP", IN: "INR", AE: "AED", SA: "SAR", CN: "CNY", JP: "JPY", AU: "AUD", BR: "BRL", CA: "CAD", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR" };
            const newState = U(state, "payment_accounts", "default_country", v);
            if (currMap[v]) { newState.payment_accounts = { ...newState.payment_accounts, currency: currMap[v] }; }
            setState(newState);
          }} options={[
            { value: "TZ", label: "Tanzania" }, { value: "KE", label: "Kenya" }, { value: "UG", label: "Uganda" },
            { value: "RW", label: "Rwanda" }, { value: "BI", label: "Burundi" }, { value: "ET", label: "Ethiopia" },
            { value: "ZA", label: "South Africa" }, { value: "NG", label: "Nigeria" }, { value: "GH", label: "Ghana" },
            { value: "EG", label: "Egypt" }, { value: "US", label: "United States" }, { value: "GB", label: "United Kingdom" },
            { value: "IN", label: "India" }, { value: "AE", label: "UAE" }, { value: "SA", label: "Saudi Arabia" },
            { value: "CN", label: "China" }, { value: "AU", label: "Australia" },
          ]} />
          <SettingsTextField label="Currency" value={state.payment_accounts?.currency || "TZS"} onChange={(v) => setState(U(state, "payment_accounts", "currency", v))} />
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
          <SettingsNumberField label="Max Wallet Per Order (TZS, 0=no cap)" value={c.max_wallet_per_order} onChange={(v) => setState(U(state, "commercial", "max_wallet_per_order", v))} />
          <SettingsToggleField label="Enable Wallet Usage" checked={c.wallet_enabled !== false} onChange={(v) => setState(U(state, "commercial", "wallet_enabled", v))} />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          <SettingsToggleField label="Protect Stakeholder Allocations" checked={c.protect_allocations !== false} onChange={(v) => setState(U(state, "commercial", "protect_allocations", v))} />
          <SettingsToggleField label="Enforce Single Channel per Order" checked={c.enforce_single_channel !== false} onChange={(v) => setState(U(state, "commercial", "enforce_single_channel", v))} />
          <SettingsNumberField label="Min Order for Referral Reward" value={c.referral_min_order_amount} onChange={(v) => setState(U(state, "commercial", "referral_min_order_amount", v))} />
        </div>
        <p className="text-xs text-slate-400 mt-3">Wallet usage is limited to promotion reserve + remaining margin after all protected allocations (sales, affiliate, referral, company core) are reserved. No overlap between channels.</p>
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
  const ap = s.assignment_policy || {};
  return (
    <>
    <SettingsSectionCard title="Sales & Commission" description="Commission behavior and assignment rules. Actual commission percentages are defined per tier in Pricing Tiers.">
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 mb-4">
        Commission percentages below are <strong>default values</strong>. The actual rates are calculated per order based on the matching <strong>Pricing Tier</strong> distribution split. Edit tier-specific rates in Pricing Tiers.
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SettingsNumberField label="Default Commission % (Self-Generated)" value={s.default_sales_commission_self_generated} onChange={(v) => setState(U(state, "sales", "default_sales_commission_self_generated", v))} />
        <SettingsNumberField label="Default Commission % (Affiliate Lead)" value={s.default_sales_commission_affiliate_generated} onChange={(v) => setState(U(state, "sales", "default_sales_commission_affiliate_generated", v))} />
        <SettingsSelectField label="Assignment Mode" value={s.assignment_mode} onChange={(v) => setState(U(state, "sales", "assignment_mode", v))} options={[{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }]} />
        <SettingsToggleField label="Smart assignment" checked={s.smart_assignment_enabled} onChange={(v) => setState(U(state, "sales", "smart_assignment_enabled", v))} />
        <SettingsToggleField label="Lead source visibility" checked={s.lead_source_visibility} onChange={(v) => setState(U(state, "sales", "lead_source_visibility", v))} />
        <SettingsToggleField label="Commission type visibility" checked={s.commission_type_visibility} onChange={(v) => setState(U(state, "sales", "commission_type_visibility", v))} />
        <SettingsToggleField label="Sales referral link" checked={s.sales_referral_link_enabled} onChange={(v) => setState(U(state, "sales", "sales_referral_link_enabled", v))} />
        <SettingsToggleField label="Enable Sales Promo Codes" checked={s.sales_promo_codes_enabled} onChange={(v) => setState(U(state, "sales", "sales_promo_codes_enabled", v))} />
      </div>
    </SettingsSectionCard>
    <SettingsSectionCard title="Sales Assignment Policy" description="Configure how new leads and deals are assigned to sales reps. Primary strategy is used first; fallback kicks in when primary can't resolve." data-testid="assignment-policy-section">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SettingsSelectField
          label="Primary Strategy"
          value={ap.primary_strategy || "customer_ownership"}
          onChange={(v) => {
            const updated = { ...state, sales: { ...s, assignment_policy: { ...ap, primary_strategy: v } } };
            setState(updated);
          }}
          options={[
            { value: "customer_ownership", label: "Customer Ownership (existing client keeps same rep)" },
            { value: "weighted_availability", label: "Weighted Availability (Uber-style scoring)" },
          ]}
        />
        <SettingsSelectField
          label="Fallback Strategy"
          value={ap.fallback_strategy || "round_robin"}
          onChange={(v) => {
            const updated = { ...state, sales: { ...s, assignment_policy: { ...ap, fallback_strategy: v } } };
            setState(updated);
          }}
          options={[
            { value: "round_robin", label: "Round Robin" },
            { value: "random", label: "Random" },
          ]}
        />
        <SettingsToggleField
          label="Track deal source (system vs self-generated)"
          checked={ap.track_deal_source !== false}
          onChange={(v) => {
            const updated = { ...state, sales: { ...s, assignment_policy: { ...ap, track_deal_source: v } } };
            setState(updated);
          }}
        />
      </div>
      <div className="mt-3 p-3 rounded-xl bg-slate-50 border text-xs text-slate-600">
        <strong>Customer Ownership:</strong> If a lead matches an existing customer, the same sales rep is preserved. <br/>
        <strong>Weighted Availability:</strong> Scores reps by capacity, specialization, and response speed. <br/>
        <strong>Round Robin:</strong> Rotates evenly across available reps. <br/>
        <strong>Track Deal Source:</strong> Distinguishes between system-assigned and self-generated deals for commission reporting.
      </div>
    </SettingsSectionCard>
    </>
  );
}

function AffiliateTab({ state, setState }) {
  const a = state.affiliate || {};
  return (
    <>
      <SettingsSectionCard title="Affiliate Program" description="Approval, attribution, and governance rules. Commission rates are defined per tier in Pricing Tiers.">
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 mb-4">
          The default commission % below is a <strong>fallback</strong>. Actual affiliate earnings are calculated from the matching <strong>Pricing Tier</strong> distribution split per order.
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsNumberField label="Default Commission % (fallback)" value={a.default_affiliate_commission_percent} onChange={(v) => setState(U(state, "affiliate", "default_affiliate_commission_percent", v))} />
          <SettingsNumberField label="Max Active Affiliates (0=unlimited)" value={a.max_active_affiliates} onChange={(v) => setState(U(state, "affiliate", "max_active_affiliates", v))} />
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

      <SettingsSectionCard title="Affiliate Contracts & Targets" description="Set minimum performance targets for each contract tier. Affiliates are measured against these.">
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <h4 className="text-sm font-semibold text-[#20364D] mb-3">Starter (1 Month)</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <SettingsNumberField label="Min Deals" value={a.contracts_starter_min_deals} onChange={(v) => setState(U(state, "affiliate", "contracts_starter_min_deals", v))} />
              <SettingsNumberField label="Min Earnings (TZS)" value={a.contracts_starter_min_earnings} onChange={(v) => setState(U(state, "affiliate", "contracts_starter_min_earnings", v))} />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <h4 className="text-sm font-semibold text-[#20364D] mb-3">Growth (3 Months)</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <SettingsNumberField label="Min Deals" value={a.contracts_growth_min_deals} onChange={(v) => setState(U(state, "affiliate", "contracts_growth_min_deals", v))} />
              <SettingsNumberField label="Min Earnings (TZS)" value={a.contracts_growth_min_earnings} onChange={(v) => setState(U(state, "affiliate", "contracts_growth_min_earnings", v))} />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <h4 className="text-sm font-semibold text-[#20364D] mb-3">Top Performer (6 Months)</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <SettingsNumberField label="Min Deals" value={a.contracts_top_min_deals} onChange={(v) => setState(U(state, "affiliate", "contracts_top_min_deals", v))} />
              <SettingsNumberField label="Min Earnings (TZS)" value={a.contracts_top_min_earnings} onChange={(v) => setState(U(state, "affiliate", "contracts_top_min_earnings", v))} />
            </div>
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Status Engine" description="Automatic performance evaluation thresholds.">
        <div className="grid md:grid-cols-2 gap-4">
          <SettingsNumberField label="Warning Threshold (%)" value={a.warning_threshold_pct} onChange={(v) => setState(U(state, "affiliate", "warning_threshold_pct", v))} />
          <SettingsNumberField label="Probation Threshold (%)" value={a.probation_threshold_pct} onChange={(v) => setState(U(state, "affiliate", "probation_threshold_pct", v))} />
        </div>
        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          Affiliates performing below warning threshold get a warning notification. Below probation threshold triggers an "at risk" status. Statuses: <strong>Active, Warning, Probation, Suspended</strong>.
        </div>
      </SettingsSectionCard>

      <AffiliateEmailSettingsSection state={state} setState={setState} />
    </>
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
      <SettingsSectionCard title="In-App Notification & Email Channels" description="Global kill-switches for every event type, grouped by category. Turning a channel off here disables it for every user.">
        <SystemNotificationControlPanel />
      </SettingsSectionCard>
      <SettingsSectionCard title="Role-Level Notifications" description="High-level role gates layered on top of the per-event channels above.">
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

function EmailTriggersTab({ state, setState }) {
  const e = state.email_triggers || {};
  const ns = state.notification_sender || {};
  const [previewHtml, setPreviewHtml] = React.useState("");
  const [previewType, setPreviewType] = React.useState("order_completed");
  const [loadingPreview, setLoadingPreview] = React.useState(false);

  const loadPreview = async (type) => {
    setLoadingPreview(true);
    setPreviewType(type);
    try {
      const res = await api.get(`/api/admin/email/preview/${type}`);
      setPreviewHtml(res.data?.html || "");
    } catch { setPreviewHtml("<p>Failed to load preview</p>"); }
    setLoadingPreview(false);
  };

  return (
    <>
      <SettingsSectionCard title="Event Email Kill-Switches" description="Global toggles for every event type's email channel, grouped by category. Shared with the Notifications tab — whichever channel you flip affects both.">
        <SystemNotificationControlPanel />
      </SettingsSectionCard>

      <SettingsSectionCard title="Transactional Email Triggers (legacy)" description="Enable or disable specific email notifications. Each toggle controls whether that email type is sent.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsToggleField label="Payment Submitted" checked={e.payment_submitted} onChange={(v) => setState(U(state, "email_triggers", "payment_submitted", v))} />
          <SettingsToggleField label="Payment Approved" checked={e.payment_approved} onChange={(v) => setState(U(state, "email_triggers", "payment_approved", v))} />
          <SettingsToggleField label="Order Confirmed" checked={e.order_confirmed} onChange={(v) => setState(U(state, "email_triggers", "order_confirmed", v))} />
          <SettingsToggleField label="Order Completed" checked={e.order_completed} onChange={(v) => setState(U(state, "email_triggers", "order_completed", v))} />
          <SettingsToggleField label="Group Deal Joined" checked={e.group_deal_joined} onChange={(v) => setState(U(state, "email_triggers", "group_deal_joined", v))} />
          <SettingsToggleField label="Group Deal Successful" checked={e.group_deal_successful} onChange={(v) => setState(U(state, "email_triggers", "group_deal_successful", v))} />
          <SettingsToggleField label="Withdrawal Approved" checked={e.withdrawal_approved} onChange={(v) => setState(U(state, "email_triggers", "withdrawal_approved", v))} />
          <SettingsToggleField label="Affiliate Application Approved" checked={e.affiliate_application_approved} onChange={(v) => setState(U(state, "email_triggers", "affiliate_application_approved", v))} />
          <SettingsToggleField label="Rating Request Email" checked={e.rating_request} onChange={(v) => setState(U(state, "email_triggers", "rating_request", v))} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Email Sender Settings" description="Sender identity used in all outgoing emails.">
        <div className="grid md:grid-cols-2 gap-4">
          <SettingsTextField label="Sender Name" value={ns.sender_name} onChange={(v) => setState(U(state, "notification_sender", "sender_name", v))} placeholder="Konekt" />
          <SettingsTextField label="Sender / Reply-To Email" value={ns.sender_email} onChange={(v) => setState(U(state, "notification_sender", "sender_email", v))} placeholder="support@konekt.co.tz" />
          <SettingsTextField label="Email Footer Text" value={ns.email_footer_text} onChange={(v) => setState(U(state, "notification_sender", "email_footer_text", v))} placeholder="Thank you for choosing Konekt" />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Email Template Preview" description="Preview how your emails will look with current branding.">
        <div className="flex gap-2 flex-wrap mb-4">
          {["payment_submitted", "payment_approved", "order_completed", "group_deal_successful", "affiliate_approved"].map((t) => (
            <button key={t} onClick={() => loadPreview(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${previewType === t ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} data-testid={`preview-${t}`}>
              {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
        {loadingPreview && <div className="text-center py-8 text-slate-400 text-sm">Loading preview...</div>}
        {previewHtml && !loadingPreview && (
          <div className="border rounded-xl overflow-hidden bg-slate-50 max-h-[500px] overflow-y-auto" data-testid="email-preview-frame">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}
        {!previewHtml && !loadingPreview && (
          <div className="text-center py-8 text-slate-400 text-sm">Click a template above to preview</div>
        )}
      </SettingsSectionCard>
    </>
  );
}


function AffiliateEmailSettingsSection({ state, setState }) {
  const ae = state.affiliate_emails || {};
  return (
    <SettingsSectionCard title="Affiliate Email Settings" description="Control which emails are sent during the affiliate application and activation flow.">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SettingsToggleField label="Send Application Received Email" checked={ae.send_application_received} onChange={(v) => setState(U(state, "affiliate_emails", "send_application_received", v))} />
        <SettingsToggleField label="Send Application Approved Email" checked={ae.send_application_approved} onChange={(v) => setState(U(state, "affiliate_emails", "send_application_approved", v))} />
        <SettingsToggleField label="Send Application Rejected Email" checked={ae.send_application_rejected} onChange={(v) => setState(U(state, "affiliate_emails", "send_application_rejected", v))} />
      </div>
      <div className="mt-4">
        <SettingsTextField label="SLA Response Text (shown in confirmation and emails)" value={ae.sla_response_text} onChange={(v) => setState(U(state, "affiliate_emails", "sla_response_text", v))} placeholder="We will review your application within 48-72 hours." />
      </div>
    </SettingsSectionCard>
  );
}


function LaunchTab({ state, setState }) {
  const l = state.launch_controls || {};
  const [resetting, setResetting] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  const handleGoLiveReset = async () => {
    if (confirmText !== "GO LIVE") return;
    setResetting(true);
    try {
      await api.post("/api/admin/system/go-live-reset");
      toast.success("Test data cleared! System is now in Live mode.");
      setConfirmReset(false);
      setConfirmText("");
      setState(U(state, "launch_controls", "system_mode", "full_live"));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Reset failed");
    }
    setResetting(false);
  };

  return (
    <>
      <SettingsSectionCard title="Launch Controls" description="Recommended defaults for controlled launch.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsSelectField label="System Mode" value={l.system_mode} onChange={(v) => setState(U(state, "launch_controls", "system_mode", v))} options={[{ value: "testing", label: "Testing Mode" }, { value: "controlled_launch", label: "Controlled Launch" }, { value: "full_live", label: "Full Live" }]} />
          <SettingsToggleField label="Manual payment verification" checked={l.manual_payment_verification} onChange={(v) => setState(U(state, "launch_controls", "manual_payment_verification", v))} />
          <SettingsToggleField label="Manual payout approval" checked={l.manual_payout_approval} onChange={(v) => setState(U(state, "launch_controls", "manual_payout_approval", v))} />
          <SettingsToggleField label="Affiliate approval required" checked={l.affiliate_approval_required} onChange={(v) => setState(U(state, "launch_controls", "affiliate_approval_required", v))} />
          <SettingsToggleField label="AI enabled" checked={l.ai_enabled} onChange={(v) => setState(U(state, "launch_controls", "ai_enabled", v))} />
          <SettingsToggleField label="Bank-only payments" checked={l.bank_only_payments} onChange={(v) => setState(U(state, "launch_controls", "bank_only_payments", v))} />
          <SettingsToggleField label="Audit notifications" checked={l.audit_notifications_enabled} onChange={(v) => setState(U(state, "launch_controls", "audit_notifications_enabled", v))} />
        </div>
        {l.system_mode === "testing" && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <strong>Testing Mode:</strong> All data created is test data. When you're ready to go live, use the "Go Live" action below to clear all test data and start fresh.
          </div>
        )}
      </SettingsSectionCard>

      <SettingsSectionCard title="Go Live — Clear Test Data" description="When you're ready to deploy to production, this will delete all test orders, quotes, invoices, payments, customers (except admin accounts), and commissions. Settings, categories, and products are preserved.">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
            data-testid="go-live-btn"
          >
            Prepare Go-Live Reset
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300">
              <p className="text-sm font-bold text-red-800 mb-2">This will permanently delete:</p>
              <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                <li>All orders and vendor orders</li>
                <li>All quotes (v1 and v2)</li>
                <li>All invoices and payment proofs</li>
                <li>All customer accounts (non-admin, non-staff users)</li>
                <li>All commissions and payouts</li>
                <li>All requests, site visits, and group deal participations</li>
                <li>All notifications and timeline events</li>
              </ul>
              <p className="text-sm font-bold text-red-800 mt-3">Preserved:</p>
              <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                <li>Admin & staff accounts</li>
                <li>Settings Hub configuration</li>
                <li>Product catalog and categories</li>
                <li>Partner/vendor accounts</li>
                <li>Affiliate accounts (status reset to pending)</li>
              </ul>
            </div>
            <div>
              <label className="text-xs font-semibold text-red-700">Type <strong>GO LIVE</strong> to confirm:</label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full mt-1 border-2 border-red-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                placeholder="Type GO LIVE"
                data-testid="go-live-confirm-input"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGoLiveReset}
                disabled={confirmText !== "GO LIVE" || resetting}
                className="px-5 py-2.5 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition"
                data-testid="go-live-confirm-btn"
              >
                {resetting ? "Clearing..." : "Clear Test Data & Go Live"}
              </button>
              <button onClick={() => { setConfirmReset(false); setConfirmText(""); }} className="px-4 py-2.5 text-sm font-semibold rounded-xl border text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </SettingsSectionCard>
    </>
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

function PerformanceTargetsTab({ state, setState }) {
  const pt = state.performance_targets || {};
  const ca = pt.channel_allocation || {};
  const updatePT = (field, value) => setState({ ...state, performance_targets: { ...pt, [field]: value } });
  const updateCA = (field, value) => setState({ ...state, performance_targets: { ...pt, channel_allocation: { ...ca, [field]: value } } });
  const totalAlloc = (ca.sales_pct || 0) + (ca.affiliate_pct || 0) + (ca.direct_pct || 0) + (ca.group_deals_pct || 0);

  return (
    <>
      <SettingsSectionCard title="Monthly Targets" description="Set your monthly revenue and margin goals.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsNumberField label="Monthly Revenue Target (TZS)" value={pt.monthly_revenue_target} onChange={(v) => updatePT("monthly_revenue_target", v)} min={0} />
          <SettingsNumberField label="Target Margin %" value={pt.target_margin_pct} onChange={(v) => updatePT("target_margin_pct", v)} min={1} max={100} />
        </div>
        <div className="mt-3 p-3 rounded-xl bg-green-50 text-xs text-green-700">
          <strong>Target Profit:</strong> TZS {((pt.monthly_revenue_target || 0) * (pt.target_margin_pct || 0) / 100).toLocaleString("en-US")}
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Channel Allocation (%)" description="How revenue target is split across channels. Must sum to 100%.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsNumberField label="Sales %" value={ca.sales_pct} onChange={(v) => updateCA("sales_pct", v)} min={0} max={100} />
          <SettingsNumberField label="Affiliate %" value={ca.affiliate_pct} onChange={(v) => updateCA("affiliate_pct", v)} min={0} max={100} />
          <SettingsNumberField label="Direct %" value={ca.direct_pct} onChange={(v) => updateCA("direct_pct", v)} min={0} max={100} />
          <SettingsNumberField label="Group Deals %" value={ca.group_deals_pct} onChange={(v) => updateCA("group_deals_pct", v)} min={0} max={100} />
        </div>
        <div className={`mt-3 p-3 rounded-xl text-xs ${totalAlloc === 100 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          <strong>Total:</strong> {totalAlloc}% {totalAlloc !== 100 && "(must equal 100%)"}
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Team Size & KPI Thresholds" description="Number of team members and minimum performance thresholds.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsNumberField label="Sales Staff Count" value={pt.sales_staff_count} onChange={(v) => updatePT("sales_staff_count", v)} min={1} />
          <SettingsNumberField label="Affiliate Count" value={pt.affiliate_count} onChange={(v) => updatePT("affiliate_count", v)} min={1} />
          <SettingsNumberField label="Sales Min KPI %" value={pt.sales_min_kpi_pct} onChange={(v) => updatePT("sales_min_kpi_pct", v)} min={0} max={100} />
          <SettingsNumberField label="Affiliate Min KPI %" value={pt.affiliate_min_kpi_pct} onChange={(v) => updatePT("affiliate_min_kpi_pct", v)} min={0} max={100} />
        </div>
        <div className="mt-3 p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
          <strong>Per-person targets (auto-calculated):</strong> Sales target = TZS {((pt.monthly_revenue_target || 0) * (ca.sales_pct || 0) / 100 / Math.max(pt.sales_staff_count || 1, 1)).toLocaleString("en-US")} | Affiliate target = TZS {((pt.monthly_revenue_target || 0) * (ca.affiliate_pct || 0) / 100 / Math.max(pt.affiliate_count || 1, 1)).toLocaleString("en-US")}
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Rating & Quality Metrics" description="Configure rating thresholds and their weight in KPI calculations.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsNumberField label="Min Rating Threshold" value={pt.min_rating_threshold} onChange={(v) => updatePT("min_rating_threshold", v)} min={1} max={5} />
          <SettingsNumberField label="Rating Weight in KPI %" value={pt.rating_weight_in_kpi_pct} onChange={(v) => updatePT("rating_weight_in_kpi_pct", v)} min={0} max={100} />
        </div>
        <div className="mt-3 p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
          Staff with ratings below <strong>{pt.min_rating_threshold || 3}</strong> will be flagged. Ratings contribute <strong>{pt.rating_weight_in_kpi_pct || 20}%</strong> to overall KPI score.
        </div>
      </SettingsSectionCard>
    </>
  );
}



function VendorContractGeneratorCard() {
  const [form, setForm] = React.useState({
    vendor_legal_name: "",
    vendor_address: "",
    vendor_phone: "",
    signatory_name: "",
    signatory_title: "",
    signatory_email: "",
  });
  const [busy, setBusy] = React.useState(false);

  const generate = async () => {
    if (!form.vendor_legal_name.trim()) { toast.error("Vendor legal name is required"); return; }
    setBusy(true);
    try {
      const r = await api.post("/api/admin/vendor-agreements/template/prefilled.pdf", form, { responseType: "blob" });
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = form.vendor_legal_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vendor";
      a.download = `konekt-agreement-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Contract downloaded — share it with the vendor via email or WhatsApp");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to generate contract");
    } finally { setBusy(false); }
  };

  const downloadBlank = async () => {
    setBusy(true);
    try {
      const r = await api.get("/api/admin/vendor-agreements/template/blank.pdf", { responseType: "blob" });
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "konekt-vendor-agreement-blank.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Blank template downloaded");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <SettingsSectionCard
      title="Vendor Contract Generator"
      description="Fill vendor details → download a pre-filled PDF of the Konekt Vendor Supply Agreement, ready to email or WhatsApp. For digital signatures, invite the vendor to sign in their portal instead."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1 block">Vendor legal name *</label>
          <input value={form.vendor_legal_name} onChange={update("vendor_legal_name")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Darcity Promotion Ltd" data-testid="vc-vendor-legal-name" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1 block">Vendor phone</label>
          <input value={form.vendor_phone} onChange={update("vendor_phone")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="+255 XX XXX XXXX" data-testid="vc-vendor-phone" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-700 mb-1 block">Vendor registered address</label>
          <input value={form.vendor_address} onChange={update("vendor_address")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Plot No. 45, Mwenge, Dar es Salaam, Tanzania" data-testid="vc-vendor-address" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1 block">Signatory full name</label>
          <input value={form.signatory_name} onChange={update("signatory_name")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Jane Doe" data-testid="vc-signatory-name" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1 block">Signatory title</label>
          <input value={form.signatory_title} onChange={update("signatory_title")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Managing Director" data-testid="vc-signatory-title" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-700 mb-1 block">Signatory email</label>
          <input value={form.signatory_email} onChange={update("signatory_email")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="jane@darcity.tz" data-testid="vc-signatory-email" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 justify-end">
        <button onClick={downloadBlank} disabled={busy} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50" data-testid="vc-download-blank">
          Download blank template
        </button>
        <button onClick={generate} disabled={busy || !form.vendor_legal_name.trim()} className="rounded-xl bg-[#20364D] text-white px-5 py-2 text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-50" data-testid="vc-generate-btn">
          {busy ? "Generating…" : "Generate pre-filled PDF"}
        </button>
      </div>
    </SettingsSectionCard>
  );
}


function PromotionEngineDefaultsCard() {
  const [def, setDef] = React.useState({ sales_preserve_floor_pct: 10, allow_eat_platform_margin: false, default_pools: ["promotion", "reserve"] });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/api/admin/promotions/defaults");
        if (alive && r.data) setDef({ ...def, ...r.data });
      } catch (e) { /* ignore */ }
      finally { alive && setLoading(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePool = (key) => {
    setDef((d) => ({ ...d, default_pools: (d.default_pools || []).includes(key) ? d.default_pools.filter((p) => p !== key) : [...(d.default_pools || []), key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/admin/promotions/defaults", def);
      toast.success("Promotion engine defaults saved");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  if (loading) return <SettingsSectionCard title="Promotion Engine Defaults" description="Loading…"><div className="h-10" /></SettingsSectionCard>;

  return (
    <SettingsSectionCard
      title="Promotion Engine Defaults"
      description="Global guardrails for the Smart Promotion Engine. These apply whenever admins create a bulk discount at /admin/bulk-discounts."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1 block">Sales commission preserve floor (%)</label>
          <input
            type="number" min="0" max="100"
            value={def.sales_preserve_floor_pct}
            onChange={(e) => setDef({ ...def, sales_preserve_floor_pct: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            data-testid="promo-defaults-sales-floor"
          />
          <p className="text-[11px] text-muted-foreground mt-1">% of the sales pool always kept intact so assisted-sales commissions still work on discounted items.</p>
        </div>
        <div>
          <label className="flex items-start gap-2 mt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!def.allow_eat_platform_margin}
              onChange={(e) => setDef({ ...def, allow_eat_platform_margin: e.target.checked })}
              className="mt-0.5"
              data-testid="promo-defaults-allow-platform"
            />
            <div>
              <div className="font-semibold text-sm text-red-600">Allow eating into Konekt platform margin</div>
              <div className="text-[11px] text-muted-foreground">DANGEROUS — when enabled, promotions can cut into the protected Konekt margin. Leave off in normal operations.</div>
            </div>
          </label>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-slate-700 mb-1 block">Default pools pre-ticked when creating a promo</label>
        <div className="flex flex-wrap gap-2">
          {["promotion", "reserve", "affiliate", "referral", "sales"].map((k) => (
            <label key={k} className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer ${(def.default_pools || []).includes(k) ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-700"}`}>
              <input type="checkbox" className="hidden" checked={(def.default_pools || []).includes(k)} onChange={() => togglePool(k)} data-testid={`promo-defaults-pool-${k}`} />
              {k}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={save} disabled={saving} className="rounded-xl bg-[#20364D] text-white px-5 py-2 text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-50" data-testid="promo-defaults-save">
          {saving ? "Saving…" : "Save promotion defaults"}
        </button>
      </div>
    </SettingsSectionCard>
  );
}


function PricingPolicyTab() {
  const CATEGORIES = ["default", "Promotional Materials", "Office Equipment", "Stationery", "Services"];
  const [category, setCategory] = React.useState("default");
  const [tiers, setTiers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [previewCost, setPreviewCost] = React.useState("");
  const [previewResult, setPreviewResult] = React.useState(null);
  const [validationErrors, setValidationErrors] = React.useState([]);

  const loadCategory = React.useCallback(async (cat) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/commission-engine/pricing-policy-tiers`, { params: { category: cat } });
      setTiers(res.data?.tiers || []);
      setValidationErrors([]);
      setDirty(false);
    } catch {
      setTiers([]);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { loadCategory(category); }, [category, loadCategory]);

  const switchCategory = (next) => {
    if (dirty && !window.confirm("You have unsaved changes in this category. Discard them and switch?")) return;
    setCategory(next);
  };

  const updateTier = (idx, field, value) => {
    setDirty(true);
    setTiers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const updateSplit = (idx, field, value) => {
    setDirty(true);
    setTiers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], distribution_split: { ...next[idx].distribution_split, [field]: value } };
      return next;
    });
  };

  const addTier = () => {
    setDirty(true);
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
    setDirty(true);
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
      await api.put("/api/commission-engine/pricing-policy-tiers", { category, tiers });
      setDirty(false);
      alert(`Pricing policy saved for "${category}".`);
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
        description="Unified pricing policy per category. Switch between Promotional Materials, Office Equipment, Stationery, Services, or the Default fallback. Each tier defines margin percentages and how the distributable pool is split."
      >
        {/* Category selector — one tier set per branch */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap" data-testid="pricing-category-tabs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Editing:</span>
              {CATEGORIES.map((cat) => {
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => switchCategory(cat)}
                    data-testid={`pricing-category-tab-${cat.replace(/\s/g, '-')}`}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#20364D] text-white shadow-md"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-[#20364D] hover:text-[#20364D]"
                    }`}
                  >
                    {cat === "default" ? "Default (fallback)" : cat}
                  </button>
                );
              })}
            </div>
            {dirty && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md" data-testid="pricing-dirty-badge">
                ● Unsaved changes
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Products use the tier set matching their <code className="text-slate-700 bg-slate-100 px-1 rounded">branch</code> (e.g. <span className="font-semibold">Cooltex Polo</span> → Promotional Materials, <span className="font-semibold">DTC 1250e</span> → Office Equipment). If a branch has no configured tiers, the <span className="font-semibold">Default</span> set is used as a fallback.
          </p>
        </div>

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
            {saving ? "Saving..." : `Save "${category}" tiers`}
          </button>
        </div>
      </SettingsSectionCard>

      {/* Promotion Engine Defaults */}
      <PromotionEngineDefaultsCard />

      {/* Vendor Contract Generator */}
      <VendorContractGeneratorCard />

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

      {/* Margin Simulator */}
      <MarginSimulator />
    </>
  );
}

function MarginSimulator() {
  const [inputs, setInputs] = React.useState({
    order_value: "",
    items: 1,
    has_affiliate: false,
    has_referral: false,
    has_sales: true,
    wallet_amount: "",
    promo_code: "",
  });
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const update = (k, v) => setInputs((p) => ({ ...p, [k]: v }));

  // Live recalculation with debounce
  const timerRef = React.useRef(null);
  React.useEffect(() => {
    if (!inputs.order_value) { setResult(null); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const baseCost = parseFloat(inputs.order_value) / Math.max(inputs.items, 1);
        const lineItems = [];
        for (let i = 0; i < inputs.items; i++) {
          lineItems.push({ sku: `SIM-${i+1}`, name: `Item ${i+1}`, base_cost: baseCost, quantity: 1 });
        }
        const res = await api.post("/api/commission-engine/calculate-order", {
          order_id: "SIM-PREVIEW",
          line_items: lineItems,
          source_type: inputs.has_affiliate ? "affiliate" : "website",
          affiliate_user_id: inputs.has_affiliate ? "sim-aff" : null,
          assigned_sales_id: inputs.has_sales ? "sim-sales" : null,
          referral_user_id: inputs.has_referral ? "sim-ref" : null,
          wallet_amount: parseFloat(inputs.wallet_amount) || 0,
        });
        setResult(res.data);
      } catch (e) {
        setResult({ error: e?.response?.data?.detail || "Calculation error" });
      }
      setLoading(false);
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [inputs]);

  const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;
  const t = result?.totals;

  return (
    <SettingsSectionCard
      title="Margin Simulator"
      description="Simulate order economics. See full breakdown before making changes. Numbers update live as you type."
    >
      <div className="grid md:grid-cols-[1fr_1.4fr] gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 block">Total Order Value (TZS)</label>
            <input type="number" value={inputs.order_value} onChange={(e) => update("order_value", e.target.value)} placeholder="e.g. 3000000" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-[#20364D] focus:border-[#20364D] outline-none" data-testid="sim-order-value" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 block">Number of Items</label>
            <input type="number" min={1} value={inputs.items} onChange={(e) => update("items", Math.max(1, parseInt(e.target.value) || 1))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-[#20364D] focus:border-[#20364D] outline-none" data-testid="sim-items" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 block">Wallet Usage (TZS)</label>
            <input type="number" value={inputs.wallet_amount} onChange={(e) => update("wallet_amount", e.target.value)} placeholder="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-[#20364D] focus:border-[#20364D] outline-none" data-testid="sim-wallet" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Toggles</label>
            <SimToggle label="Affiliate" checked={inputs.has_affiliate} onChange={(v) => update("has_affiliate", v)} testId="sim-affiliate" />
            <SimToggle label="Referral" checked={inputs.has_referral} onChange={(v) => update("has_referral", v)} testId="sim-referral" />
            <SimToggle label="Sales" checked={inputs.has_sales} onChange={(v) => update("has_sales", v)} testId="sim-sales" />
          </div>
        </div>

        {/* Results */}
        <div>
          {loading && <div className="text-center py-8 text-slate-400 text-sm">Calculating...</div>}
          {!loading && result?.error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{typeof result.error === "string" ? result.error : JSON.stringify(result.error)}</div>
          )}
          {!loading && t && (
            <div className="space-y-3" data-testid="sim-results">
              {/* Main breakdown */}
              <div className="rounded-xl bg-[#20364D]/5 p-4 space-y-2">
                <SimRow label="Vendor Base Cost" value={money(t.base_cost)} bold />
                <SimRow label="Selling Price" value={money(t.selling_price)} bold />
                <div className="border-t border-slate-200 my-2" />
                <SimRow label="Total Margin" value={money(t.total_margin)} />
                <SimRow label="Protected Platform Margin" value={money(t.protected_platform_margin)} accent="emerald" />
                <SimRow label="Distributable Pool" value={money(t.distributable_pool)} accent="blue" />
              </div>

              {/* Allocation breakdown */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Allocations (from distributable pool)</div>
                <SimRow label="Affiliate Commission" value={money(t.affiliate_commission)} active={t.affiliate_commission > 0} />
                <SimRow label="Promotion Budget" value={money(t.promotion_budget)} active={t.promotion_budget > 0} />
                <SimRow label="Sales Commission" value={money(t.sales_commission)} active={t.sales_commission > 0} />
                <SimRow label="Referral Reward" value={money(t.referral_reward)} active={t.referral_reward > 0} />
                <SimRow label="Reserve Buffer" value={money(t.reserve)} active={t.reserve > 0} />
              </div>

              {/* Platform net */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <SimRow label="Platform Net (Protected + Reserve)" value={money((t.protected_platform_margin || 0) + (t.reserve || 0))} bold accent="emerald" />
              </div>

              {/* Wallet validation */}
              {result.wallet_validation && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                  <div><strong>Wallet:</strong> Requested {money(result.wallet_validation.requested_wallet_amount)} → Allowed {money(result.wallet_validation.allowed_wallet_amount)}</div>
                  {result.wallet_validation.was_reduced && <div className="mt-1 text-amber-600">Capped at distributable pool ({money(result.wallet_validation.cap_by_distributable)})</div>}
                </div>
              )}

              {/* Priority rules */}
              {result.priority_rules && (
                <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                  {result.priority_rules.referral_overrides_affiliate && <div>Referral active — affiliate allocation disabled</div>}
                  {result.priority_rules.affiliate_active && <div>Affiliate active</div>}
                  {result.priority_rules.sales_active && <div>Sales commission active</div>}
                </div>
              )}
            </div>
          )}
          {!loading && !result && <div className="text-center py-12 text-slate-400 text-sm">Enter an order value to simulate</div>}
        </div>
      </div>
    </SettingsSectionCard>
  );
}

function SimRow({ label, value, bold, accent, active }) {
  const textColor = accent === "emerald" ? "text-emerald-700" : accent === "blue" ? "text-blue-700" : "text-slate-700";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={`${active === false ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-semibold"} ${active === false ? "text-slate-300" : textColor}`}>{value}</span>
    </div>
  );
}

function SimToggle({ label, checked, onChange, testId }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-slate-300 text-[#20364D] focus:ring-[#20364D]" data-testid={testId} />
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </label>
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

/* ─── Document Numbering Tab ─── */
function DocNumberingTab({ state, setState }) {
  const dn = state.doc_numbering || {};
  const DOC_TYPES = [
    { key: "quote", label: "Quote" },
    { key: "invoice", label: "Invoice" },
    { key: "order", label: "Order" },
    { key: "delivery_note", label: "Delivery Note" },
    { key: "purchase_order", label: "Purchase Order" },
    { key: "sku", label: "SKU" },
  ];
  return (
    <SettingsSectionCard title="Document Numbering" description="Configure numbering for all business documents. Changes apply to new documents only.">
      <div className="space-y-4">
        {DOC_TYPES.map(({ key, label }) => (
          <div key={key} className="grid grid-cols-4 gap-3 items-end p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{label}</div>
              <SettingsTextField label="Prefix" value={dn[`${key}_prefix`] || ""} onChange={(v) => setState(U(state, "doc_numbering", `${key}_prefix`, v))} />
            </div>
            <SettingsSelectField label="Type" value={dn[`${key}_type`] || "sequential"} onChange={(v) => setState(U(state, "doc_numbering", `${key}_type`, v))} options={[{ value: "sequential", label: "Sequential" }, { value: "alphanumeric", label: "Alphanumeric" }]} />
            <SettingsNumberField label="Digits" value={dn[`${key}_digits`] || 5} onChange={(v) => setState(U(state, "doc_numbering", `${key}_digits`, v))} />
            <SettingsNumberField label="Start From" value={dn[`${key}_start`] || 1} onChange={(v) => setState(U(state, "doc_numbering", `${key}_start`, v))} />
          </div>
        ))}
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
          Example: Prefix <strong>KON-QT</strong> + 5 digits from 1 = <strong>KON-QT-00001</strong>
        </div>
      </div>
    </SettingsSectionCard>
  );
}

/* ─── Document Footer Tab ─── */
function DocFooterTab({ state, setState }) {
  const df = state.doc_footer || {};
  const bp = state.business_profile || {};
  const pa = state.payment_accounts || {};
  const previewAddress = bp.business_address || "Business Address";
  const previewEmail = bp.support_email || "email@company.com";
  const previewPhone = bp.support_phone || "+255 XXX XXX XXX";
  const previewTin = bp.tax_id || "TIN-XXXXX";
  const previewBrn = bp.vat_number || "BRN-XXXXX";
  return (
    <SettingsSectionCard title="Document Footer" description="Control what information appears in the footer of all business documents.">
      <div className="space-y-3">
        <SettingsToggleField label="Show company address" checked={df.show_address !== false} onChange={(v) => setState(U(state, "doc_footer", "show_address", v))} />
        <SettingsToggleField label="Show email" checked={df.show_email !== false} onChange={(v) => setState(U(state, "doc_footer", "show_email", v))} />
        <SettingsToggleField label="Show phone" checked={df.show_phone !== false} onChange={(v) => setState(U(state, "doc_footer", "show_phone", v))} />
        <SettingsToggleField label="Show registration info (TIN/BRN)" checked={df.show_registration || false} onChange={(v) => setState(U(state, "doc_footer", "show_registration", v))} />
        <div className="pt-2">
          <SettingsTextField label="Custom Footer Text" value={df.custom_footer_text || ""} onChange={(v) => setState(U(state, "doc_footer", "custom_footer_text", v))} />
          <p className="text-[10px] text-slate-400 mt-1">Optional text shown below all documents (e.g., terms, legal notice)</p>
        </div>
      </div>

      {/* Live Footer Preview */}
      <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden" data-testid="footer-live-preview">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Footer Preview</div>
        </div>
        <div className="bg-white px-6 py-4 text-center">
          <div className="text-xs text-slate-500 mb-2">
            Thank you for your business. Please include the document number as payment reference.
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 flex-wrap">
            {df.show_address !== false && <span>{previewAddress}</span>}
            {df.show_email !== false && <span>{previewEmail}</span>}
            {df.show_phone !== false && <span>{previewPhone}</span>}
          </div>
          {(df.show_registration || false) && (
            <div className="text-[10px] text-slate-400 mt-1">
              TIN: {previewTin} &bull; BRN: {previewBrn}
            </div>
          )}
          {df.custom_footer_text && (
            <div className="text-[10px] text-slate-400 mt-1">{df.custom_footer_text}</div>
          )}
          {!df.show_address && df.show_email === false && df.show_phone === false && !df.show_registration && !df.custom_footer_text && (
            <div className="text-[10px] text-slate-300 italic">All footer fields are hidden</div>
          )}
        </div>
      </div>
    </SettingsSectionCard>
  );
}

/* ─── Document Template Tab ─── */
function DocTemplateTab({ state, setState }) {
  const dt = state.doc_template || {};
  const TEMPLATES = [
    {
      value: "classic",
      label: "Classic Corporate",
      desc: "Formal layout with strong header and structured sections",
      headerBg: "#20364D",
      accentColor: "#20364D",
      borderColor: "#e2e8f0",
    },
    {
      value: "modern",
      label: "Modern Clean",
      desc: "Lighter spacing, modern typography, minimalist feel",
      headerBg: "#0f172a",
      accentColor: "#0f172a",
      borderColor: "#e2e8f0",
    },
    {
      value: "compact",
      label: "Compact Commercial",
      desc: "Tighter layout, optimized for longer item lists",
      headerBg: "#1e293b",
      accentColor: "#1e293b",
      borderColor: "#e2e8f0",
    },
    {
      value: "premium",
      label: "Premium Branded",
      desc: "Stronger brand presence with gold accents",
      headerBg: "#20364D",
      accentColor: "#D4A843",
      borderColor: "#D4A843",
    },
  ];
  return (
    <SettingsSectionCard title="Document Template" description="Select the layout style used for all business documents. Changes apply to all document previews and PDF exports.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((t) => {
          const active = (dt.selected_template || "classic") === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setState(U(state, "doc_template", "selected_template", t.value))}
              className={`text-left rounded-xl border-2 overflow-hidden transition-all ${active ? "border-[#20364D] shadow-md" : "border-slate-200 hover:border-slate-300"}`}
              data-testid={`template-${t.value}`}
            >
              {/* Mini template preview */}
              <div className="relative">
                <div style={{ background: t.headerBg, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ width: 40, height: 6, background: "rgba(255,255,255,0.3)", borderRadius: 3, marginBottom: 4 }} />
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>INVOICE</div>
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", textAlign: "right" }}>
                    <div>INV-2026-001</div>
                    <div style={{ display: "inline-block", padding: "1px 6px", borderRadius: 3, fontSize: 7, background: "rgba(255,255,255,0.2)", marginTop: 2 }}>DRAFT</div>
                  </div>
                </div>
                <div style={{ padding: "8px 14px", display: "flex", gap: 12, fontSize: 7, color: "#64748b" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#94a3b8", fontSize: 6, textTransform: "uppercase", marginBottom: 2 }}>From</div>
                    <div style={{ fontWeight: 600, color: t.accentColor, fontSize: 8 }}>Company Ltd</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#94a3b8", fontSize: 6, textTransform: "uppercase", marginBottom: 2 }}>Bill To</div>
                    <div style={{ fontWeight: 600, color: t.accentColor, fontSize: 8 }}>Client Corp</div>
                  </div>
                </div>
                {/* Mini table */}
                <div style={{ padding: "0 14px 6px" }}>
                  <div style={{ borderTop: `1px solid ${t.borderColor}`, borderBottom: `1px solid ${t.borderColor}`, padding: "3px 0", display: "flex", justifyContent: "space-between", fontSize: 6, color: "#94a3b8" }}>
                    <span>Description</span><span>Total</span>
                  </div>
                  {[1, 2].map((r) => (
                    <div key={r} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 6, color: "#475569" }}>
                      <div style={{ width: 50, height: 3, background: "#e2e8f0", borderRadius: 2, marginTop: 2 }} />
                      <div style={{ width: 20, height: 3, background: "#e2e8f0", borderRadius: 2, marginTop: 2 }} />
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${t.accentColor}`, marginTop: 3, paddingTop: 3, display: "flex", justifyContent: "space-between", fontSize: 7, fontWeight: 700, color: t.accentColor }}>
                    <span>Total</span><span>TZS 250,000</span>
                  </div>
                </div>
              </div>
              {/* Label area */}
              <div className="p-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${active ? "text-[#20364D]" : "text-slate-700"}`}>{t.label}</span>
                  {active && <span className="text-[10px] font-bold text-[#D4A843] uppercase">Active</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </SettingsSectionCard>
  );
}



/* ═══ CATALOG: UNITS OF MEASUREMENT ═══ */
function CatalogUnitsTab({ state, setState }) {
  const catalog = state.catalog || {};
  const units = catalog.units_of_measurement || [];
  const [newUnit, setNewUnit] = useState({ name: "", abbr: "", type: "count" });

  const UNIT_TYPES = ["count", "weight", "volume", "length", "service", "custom"];

  const addUnit = () => {
    if (!newUnit.name.trim() || !newUnit.abbr.trim()) return;
    if (units.some((u) => u.name.toLowerCase() === newUnit.name.trim().toLowerCase())) {
      toast.error("Unit already exists");
      return;
    }
    const updated = [...units, { ...newUnit, name: newUnit.name.trim(), abbr: newUnit.abbr.trim(), active: true }];
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, units_of_measurement: updated } }));
    setNewUnit({ name: "", abbr: "", type: "count" });
    toast.success("Unit added — save settings to persist");
  };

  const toggleUnit = (idx) => {
    const updated = [...units];
    updated[idx] = { ...updated[idx], active: !updated[idx].active };
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, units_of_measurement: updated } }));
  };

  const removeUnit = (idx) => {
    const updated = units.filter((_, i) => i !== idx);
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, units_of_measurement: updated } }));
  };

  return (
    <>
      <SettingsSectionCard title="Units of Measurement" description="Configure the units available for products. Used in the product wizard, stock tables, invoices, and checkout.">
        <div className="space-y-3">
          {units.map((u, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border transition ${u.active !== false ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60"}`} data-testid={`unit-row-${i}`}>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[#20364D]">{u.name}</span>
                <span className="text-xs text-slate-400 ml-2">({u.abbr})</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">{u.type}</span>
              <button onClick={() => toggleUnit(i)} className={`text-xs font-semibold px-2 py-1 rounded-lg transition ${u.active !== false ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`} data-testid={`toggle-unit-${i}`}>
                {u.active !== false ? "Active" : "Inactive"}
              </button>
              <button onClick={() => removeUnit(i)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition" data-testid={`remove-unit-${i}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Add New Unit" description="Add a custom unit to the catalog.">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Unit Name *</label>
            <input type="text" value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} placeholder="e.g. Barrel" className="h-9 rounded-lg border border-slate-200 px-3 text-sm w-40" data-testid="new-unit-name" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Abbreviation *</label>
            <input type="text" value={newUnit.abbr} onChange={(e) => setNewUnit({ ...newUnit, abbr: e.target.value })} placeholder="e.g. bbl" className="h-9 rounded-lg border border-slate-200 px-3 text-sm w-24" data-testid="new-unit-abbr" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Type</label>
            <select value={newUnit.type} onChange={(e) => setNewUnit({ ...newUnit, type: e.target.value })} className="h-9 rounded-lg border border-slate-200 px-3 text-sm" data-testid="new-unit-type">
              {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={addUnit} disabled={!newUnit.name.trim() || !newUnit.abbr.trim()} className="h-9 px-4 rounded-lg bg-[#20364D] text-white text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-40 transition flex items-center gap-1.5" data-testid="add-unit-btn">
            <Plus className="w-3.5 h-3.5" /> Add Unit
          </button>
        </div>
      </SettingsSectionCard>
    </>
  );
}

/* ═══ CATALOG: PRODUCT CATEGORIES (RICH) ═══ */
function CatalogCategoriesTab({ state, setState }) {
  const catalog = state.catalog || {};
  const rawCategories = catalog.product_categories || [];
  // Normalize: support legacy strings and new rich objects
  const categories = rawCategories.map((c) => typeof c === "string" ? { name: c, display_mode: "visual", commercial_mode: "fixed_price", sourcing_mode: "preferred", show_on_marketplace: true, require_images: true, quote_enabled: false, search_first: false, active: true, sort_order: 0 } : c);

  const [editIdx, setEditIdx] = useState(null);
  const [newCat, setNewCat] = useState("");

  const updateCategory = (idx, field, value) => {
    const updated = [...categories];
    updated[idx] = { ...updated[idx], [field]: value };
    // Auto-set derived fields based on display mode
    if (field === "display_mode") {
      if (value === "list_quote") {
        updated[idx].require_images = false;
        updated[idx].search_first = true;
        updated[idx].quote_enabled = true;
      } else {
        updated[idx].require_images = true;
        updated[idx].search_first = false;
      }
    }
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, product_categories: updated } }));
  };

  const addCategory = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) { toast.error("Exists"); return; }
    const updated = [...categories, { name: trimmed, display_mode: "visual", commercial_mode: "fixed_price", sourcing_mode: "preferred", show_on_marketplace: true, require_images: true, quote_enabled: false, search_first: false, active: true, sort_order: categories.length }];
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, product_categories: updated } }));
    setNewCat("");
    toast.success("Category added — save to persist");
  };

  const removeCategory = (idx) => {
    const updated = categories.filter((_, i) => i !== idx);
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, product_categories: updated } }));
  };

  const MODE_INFO = {
    visual: { label: "Visual Catalog", desc: "Image-based product cards in marketplace. Customers browse visually.", example: "Office Supplies, Stationery, Promotional Items" },
    list_quote: { label: "List & Quote", desc: "Search-first list view. Customers select items, enter quantity, request quote.", example: "Printing Services, Medical Supplies, Bulk Orders" },
  };
  const COMMERCIAL_INFO = {
    fixed_price: { label: "Fixed Price", desc: "Customers see prices immediately and can buy directly." },
    request_quote: { label: "Request Quote", desc: "Customers must request pricing. No price shown upfront." },
    hybrid: { label: "Hybrid", desc: "Indicative pricing shown, but customers can still request quotes for bulk/custom." },
  };
  const SOURCING_INFO = {
    preferred: { label: "Single Sourcing", desc: "All requests go to one preferred vendor. Faster processing." },
    competitive: { label: "Competitive", desc: "Requests sent to multiple vendors. System selects best price." },
  };

  return (
    <>
      <SettingsSectionCard title="Product Categories" description="Configure how each category appears and behaves across the platform. Click a category to expand its configuration.">
        <div className="space-y-2">
          {categories.map((cat, i) => (
            <div key={i} className={`rounded-xl border transition ${editIdx === i ? "border-[#D4A843] bg-[#D4A843]/5" : "border-slate-200 bg-white hover:border-slate-300"}`} data-testid={`category-${i}`}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setEditIdx(editIdx === i ? null : i)}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cat.active !== false ? "bg-emerald-500" : "bg-slate-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#20364D]">{cat.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{MODE_INFO[cat.display_mode]?.label || "Visual"}</span>
                    <span>\u2022</span>
                    <span>{COMMERCIAL_INFO[cat.commercial_mode]?.label || "Fixed Price"}</span>
                    <span>\u2022</span>
                    <span>{SOURCING_INFO[cat.sourcing_mode]?.label || "Single"}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 px-2">{cat.active !== false ? "Active" : "Inactive"}</span>
              </div>

              {editIdx === i && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3" data-testid={`cat-config-${i}`}>
                  {/* Display Mode */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Display Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(MODE_INFO).map(([key, info]) => (
                        <label key={key} className={`rounded-lg border p-3 cursor-pointer transition ${cat.display_mode === key ? "border-[#20364D] bg-[#20364D]/5" : "border-slate-200 hover:border-slate-300"}`}>
                          <input type="radio" name={`dm-${i}`} checked={cat.display_mode === key} onChange={() => updateCategory(i, "display_mode", key)} className="sr-only" />
                          <div className="text-xs font-semibold text-[#20364D]">{info.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{info.desc}</div>
                          <div className="text-[10px] text-slate-400 italic mt-1">e.g. {info.example}</div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Commercial Mode */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Pricing Behavior</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(COMMERCIAL_INFO).map(([key, info]) => (
                        <label key={key} className={`rounded-lg border p-2.5 cursor-pointer transition ${cat.commercial_mode === key ? "border-[#20364D] bg-[#20364D]/5" : "border-slate-200 hover:border-slate-300"}`}>
                          <input type="radio" name={`cm-${i}`} checked={cat.commercial_mode === key} onChange={() => updateCategory(i, "commercial_mode", key)} className="sr-only" />
                          <div className="text-xs font-semibold text-[#20364D]">{info.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{info.desc}</div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sourcing Mode */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Vendor Sourcing</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(SOURCING_INFO).map(([key, info]) => (
                        <label key={key} className={`rounded-lg border p-2.5 cursor-pointer transition ${cat.sourcing_mode === key ? "border-[#20364D] bg-[#20364D]/5" : "border-slate-200 hover:border-slate-300"}`}>
                          <input type="radio" name={`sm-${i}`} checked={cat.sourcing_mode === key} onChange={() => updateCategory(i, "sourcing_mode", key)} className="sr-only" />
                          <div className="text-xs font-semibold text-[#20364D]">{info.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{info.desc}</div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: "show_on_marketplace", label: "Show in Marketplace" },
                      { key: "require_images", label: "Require Images" },
                      { key: "quote_enabled", label: "Quote Flow Enabled" },
                      { key: "active", label: "Active" },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={cat[key] !== false} onChange={(e) => updateCategory(i, key, e.target.checked)} className="rounded border-slate-300" data-testid={`cat-${i}-${key}`} />
                        <span className="text-xs text-slate-600">{label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Subcategories */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Subcategories</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(cat.subcategories || []).map((sub, si) => (
                        <span key={si} className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          {sub}
                          <button onClick={() => {
                            const updated = [...(cat.subcategories || [])];
                            updated.splice(si, 1);
                            updateCategory(i, "subcategories", updated);
                          }} className="text-slate-400 hover:text-red-500">&times;</button>
                        </span>
                      ))}
                      {(!cat.subcategories || cat.subcategories.length === 0) && <span className="text-xs text-slate-400">No subcategories</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add subcategory..."
                        className="h-8 rounded-lg border border-slate-200 px-3 text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.target.value.trim()) {
                            const subs = [...(cat.subcategories || []), e.target.value.trim()];
                            updateCategory(i, "subcategories", subs);
                            e.target.value = "";
                          }
                        }}
                        data-testid={`cat-${i}-add-subcategory`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-slate-400">No categories configured</p>}
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Add Category" description="Add a new product category. Configure its behavior after adding.">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Category Name *</label>
            <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }} placeholder="e.g. Medical Supplies" className="h-9 rounded-lg border border-slate-200 px-3 text-sm w-64" data-testid="new-category-input" />
          </div>
          <button onClick={addCategory} disabled={!newCat.trim()} className="h-9 px-4 rounded-lg bg-[#20364D] text-white text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-40 transition flex items-center gap-1.5" data-testid="add-category-btn">
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>
      </SettingsSectionCard>
    </>
  );
}

/* ═══ CATALOG: VARIANT TYPES ═══ */
function CatalogVariantsTab({ state, setState }) {
  const catalog = state.catalog || {};
  const types = catalog.variant_types || [];
  const [newType, setNewType] = useState("");

  const addType = () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (types.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Variant type already exists");
      return;
    }
    const updated = [...types, trimmed];
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, variant_types: updated } }));
    setNewType("");
    toast.success("Variant type added — save settings to persist");
  };

  const removeType = (idx) => {
    const updated = types.filter((_, i) => i !== idx);
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, variant_types: updated } }));
  };

  return (
    <>
      <SettingsSectionCard title="Variant Types" description="Variant dimensions available when creating product variants (max 2 per product).">
        <div className="flex flex-wrap gap-2">
          {types.map((vt, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm" data-testid={`variant-type-${i}`}>
              <span className="font-medium text-[#20364D]">{vt}</span>
              <button onClick={() => removeType(i)} className="text-slate-400 hover:text-red-500 transition" data-testid={`remove-vt-${i}`}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {types.length === 0 && <p className="text-sm text-slate-400">No variant types configured</p>}
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Add Variant Type" description="Add a new variant dimension.">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Type Name *</label>
            <input
              type="text"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addType(); }}
              placeholder="e.g. Finish, Pattern"
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm w-48"
              data-testid="new-variant-type-input"
            />
          </div>
          <button onClick={addType} disabled={!newType.trim()} className="h-9 px-4 rounded-lg bg-[#20364D] text-white text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-40 transition flex items-center gap-1.5" data-testid="add-variant-type-btn">
            <Plus className="w-3.5 h-3.5" /> Add Type
          </button>
        </div>
      </SettingsSectionCard>
    </>
  );
}

/* ═══ CATALOG: SKU CONFIGURATION ═══ */
function CatalogSkuTab({ state, setState }) {
  const catalog = state.catalog || {};

  const updateCatalog = (field, value) => {
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, [field]: value } }));
  };

  const exampleSku = (catalog.sku_format || "{PREFIX}-{CATEGORY}-{RANDOM}")
    .replace("{PREFIX}", catalog.sku_prefix || "KNT")
    .replace("{COUNTRY}", state.payment_accounts?.default_country || "TZ")
    .replace("{CATEGORY}", "ELC")
    .replace("{PRODUCT}", "TV")
    .replace("{VARIANT}", "BLK")
    .replace("{RANDOM}", Math.floor(1000 + Math.random() * 9000).toString())
    .replace("{DATE}", new Date().toISOString().slice(2, 10).replace(/-/g, ""));

  return (
    <>
      <SettingsSectionCard title="SKU Format" description="Configure how product SKUs are auto-generated. Variables: {PREFIX}, {COUNTRY}, {CATEGORY}, {PRODUCT}, {VARIANT}, {RANDOM}, {DATE}">
        <div className="grid md:grid-cols-2 gap-4">
          <SettingsTextField label="SKU Prefix" value={catalog.sku_prefix || "KNT"} onChange={(v) => updateCatalog("sku_prefix", v)} />
          <SettingsTextField label="SKU Format Pattern" value={catalog.sku_format || "{PREFIX}-{CATEGORY}-{RANDOM}"} onChange={(v) => updateCatalog("sku_format", v)} />
        </div>
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Example SKU Output</p>
          <p className="text-sm font-mono font-bold text-[#20364D]" data-testid="sku-preview">{exampleSku}</p>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <strong>Available variables:</strong> {"{PREFIX}"} = SKU Prefix, {"{COUNTRY}"} = Country Code, {"{CATEGORY}"} = Category short code, {"{PRODUCT}"} = Product code, {"{VARIANT}"} = Variant code, {"{RANDOM}"} = Unique number, {"{DATE}"} = Date (YYMMDD)
        </div>
      </SettingsSectionCard>
    </>
  );
}


/* ═══ VENDOR OPS: SOURCING STRATEGY ═══ */
function VendorOpsSettingsTab({ state, setState }) {
  const vo = state.vendor_ops || {};

  const updateVO = (field, value) => {
    setState((prev) => ({ ...prev, vendor_ops: { ...prev.vendor_ops, [field]: value } }));
  };

  return (
    <>
      <SettingsSectionCard title="Default Sourcing Strategy" description="Control how price requests are routed to vendors.">
        <div className="grid md:grid-cols-2 gap-4">
          <SettingsSelectField label="Default Sourcing Mode" value={vo.default_sourcing_mode || "preferred"} onChange={(v) => updateVO("default_sourcing_mode", v)} options={[{ value: "preferred", label: "Preferred Vendor" }, { value: "competitive", label: "Competitive Quoting" }]} />
          <SettingsNumberField label="Max Vendors per Request" value={vo.max_vendors_per_request || 3} onChange={(v) => updateVO("max_vendors_per_request", v)} />
        </div>
        <div className="mt-3 p-3 rounded-xl bg-slate-50 text-xs text-slate-500">
          <strong>Preferred Vendor</strong>: Requests go to one assigned vendor. Fast, controlled.
          <br /><strong>Competitive Quoting</strong>: Requests go to multiple vendors. System recommends best price.
        </div>
      </SettingsSectionCard>
      <SettingsSectionCard title="Quote & Lead Time Defaults" description="Default values auto-fill when entering vendor quotes.">
        <div className="grid md:grid-cols-2 gap-4">
          <SettingsNumberField label="Default Quote Expiry (hours)" value={vo.default_quote_expiry_hours || 48} onChange={(v) => updateVO("default_quote_expiry_hours", v)} />
          <SettingsNumberField label="Default Lead Time (days)" value={vo.default_lead_time_days || 3} onChange={(v) => updateVO("default_lead_time_days", v)} />
          <SettingsToggleField label="Auto-select best quote (lowest price)" checked={vo.auto_select_best_quote !== false} onChange={(v) => updateVO("auto_select_best_quote", v)} />
        </div>
      </SettingsSectionCard>
    </>
  );
}

/* ═══ CATEGORY CONFIGURATION TAB (moved from Catalog Workspace) ═══ */
function CategoryConfigTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/api/admin/catalog-workspace/stats")
      .then((r) => setCategories(r.data?.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-8 text-slate-400">Loading categories...</div>;

  return (
    <div className="space-y-3" data-testid="category-config-settings">
      <SettingsSectionCard title="Category Configuration" description="Configure display mode, pricing behavior, and sourcing strategy for each product category. These settings control how customers interact with each category.">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No categories configured. Add categories in Product Categories tab first.</div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat, i) => (
              <CategoryConfigRow key={cat.name || i} cat={cat} onSaved={load} />
            ))}
          </div>
        )}
      </SettingsSectionCard>
    </div>
  );
}

function CategoryConfigRow({ cat, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState({ ...cat });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const upd = (k, v) => { setLocal((p) => ({ ...p, [k]: v })); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/catalog-workspace/categories/${encodeURIComponent(cat.name)}`, {
        display_mode: local.display_mode,
        commercial_mode: local.commercial_mode,
        sourcing_mode: local.sourcing_mode,
        category_type: local.category_type,
        allow_custom_items: local.allow_custom_items,
        require_description: local.require_description,
        show_price_in_list: local.show_price_in_list,
        multi_item_request: local.multi_item_request,
        search_first: local.search_first,
        requires_site_visit: local.requires_site_visit,
        site_visit_optional: local.site_visit_optional,
        installment_payments: local.installment_payments,
        installment_split: local.installment_split,
        related_services: local.related_services,
        subcategories: local.subcategories,
      });
      setDirty(false);
      onSaved?.();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const MODES = { visual: "Visual", list_quote: "List & Quote" };
  const COMMERCIAL = { fixed_price: "Fixed Price", request_quote: "Request Quote", hybrid: "Hybrid" };
  const SOURCING = { preferred: "Single Vendor", competitive: "Competitive" };

  return (
    <div className={`rounded-xl border ${expanded ? "border-[#D4A843]/30 shadow-sm" : ""}`} data-testid={`cat-cfg-${cat.name?.replace(/\s/g, "-")}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-3 flex items-center justify-between text-left">
        <div>
          <span className="text-sm font-semibold text-[#20364D]">{cat.name}</span>
          <div className="flex gap-1 mt-1 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">{local.category_type === "service" ? "Service" : "Product"}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{MODES[local.display_mode] || "Visual"}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">{COMMERCIAL[local.commercial_mode] || "Fixed Price"}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{SOURCING[local.sourcing_mode] || "Single"}</span>
            {local.requires_site_visit && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600">Site Visit</span>}
            {local.installment_payments && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-600">Installments</span>}
            {dirty && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Unsaved</span>}
          </div>
        </div>
        <span className="text-slate-400 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t pt-3 space-y-3">
          {/* Core */}
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Category Type</label>
              <select value={local.category_type || "product"} onChange={(e) => upd("category_type", e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Display Mode</label>
              <select value={local.display_mode || "visual"} onChange={(e) => upd("display_mode", e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="visual">Visual Catalog (image cards)</option>
                <option value="list_quote">List & Quote (search-based)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Commercial Mode</label>
              <select value={local.commercial_mode || "fixed_price"} onChange={(e) => upd("commercial_mode", e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="fixed_price">Fixed Price</option>
                <option value="request_quote">Request Quote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Sourcing Mode</label>
              <select value={local.sourcing_mode || "preferred"} onChange={(e) => upd("sourcing_mode", e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="preferred">Single Vendor</option>
                <option value="competitive">Competitive</option>
              </select>
            </div>
          </div>
          {/* Toggles */}
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              ["allow_custom_items", "Allow Custom Items", "Users can add items not in the list"],
              ["require_description", "Require Description", "Users must describe specifications"],
              ["show_price_in_list", "Show Price in List", "Display prices in item list"],
              ["multi_item_request", "Multi-item Request", "Multiple items in one quote"],
              ["search_first", "Search-first Mode", "Prioritize search over browsing"],
              ["requires_site_visit", "Requires Site Visit", "Service requires on-site assessment before quoting"],
              ["site_visit_optional", "Site Visit Optional", "User can choose whether site visit is needed"],
              ["installment_payments", "Allow Installment Payments", "Split payment (e.g., 60% upfront, 40% on delivery)"],
            ].map(([key, label, help]) => (
              <label key={key} className="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" checked={local[key] ?? (key === "show_price_in_list" || key === "multi_item_request")} onChange={(e) => upd(key, e.target.checked)} className="rounded" />
                <div><div className="text-xs font-medium">{label}</div><div className="text-[10px] text-slate-400">{help}</div></div>
              </label>
            ))}
          </div>
          {/* Fulfillment type */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Fulfillment Type</label>
            <select value={local.fulfillment_type || "delivery_pickup"} onChange={(e) => upd("fulfillment_type", e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white">
              <option value="delivery_pickup">Delivery or Pickup</option>
              <option value="delivery_only">Delivery Only</option>
              <option value="pickup_only">Pickup Only</option>
              <option value="digital">Digital / Non-physical</option>
              <option value="on_site">On-site Service</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-0.5">How this category's orders are fulfilled</p>
          </div>
          {/* Installment split */}
          {local.installment_payments && (
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Installment Split</label>
              <select value={local.installment_split || "60/40"} onChange={(e) => upd("installment_split", e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="50/50">50% upfront / 50% on delivery</option>
                <option value="60/40">60% upfront / 40% on delivery</option>
                <option value="70/30">70% upfront / 30% on delivery</option>
                <option value="100/0">100% upfront (full payment)</option>
              </select>
            </div>
          )}
          {/* Related Services (product→service cross-sell) */}
          {local.category_type === "product" && (
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Related Customization Services</label>
              <p className="text-[10px] text-slate-400 mb-1">Link to service categories for "Customize this" CTA on products</p>
              <input type="text" placeholder="Type service category name + Enter..." className="w-full border rounded-lg px-3 py-2 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { upd("related_services", [...(local.related_services || []), e.target.value.trim()]); e.target.value = ""; } }}
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {(local.related_services || []).map((s, si) => (
                  <span key={si} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded flex items-center gap-1">
                    {s} <button onClick={() => { const rs = [...(local.related_services || [])]; rs.splice(si, 1); upd("related_services", rs); }} className="text-purple-400 hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Subcategories */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Subcategories</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(local.subcategories || []).map((sub, si) => (
                <span key={si} className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  {sub} <button onClick={() => { const u = [...(local.subcategories || [])]; u.splice(si, 1); upd("subcategories", u); }} className="text-slate-400 hover:text-red-500">&times;</button>
                </span>
              ))}
              {(!local.subcategories || local.subcategories.length === 0) && <span className="text-xs text-slate-400">No subcategories</span>}
            </div>
            <input type="text" placeholder="Add subcategory + Enter" className="h-8 rounded-lg border px-3 text-xs w-full" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { upd("subcategories", [...(local.subcategories || []), e.target.value.trim()]); e.target.value = ""; } }} />
          </div>
          <div className="flex justify-end">
            <button onClick={save} disabled={!dirty || saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#D4A843] text-[#17283C] hover:bg-[#c49a3d] disabled:opacity-40" data-testid={`save-cat-${cat.name?.replace(/\s/g, "-")}`}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function CountriesTab({ state, setState }) {
  const countries = state.countries || {};
  const available = countries.available_countries || [
    { code: "TZ", name: "Tanzania", currency: "TZS", currency_symbol: "TSh", timezone: "Africa/Dar_es_Salaam", vat_rate: 18, phone_prefix: "+255", doc_prefix_code: "TZ" },
    { code: "KE", name: "Kenya", currency: "KES", currency_symbol: "KSh", timezone: "Africa/Nairobi", vat_rate: 16, phone_prefix: "+254", doc_prefix_code: "KE" },
    { code: "UG", name: "Uganda", currency: "UGX", currency_symbol: "USh", timezone: "Africa/Kampala", vat_rate: 18, phone_prefix: "+256", doc_prefix_code: "UG" },
  ];
  const activeCountry = countries.active_country || "TZ";

  const updateCountry = (idx, field, value) => {
    const updated = [...available];
    updated[idx] = { ...updated[idx], [field]: value };
    setState({ ...state, countries: { ...countries, available_countries: updated, active_country: activeCountry } });
  };

  return (
    <>
      <SettingsSectionCard title="Countries & Markets" description="Configure countries for multi-market expansion. Each country has its own currency, tax rate, phone prefix, and document code. Clone settings from existing country when expanding.">
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-500 uppercase">Active Country</label>
          <select value={activeCountry} onChange={(e) => setState({ ...state, countries: { ...countries, active_country: e.target.value } })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white" data-testid="active-country-select">
            {available.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">This determines the default currency, tax rate, and document prefixes for new records.</p>
        </div>
        <div className="space-y-3">
          {available.map((c, idx) => (
            <div key={c.code} className={`rounded-xl border p-4 ${c.code === activeCountry ? "border-[#D4A843]/30 bg-[#D4A843]/5" : ""}`} data-testid={`country-${c.code}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.code === "TZ" ? "🇹🇿" : c.code === "KE" ? "🇰🇪" : c.code === "UG" ? "🇺🇬" : "🌍"}</span>
                  <span className="text-sm font-bold text-[#20364D]">{c.name}</span>
                  {c.code === activeCountry && <span className="text-[9px] bg-[#D4A843] text-[#17283C] px-2 py-0.5 rounded font-semibold">Active</span>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><label className="text-[10px] text-slate-500">Currency</label><SettingsTextField value={c.currency} onChange={(v) => updateCountry(idx, "currency", v)} /></div>
                <div><label className="text-[10px] text-slate-500">Symbol</label><SettingsTextField value={c.currency_symbol} onChange={(v) => updateCountry(idx, "currency_symbol", v)} /></div>
                <div><label className="text-[10px] text-slate-500">VAT Rate %</label><SettingsNumberField value={c.vat_rate} onChange={(v) => updateCountry(idx, "vat_rate", v)} /></div>
                <div><label className="text-[10px] text-slate-500">Phone Prefix</label><SettingsTextField value={c.phone_prefix} onChange={(v) => updateCountry(idx, "phone_prefix", v)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div><label className="text-[10px] text-slate-500">Doc Prefix</label><SettingsTextField value={c.doc_prefix_code} onChange={(v) => updateCountry(idx, "doc_prefix_code", v)} /></div>
                <div><label className="text-[10px] text-slate-500">Timezone</label><SettingsTextField value={c.timezone} onChange={(v) => updateCountry(idx, "timezone", v)} /></div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-3">To expand to a new country: add it here, set country-specific details, then switch active country. All new documents will use the active country's settings.</p>
      </SettingsSectionCard>
    </>
  );
}



function NumberFormatTab({ state, setState }) {
  const nf = state.number_format || {};
  return (
    <SettingsSectionCard title="Number & Currency Formatting" description="Controls how numbers, prices, and currencies are displayed across the entire system.">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SettingsSelectField
          label="Thousand Separator"
          value={nf.thousand_separator || "comma"}
          onChange={(v) => setState(U(state, "number_format", "thousand_separator", v))}
          options={[
            { value: "comma", label: "Comma (1,000,000)" },
            { value: "period", label: "Period (1.000.000)" },
            { value: "space", label: "Space (1 000 000)" },
            { value: "none", label: "None (1000000)" },
          ]}
        />
        <SettingsSelectField
          label="Decimal Separator"
          value={nf.decimal_separator || "period"}
          onChange={(v) => setState(U(state, "number_format", "decimal_separator", v))}
          options={[
            { value: "period", label: "Period (1,000.50)" },
            { value: "comma", label: "Comma (1.000,50)" },
          ]}
        />
        <SettingsSelectField
          label="Decimal Places (Prices)"
          value={nf.decimal_places ?? "0"}
          onChange={(v) => setState(U(state, "number_format", "decimal_places", v))}
          options={[
            { value: "0", label: "None (1,000)" },
            { value: "2", label: "Two (1,000.00)" },
          ]}
        />
        <SettingsSelectField
          label="Currency Position"
          value={nf.currency_position || "before"}
          onChange={(v) => setState(U(state, "number_format", "currency_position", v))}
          options={[
            { value: "before", label: "Before (TZS 1,000)" },
            { value: "after", label: "After (1,000 TZS)" },
          ]}
        />
        <SettingsSelectField
          label="Currency Symbol"
          value={nf.currency_symbol || "TZS"}
          onChange={(v) => setState(U(state, "number_format", "currency_symbol", v))}
          options={[
            { value: "TZS", label: "TZS (Tanzania Shilling)" },
            { value: "KES", label: "KES (Kenya Shilling)" },
            { value: "UGX", label: "UGX (Uganda Shilling)" },
            { value: "USD", label: "USD (US Dollar)" },
          ]}
        />
        <SettingsToggleField
          label="Show currency on all amounts"
          checked={nf.show_currency !== false}
          onChange={(v) => setState(U(state, "number_format", "show_currency", v))}
        />
      </div>
      <div className="mt-4 p-4 rounded-xl bg-slate-50 border">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preview</label>
        <div className="mt-2 text-lg font-bold text-[#20364D]">
          {(() => {
            const sep = nf.thousand_separator === "period" ? "." : nf.thousand_separator === "space" ? " " : nf.thousand_separator === "none" ? "" : ",";
            const dec = nf.decimal_separator === "comma" ? "," : ".";
            const dp = parseInt(nf.decimal_places || "0");
            const sym = nf.currency_symbol || "TZS";
            const num = "1" + sep + "234" + sep + "567" + (dp > 0 ? dec + "00" : "");
            return nf.currency_position === "after" ? `${num} ${sym}` : `${sym} ${num}`;
          })()}
        </div>
        <p className="text-xs text-slate-500 mt-1">This is how amounts will display across the system</p>
      </div>
    </SettingsSectionCard>
  );
}
