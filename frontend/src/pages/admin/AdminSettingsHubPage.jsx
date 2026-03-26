import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import SettingsSectionCard from "../../components/admin/settings/SettingsSectionCard";
import SettingsNumberField from "../../components/admin/settings/SettingsNumberField";
import SettingsToggleField from "../../components/admin/settings/SettingsToggleField";
import SettingsSelectField from "../../components/admin/settings/SettingsSelectField";
import SettingsTextField from "../../components/admin/settings/SettingsTextField";
import InvoiceBrandingSettings from "../../components/admin/settings/InvoiceBrandingSettings";

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
};

export default function AdminSettingsHubPage() {
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    api.get("/api/admin/settings-hub").then((res) => setState((prev) => ({ ...prev, ...(res.data || {}) })));
  }, []);

  const save = async () => {
    await api.put("/api/admin/settings-hub", state);
    alert("Settings saved successfully.");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-4xl font-bold text-[#20364D]">Admin Settings Hub</div>
          <div className="text-slate-600 mt-2">Manage all go-live defaults from one easy-to-understand place.</div>
        </div>
        <button onClick={save} className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">Save All Settings</button>
      </div>

      <SettingsSectionCard title="Commercial Rules" description="Core company protection and distribution settings.">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <SettingsNumberField label="Minimum Company Margin %" value={state.commercial.minimum_company_margin_percent} onChange={(v) => setState({ ...state, commercial: { ...state.commercial, minimum_company_margin_percent: v } })} />
          <SettingsNumberField label="Distribution Layer %" value={state.commercial.distribution_layer_percent} onChange={(v) => setState({ ...state, commercial: { ...state.commercial, distribution_layer_percent: v } })} />
          <SettingsNumberField label="VAT %" value={state.commercial.vat_percent} onChange={(v) => setState({ ...state, commercial: { ...state.commercial, vat_percent: v } })} />
          <SettingsSelectField label="Commission Mode" value={state.commercial.commission_mode} onChange={(v) => setState({ ...state, commercial: { ...state.commercial, commission_mode: v } })} options={[{ value: "fair_balanced", label: "Fair Balanced" }, { value: "sales_priority", label: "Sales Priority" }, { value: "affiliate_priority", label: "Affiliate Priority" }, { value: "fixed_split", label: "Fixed Split" }]} />
          <SettingsToggleField label="Affiliate attribution reduces sales commission" checked={state.commercial.affiliate_attribution_reduces_sales_commission} onChange={(v) => setState({ ...state, commercial: { ...state.commercial, affiliate_attribution_reduces_sales_commission: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Margin Rules" description="Control margin overrides across products and services.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SettingsToggleField label="Allow product group margin override" checked={state.margin_rules.allow_product_group_margin_override} onChange={(v) => setState({ ...state, margin_rules: { ...state.margin_rules, allow_product_group_margin_override: v } })} />
          <SettingsToggleField label="Allow product margin override" checked={state.margin_rules.allow_product_margin_override} onChange={(v) => setState({ ...state, margin_rules: { ...state.margin_rules, allow_product_margin_override: v } })} />
          <SettingsToggleField label="Allow service group margin override" checked={state.margin_rules.allow_service_group_margin_override} onChange={(v) => setState({ ...state, margin_rules: { ...state.margin_rules, allow_service_group_margin_override: v } })} />
          <SettingsToggleField label="Allow service margin override" checked={state.margin_rules.allow_service_margin_override} onChange={(v) => setState({ ...state, margin_rules: { ...state.margin_rules, allow_service_margin_override: v } })} />
          <SettingsToggleField label="Pricing below minimum margin requires admin override" checked={state.margin_rules.pricing_below_minimum_margin_requires_admin_override} onChange={(v) => setState({ ...state, margin_rules: { ...state.margin_rules, pricing_below_minimum_margin_requires_admin_override: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Promotions" description="Safe public and affiliate campaign controls.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsSelectField label="Default Promo Type" value={state.promotions.default_promo_type} onChange={(v) => setState({ ...state, promotions: { ...state.promotions, default_promo_type: v } })} options={[{ value: "safe_distribution", label: "Safe / Distribution Based" }, { value: "margin_touching", label: "Margin Touching" }]} />
          <SettingsNumberField label="Max Public Promo Discount %" value={state.promotions.max_public_promo_discount_percent} onChange={(v) => setState({ ...state, promotions: { ...state.promotions, max_public_promo_discount_percent: v } })} />
          <SettingsToggleField label="Allow margin touching promos" checked={state.promotions.allow_margin_touching_promos} onChange={(v) => setState({ ...state, promotions: { ...state.promotions, allow_margin_touching_promos: v } })} />
          <SettingsToggleField label="Affiliate visible campaigns" checked={state.promotions.affiliate_visible_campaigns} onChange={(v) => setState({ ...state, promotions: { ...state.promotions, affiliate_visible_campaigns: v } })} />
          <SettingsToggleField label="Campaign start/end required" checked={state.promotions.campaign_start_end_required} onChange={(v) => setState({ ...state, promotions: { ...state.promotions, campaign_start_end_required: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Affiliate Settings" description="Default affiliate economics, approval, payout, and governance.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsNumberField label="Default Affiliate Commission %" value={state.affiliate.default_affiliate_commission_percent} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, default_affiliate_commission_percent: v } })} />
          <SettingsSelectField label="Default Affiliate Status" value={state.affiliate.default_affiliate_status} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, default_affiliate_status: v } })} options={[{ value: "pending", label: "Pending" }, { value: "active", label: "Active" }]} />
          <SettingsSelectField label="Commission Trigger" value={state.affiliate.commission_trigger} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, commission_trigger: v } })} options={[{ value: "payment_approved", label: "Payment Approved" }, { value: "order_completed", label: "Order Completed" }]} />
          <SettingsSelectField label="Commission Duration" value={state.affiliate.commission_duration} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, commission_duration: v } })} options={[{ value: "per_successful_sale", label: "Per Successful Sale" }, { value: "first_order_only", label: "First Order Only" }]} />
          <SettingsSelectField label="Attribution Sources" value={state.affiliate.attribution_sources} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, attribution_sources: v } })} options={[{ value: "link_and_code", label: "Link + Promo Code" }, { value: "link_only", label: "Link Only" }, { value: "code_only", label: "Promo Code Only" }]} />
          <SettingsNumberField label="Attribution Window Days" value={state.affiliate.attribution_window_days} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, attribution_window_days: v } })} />
          <SettingsNumberField label="Minimum Payout Threshold (TZS)" value={state.affiliate.minimum_payout_threshold} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, minimum_payout_threshold: v } })} />
          <SettingsSelectField label="Payout Cycle" value={state.affiliate.payout_cycle} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, payout_cycle: v } })} options={[{ value: "monthly", label: "Monthly" }, { value: "weekly", label: "Weekly" }]} />
          <SettingsToggleField label="Affiliate registration requires approval" checked={state.affiliate.affiliate_registration_requires_approval} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, affiliate_registration_requires_approval: v } })} />
          <SettingsToggleField label="Personal promo code enabled" checked={state.affiliate.personal_promo_code_enabled} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, personal_promo_code_enabled: v } })} />
          <SettingsToggleField label="Manual payout approval" checked={state.affiliate.manual_payout_approval} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, manual_payout_approval: v } })} />
          <SettingsToggleField label="Watchlist logic enabled" checked={state.affiliate.watchlist_logic_enabled} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, watchlist_logic_enabled: v } })} />
          <SettingsToggleField label="Paused logic enabled" checked={state.affiliate.paused_logic_enabled} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, paused_logic_enabled: v } })} />
          <SettingsToggleField label="Suspend for abuse enabled" checked={state.affiliate.suspend_for_abuse_enabled} onChange={(v) => setState({ ...state, affiliate: { ...state.affiliate, suspend_for_abuse_enabled: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Sales Settings" description="Default sales commission and assignment behavior.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsNumberField label="Sales Commission % (Self)" value={state.sales.default_sales_commission_self_generated} onChange={(v) => setState({ ...state, sales: { ...state.sales, default_sales_commission_self_generated: v } })} />
          <SettingsNumberField label="Sales Commission % (Affiliate Lead)" value={state.sales.default_sales_commission_affiliate_generated} onChange={(v) => setState({ ...state, sales: { ...state.sales, default_sales_commission_affiliate_generated: v } })} />
          <SettingsSelectField label="Assignment Mode" value={state.sales.assignment_mode} onChange={(v) => setState({ ...state, sales: { ...state.sales, assignment_mode: v } })} options={[{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }]} />
          <SettingsToggleField label="Smart assignment enabled" checked={state.sales.smart_assignment_enabled} onChange={(v) => setState({ ...state, sales: { ...state.sales, smart_assignment_enabled: v } })} />
          <SettingsToggleField label="Lead source visibility" checked={state.sales.lead_source_visibility} onChange={(v) => setState({ ...state, sales: { ...state.sales, lead_source_visibility: v } })} />
          <SettingsToggleField label="Commission type visibility" checked={state.sales.commission_type_visibility} onChange={(v) => setState({ ...state, sales: { ...state.sales, commission_type_visibility: v } })} />
          <SettingsToggleField label="Sales referral link enabled" checked={state.sales.sales_referral_link_enabled} onChange={(v) => setState({ ...state, sales: { ...state.sales, sales_referral_link_enabled: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Payment Settings" description="Control live payment method behavior and verification rules.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="Bank-only payments" checked={state.payments.bank_only_payments} onChange={(v) => setState({ ...state, payments: { ...state.payments, bank_only_payments: v } })} />
          <SettingsToggleField label="Card payments enabled" checked={state.payments.card_payments_enabled} onChange={(v) => setState({ ...state, payments: { ...state.payments, card_payments_enabled: v } })} />
          <SettingsToggleField label="Mobile money enabled" checked={state.payments.mobile_money_enabled} onChange={(v) => setState({ ...state, payments: { ...state.payments, mobile_money_enabled: v } })} />
          <SettingsToggleField label="KwikPay enabled" checked={state.payments.kwikpay_enabled} onChange={(v) => setState({ ...state, payments: { ...state.payments, kwikpay_enabled: v } })} />
          <SettingsToggleField label="Payment proof required" checked={state.payments.payment_proof_required} onChange={(v) => setState({ ...state, payments: { ...state.payments, payment_proof_required: v } })} />
          <SettingsToggleField label="Payment proof auto-link to invoice" checked={state.payments.payment_proof_auto_link_to_invoice} onChange={(v) => setState({ ...state, payments: { ...state.payments, payment_proof_auto_link_to_invoice: v } })} />
          <SettingsSelectField label="Payment Verification Mode" value={state.payments.payment_verification_mode} onChange={(v) => setState({ ...state, payments: { ...state.payments, payment_verification_mode: v } })} options={[{ value: "manual", label: "Manual" }, { value: "auto", label: "Auto" }]} />
          <SettingsToggleField label="Create commission on payment approval" checked={state.payments.commission_creation_on_payment_approval} onChange={(v) => setState({ ...state, payments: { ...state.payments, commission_creation_on_payment_approval: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Payment Account Settings" description="Manage the bank account details used on checkout and invoices.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsTextField label="Default Country" value={state.payment_accounts.default_country} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, default_country: v } })} />
          <SettingsTextField label="Account Name" value={state.payment_accounts.account_name} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, account_name: v } })} />
          <SettingsTextField label="Account Number" value={state.payment_accounts.account_number} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, account_number: v } })} />
          <SettingsTextField label="Bank Name" value={state.payment_accounts.bank_name} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, bank_name: v } })} />
          <SettingsTextField label="SWIFT Code" value={state.payment_accounts.swift_code} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, swift_code: v } })} />
          <SettingsTextField label="Branch Name" value={state.payment_accounts.branch_name} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, branch_name: v } })} />
          <SettingsTextField label="Currency" value={state.payment_accounts.currency} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, currency: v } })} />
          <SettingsToggleField label="Show on invoice" checked={state.payment_accounts.show_on_invoice} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, show_on_invoice: v } })} />
          <SettingsToggleField label="Show on checkout" checked={state.payment_accounts.show_on_checkout} onChange={(v) => setState({ ...state, payment_accounts: { ...state.payment_accounts, show_on_checkout: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Invoice Branding & Authorization" description="Configure CFO signature, company stamp, and invoice authorization appearance.">
        <InvoiceBrandingSettings />
      </SettingsSectionCard>

      <SettingsSectionCard title="Progress Workflows" description="Make sure customer-facing status remains safe and clear.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="Hide internal provider details from customer" checked={state.progress_workflows.hide_internal_provider_details_from_customer} onChange={(v) => setState({ ...state, progress_workflows: { ...state.progress_workflows, hide_internal_provider_details_from_customer: v } })} />
          <SettingsToggleField label="Customer-safe external statuses only" checked={state.progress_workflows.customer_safe_external_statuses_only} onChange={(v) => setState({ ...state, progress_workflows: { ...state.progress_workflows, customer_safe_external_statuses_only: v } })} />
          <SettingsToggleField label="Product workflow enabled" checked={state.progress_workflows.product_workflow_enabled} onChange={(v) => setState({ ...state, progress_workflows: { ...state.progress_workflows, product_workflow_enabled: v } })} />
          <SettingsToggleField label="Service workflow enabled" checked={state.progress_workflows.service_workflow_enabled} onChange={(v) => setState({ ...state, progress_workflows: { ...state.progress_workflows, service_workflow_enabled: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="AI Assistant" description="Control AI help, handoff, and customer-safe behavior.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="AI enabled" checked={state.ai_assistant.ai_enabled} onChange={(v) => setState({ ...state, ai_assistant: { ...state.ai_assistant, ai_enabled: v } })} />
          <SettingsToggleField label="Human handoff enabled" checked={state.ai_assistant.human_handoff_enabled} onChange={(v) => setState({ ...state, ai_assistant: { ...state.ai_assistant, human_handoff_enabled: v } })} />
          <SettingsNumberField label="Handoff after unresolved exchanges" value={state.ai_assistant.handoff_after_unresolved_exchanges} onChange={(v) => setState({ ...state, ai_assistant: { ...state.ai_assistant, handoff_after_unresolved_exchanges: v } })} />
          <SettingsToggleField label="Lead capture on handoff" checked={state.ai_assistant.lead_capture_on_handoff} onChange={(v) => setState({ ...state, ai_assistant: { ...state.ai_assistant, lead_capture_on_handoff: v } })} />
          <SettingsToggleField label="Customer-safe status translation only" checked={state.ai_assistant.customer_safe_status_translation_only} onChange={(v) => setState({ ...state, ai_assistant: { ...state.ai_assistant, customer_safe_status_translation_only: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Notifications" description="Choose which parties receive default notifications.">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <SettingsToggleField label="Customer notifications enabled" checked={state.notifications.customer_notifications_enabled} onChange={(v) => setState({ ...state, notifications: { ...state.notifications, customer_notifications_enabled: v } })} />
          <SettingsToggleField label="Sales notifications enabled" checked={state.notifications.sales_notifications_enabled} onChange={(v) => setState({ ...state, notifications: { ...state.notifications, sales_notifications_enabled: v } })} />
          <SettingsToggleField label="Affiliate notifications enabled" checked={state.notifications.affiliate_notifications_enabled} onChange={(v) => setState({ ...state, notifications: { ...state.notifications, affiliate_notifications_enabled: v } })} />
          <SettingsToggleField label="Admin notifications enabled" checked={state.notifications.admin_notifications_enabled} onChange={(v) => setState({ ...state, notifications: { ...state.notifications, admin_notifications_enabled: v } })} />
          <SettingsToggleField label="Vendor notifications enabled" checked={state.notifications.vendor_notifications_enabled} onChange={(v) => setState({ ...state, notifications: { ...state.notifications, vendor_notifications_enabled: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Vendors / Partners" description="Protect data exposure while allowing execution updates.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="Vendor can update internal progress" checked={state.vendors.vendor_can_update_internal_progress} onChange={(v) => setState({ ...state, vendors: { ...state.vendors, vendor_can_update_internal_progress: v } })} />
          <SettingsToggleField label="Vendor sees only assigned jobs" checked={state.vendors.vendor_sees_only_assigned_jobs} onChange={(v) => setState({ ...state, vendors: { ...state.vendors, vendor_sees_only_assigned_jobs: v } })} />
          <SettingsToggleField label="Vendor cannot see customer financials" checked={state.vendors.vendor_cannot_see_customer_financials} onChange={(v) => setState({ ...state, vendors: { ...state.vendors, vendor_cannot_see_customer_financials: v } })} />
          <SettingsToggleField label="Vendor cannot see commissions" checked={state.vendors.vendor_cannot_see_commissions} onChange={(v) => setState({ ...state, vendors: { ...state.vendors, vendor_cannot_see_commissions: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Numbering Rules" description="Set professional document numbering defaults.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsToggleField label="SKU auto-numbering enabled" checked={state.numbering_rules.sku_auto_numbering_enabled} onChange={(v) => setState({ ...state, numbering_rules: { ...state.numbering_rules, sku_auto_numbering_enabled: v } })} />
          <SettingsTextField label="Quote Format" value={state.numbering_rules.quote_format} onChange={(v) => setState({ ...state, numbering_rules: { ...state.numbering_rules, quote_format: v } })} />
          <SettingsTextField label="Invoice Format" value={state.numbering_rules.invoice_format} onChange={(v) => setState({ ...state, numbering_rules: { ...state.numbering_rules, invoice_format: v } })} />
          <SettingsTextField label="Order Format" value={state.numbering_rules.order_format} onChange={(v) => setState({ ...state, numbering_rules: { ...state.numbering_rules, order_format: v } })} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Launch Controls" description="Recommended defaults for controlled launch.">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SettingsSelectField label="System Mode" value={state.launch_controls.system_mode} onChange={(v) => setState({ ...state, launch_controls: { ...state.launch_controls, system_mode: v } })} options={[{ value: "controlled_launch", label: "Controlled Launch" }, { value: "full_live", label: "Full Live" }]} />
          <SettingsToggleField label="Manual payment verification" checked={state.launch_controls.manual_payment_verification} onChange={(v) => setState({ ...state, launch_controls: { ...state.launch_controls, manual_payment_verification: v } })} />
          <SettingsToggleField label="Manual payout approval" checked={state.launch_controls.manual_payout_approval} onChange={(v) => setState({ ...state, launch_controls: { ...state.launch_controls, manual_payout_approval: v } })} />
          <SettingsToggleField label="Affiliate approval required" checked={state.launch_controls.affiliate_approval_required} onChange={(v) => setState({ ...state, launch_controls: { ...state.launch_controls, affiliate_approval_required: v } })} />
          <SettingsToggleField label="AI enabled" checked={state.launch_controls.ai_enabled} onChange={(v) => setState({ ...state, launch_controls: { ...state.launch_controls, ai_enabled: v } })} />
          <SettingsToggleField label="Bank-only payments" checked={state.launch_controls.bank_only_payments} onChange={(v) => setState({ ...state, launch_controls: { ...state.launch_controls, bank_only_payments: v } })} />
          <SettingsToggleField label="Audit notifications enabled" checked={state.launch_controls.audit_notifications_enabled} onChange={(v) => setState({ ...state, launch_controls: { ...state.launch_controls, audit_notifications_enabled: v } })} />
        </div>
      </SettingsSectionCard>
    </div>
  );
}
