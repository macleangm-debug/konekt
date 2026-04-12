import React, { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawerProvider } from "@/contexts/CartDrawerContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { StaffAuthProvider, useStaffAuth } from "@/contexts/StaffAuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { bootstrapAffiliateAttribution } from "@/lib/attribution";
import ProtectedRouteWithValidation from "@/components/auth/ProtectedRouteWithValidation";

// Components
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
// Removed: ExitIntentPopup, PromoBanner (interruptive popups cleaned up)
import AIChatWidget from "@/components/AIChatWidget";
import { ConfirmModalProvider } from "@/contexts/ConfirmModalContext";
import CustomerPortalLayout from "@/components/customer/CustomerPortalLayout";
import CartDrawerV2 from "@/components/cart/CartDrawerV2";
import CartDrawerCompleteFlow from "@/components/cart/CartDrawerCompleteFlow";
import MyAccountProfilePage from "@/components/account/MyAccountProfilePage";
import MyAccountPageV2 from "@/components/account/MyAccountPageV2";

// Customer Pages
import Landing from "@/pages/LandingNew";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Customize from "@/pages/Customize";
import Cart from "@/pages/Cart";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import OrderTracking from "@/pages/OrderTracking";
import EquipmentMaintenance from "@/pages/EquipmentMaintenance";
import CreativeServicesPage from "@/pages/CreativeServicesPage";
import CreativeServiceBriefPage from "@/pages/CreativeServiceBriefPage";
import CreativeServiceDetailPage from "@/pages/CreativeServiceDetailPage";
import CreativeServiceCheckoutPage from "@/pages/CreativeServiceCheckoutPage";
import ServiceDetail from "@/pages/ServiceDetail";
import ServicesHubPage from "@/pages/ServicesHubPage";
import ServiceRequestPage from "@/pages/ServiceRequestPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import OrderTrackingPage from "@/pages/OrderTrackingPage";
import PaymentSelectionPage from "@/pages/PaymentSelectionPage";
import BankTransferPage from "@/pages/BankTransferPage";
import PaymentPendingPage from "@/pages/PaymentPendingPage";
import ReferralLandingPage from "@/pages/ReferralLandingPage";
import AffiliateLandingPage from "@/pages/AffiliateLandingPage";
import AffiliateApplyPage from "@/pages/AffiliateApplyPage";
import AffiliatePortalPage from "@/pages/AffiliatePortalPage";

// Admin Pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboardV2 from "@/pages/admin/AdminDashboardV2";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminStock from "@/pages/admin/AdminStock";
import AdminMaintenance from "@/pages/admin/AdminMaintenance";
import AdminOffers from "@/pages/admin/AdminOffers";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminUsers from "@/pages/admin/AdminUsers";
import CRMPageV2 from "@/pages/admin/CRMPageV2";
import InventoryPage from "@/pages/admin/InventoryPage";
import TasksPage from "@/pages/admin/TasksPage";
import InvoicesPage from "@/pages/admin/InvoicesPage";
import CompanySettingsPage from "@/pages/admin/CompanySettingsPage";
import OrdersPage from "@/pages/admin/OrdersPage";
import PaymentsQueuePage from "@/pages/admin/PaymentsQueuePage";
import QuotesRequestsPage from "@/pages/admin/QuotesRequestsPage";
import ProductionQueuePage from "@/pages/admin/ProductionQueuePage";
import CustomersPageMerged from "@/pages/admin/CustomersPageMerged";
import CustomerProfilePage from "@/pages/admin/CustomerProfilePage";
import AdminDocumentsPage from "@/pages/admin/AdminDocumentsPage";
import HeroBannersPage from "@/pages/admin/HeroBannersPage";
import ReferralSettingsPage from "@/pages/admin/ReferralSettingsPage";
import AffiliatesPage from "@/pages/admin/AffiliatesPage";
import AffiliateCommissionsPage from "@/pages/admin/AffiliateCommissionsPage";
import AffiliatePayoutsPage from "@/pages/admin/AffiliatePayoutsPage";
import AffiliateApplicationsPage from "@/pages/admin/AffiliateApplicationsPage";
import AffiliateSettingsPage from "@/pages/admin/AffiliateSettingsPage";
import AffiliateCampaignsPage from "@/pages/admin/AffiliateCampaignsPage";
import StatementPage from "@/pages/admin/StatementPage";
import QuotePreviewPage from "@/pages/admin/QuotePreviewPage";
import QuoteEditorPage from "@/pages/admin/QuoteEditorPage";
import InvoicePreviewPage from "@/pages/admin/InvoicePreviewPage";
import InventoryVariantsPage from "@/pages/admin/InventoryVariantsPage";
import WarehousesPage from "@/pages/admin/WarehousesPage";
import RawMaterialsPage from "@/pages/admin/RawMaterialsPage";
import DocumentWorkflowPage from "@/pages/admin/DocumentWorkflowPage";
import RecordPaymentPage from "@/pages/admin/RecordPaymentPage";
import LaunchReadinessPage from "@/pages/admin/LaunchReadinessPage";
import AuditLogPage from "@/pages/admin/AuditLogPage";
import WarehouseTransfersPage from "@/pages/admin/WarehouseTransfersPage";
import StockMovementsPage from "@/pages/admin/StockMovementsPage";
import ServiceFormsPage from "@/pages/admin/ServiceFormsPage";
import ServiceRequestsAdminPage from "@/pages/admin/ServiceRequestsAdminPage";
import ServiceRequestAdminDetailPage from "@/pages/admin/ServiceRequestAdminDetailPage";
import ServiceRequestsPage from "@/pages/dashboard/ServiceRequestsPage";
import ServiceRequestDetailPage from "@/pages/dashboard/ServiceRequestDetailPage";
import BusinessSettingsPage from "@/pages/admin/AdminBusinessSettingsPage";
import AdminConfigurationHubPage from "@/pages/admin/AdminConfigurationHubPage";
import CrmIntelligencePage from "@/pages/admin/CrmIntelligencePage";
import CrmSettingsPage from "@/pages/admin/CrmSettingsPage";
import LeadDetailPage from "@/pages/admin/LeadDetailPage";
import SuperAdminControlPanelPage from "@/pages/admin/SuperAdminControlPanelPage";
import StaffPerformancePage from "@/pages/admin/StaffPerformancePage";
import PaymentSettingsPage from "@/pages/admin/PaymentSettingsPage";
import NotificationSettingsPage from "@/pages/admin/NotificationSettingsPage";
import AdminDiscountRequestsPage from "@/pages/admin/AdminDiscountRequestsPage";

// Partner Ecosystem Pages
import PartnersPage from "@/pages/admin/PartnersPage";
import PartnerCatalogPage from "@/pages/admin/PartnerCatalogPage";
import CountryPricingPage from "@/pages/admin/CountryPricingPage";
import RoutingRulesPage from "@/pages/admin/RoutingRulesPage";
import CountryPartnerApplicationsPage from "@/pages/admin/CountryPartnerApplicationsPage";
import CountryLaunchConfigPage from "@/pages/admin/CountryLaunchConfigPage";

// Service Orchestration Admin Pages
import ServiceCatalogPage from "@/pages/admin/ServiceCatalogPage";
import BlankProductsPage from "@/pages/admin/BlankProductsPage";
import SlaAlertsPage from "@/pages/admin/SlaAlertsPage";

// Service Leads CRM Table
import ServiceLeadsCrmTable from "@/components/services/ServiceLeadsCrmTable";

// Requests Inbox
import AdminRequestsInboxPage from "@/pages/admin/AdminRequestsInboxPage";

// Referral + Commission Governance Components
import AdminAffiliateManagerSimple from "@/components/admin/AdminAffiliateManagerSimple";
import DistributionMarginPage from "@/pages/admin/DistributionMarginPage";

// Service Taxonomy Admin
import ServiceTaxonomyAdminSetup from "@/components/admin/ServiceTaxonomyAdminSetup";

// Admin Deliveries
import AdminDeliveriesPage from "@/pages/admin/AdminDeliveriesPage";

// Contract Clients + Billing Discipline Pack
import ContractClientsPage from "@/pages/admin/ContractClientsPage";
import NegotiatedPricingPage from "@/pages/admin/NegotiatedPricingPage";
import ContractSlasPage from "@/pages/admin/ContractSlasPage";
import RecurringInvoicePlansPage from "@/pages/admin/RecurringInvoicePlansPage";

// Admin Performance & Insights Pack
import PartnerPerformancePage from "@/pages/admin/PartnerPerformancePage";
import ProductInsightsPage from "@/pages/admin/ProductInsightsPage";
import AdminSalesRatingsPage from "@/pages/admin/AdminSalesRatingsPage";
import ServiceInsightsPage from "@/pages/admin/ServiceInsightsPage";

// Reports Hub
import BusinessHealthReportPage from "@/pages/admin/reports/BusinessHealthReportPage";
import FinancialReportsPage from "@/pages/admin/reports/FinancialReportsPage";
import SalesReportsPage from "@/pages/admin/reports/SalesReportsPage";
import InventoryIntelligencePage from "@/pages/admin/reports/InventoryIntelligencePage";
import WeeklyPerformanceReportPage from "@/pages/admin/reports/WeeklyPerformanceReportPage";
import AlertDashboardPage from "@/pages/admin/reports/AlertDashboardPage";
import WeeklyDigestPage from "@/pages/admin/WeeklyDigestPage";
import DataIntegrityDashboardPage from "@/pages/admin/DataIntegrityDashboardPage";

// Super Admin Ecosystem Dashboard
import SuperAdminEcosystemDashboard from "@/pages/admin/SuperAdminEcosystemDashboard";

// Super Admin Commercial Controls
import GroupMarkupsPage from "@/pages/admin/GroupMarkupsPage";
import PartnerSettlementsAdminPage from "@/pages/admin/PartnerSettlementsAdminPage";

// Staff Performance & Supervisor
import SupervisorDashboardPage from "@/pages/admin/SupervisorDashboardPage";
import CommissionRulesPage from "@/pages/admin/CommissionRulesPage";

// Auto-Numbering Configuration
import AutoNumberingPage from "@/pages/admin/AutoNumberingPage";

// Numbering Rules Page
import NumberingRulesPage from "@/pages/admin/NumberingRulesPage";

// Launch QA Checklist
import LaunchQaChecklistPage from "@/pages/admin/LaunchQaChecklistPage";

// Business Pricing Admin
import BusinessPricingAdminPage from "@/pages/admin/BusinessPricingAdminPage";

// Production Jobs Admin
import ProductionJobsAdminPage from "@/pages/admin/ProductionJobsAdminPage";

// Service Partner Capabilities
import ServicePartnerCapabilitiesPage from "@/pages/admin/ServicePartnerCapabilitiesPage";

// Customer Recurring Plans
import RecurringPlansPage from "@/pages/dashboard/RecurringPlansPage";

// Partner Portal Pages
import PartnerLayout from "@/layouts/PartnerLayout";
import StaffLayout from "@/layouts/StaffLayout";
import PartnerLoginPage from "@/pages/partner/PartnerLoginPage";
import PartnerDashboardPage from "@/pages/partner/PartnerDashboardPage";
import PartnerDashboardV2 from "@/pages/partner/PartnerDashboardV2";
import PartnerCatalogPage2 from "@/pages/partner/PartnerCatalogPage";
import PartnerStockTablePage from "@/pages/partner/PartnerStockTablePage";
import PartnerBulkUploadPage from "@/pages/partner/PartnerBulkUploadPage";
import MyOrdersPage from "@/pages/partner/MyOrdersPage";
import PartnerSettlementsPage from "@/pages/partner/PartnerSettlementsPage";

// Affiliate Dashboard Pages
import AffiliateDashboardHomePage from "@/pages/partner/AffiliateDashboardHomePage";
import AffiliatePromotionsPage from "@/pages/partner/AffiliatePromotionsPage";
import AffiliateSalesPage from "@/pages/partner/AffiliateSalesPage";
import AffiliateEarningsPage from "@/pages/partner/AffiliateEarningsPage";
import PartnerAffiliatePayoutsPage from "@/pages/partner/AffiliatePayoutsPage";
import AffiliateProfilePage from "@/pages/partner/AffiliateProfilePage";

// Growth Engine Admin Pages
import CommissionEngineAdminPage from "@/pages/admin/CommissionEngineAdminPage";
import PromotionEngineAdminPage from "@/pages/admin/PromotionEngineAdminPage";
import PayoutEngineAdminPage from "@/pages/admin/PayoutEngineAdminPage";
import AdminContentCenterPage from "@/pages/admin/AdminContentCenterPage";
import AdminContentStudioPage from "@/pages/admin/AdminContentStudioPage";

// Sales Commission Dashboard
import SalesCommissionDashboardPage from "@/pages/staff/SalesCommissionDashboardPage";
import SalesPromotionCenterPage from "@/pages/staff/SalesPromotionCenterPage";
import PortfolioDashboardPage from "@/pages/staff/PortfolioDashboardPage";

// Sales Orders
import SalesOrdersPageV2 from "@/pages/staff/SalesOrdersPageV2";

// Final Operations + Growth Pack
import AffiliatePerformancePage from "@/pages/partner/AffiliatePerformancePage";
import AffiliatePerformanceGovernancePage from "@/pages/admin/AffiliatePerformanceGovernancePage";

// GTM + Partner Management + Onboarding Pack
import GoToMarketConfigPage from "@/pages/admin/GoToMarketConfigPage";
import AffiliatePartnerManagerPage from "@/pages/admin/AffiliatePartnerManagerPage";
import AffiliatePartnerDetailPage from "@/pages/admin/AffiliatePartnerDetailPage";
import VendorDashboardPage from "@/pages/partner/VendorDashboardPage";
import VendorMyPerformancePage from "@/pages/partner/VendorMyPerformancePage";
import PartnerAssignedWorkPage from "@/pages/partner/PartnerAssignedWorkPage";
import HelpCustomerPage from "@/pages/help/HelpCustomerPage";
import HelpAdminPage from "@/pages/help/HelpAdminPage";
import HelpAffiliatePage from "@/pages/help/HelpAffiliatePage";
import HelpSalesPage from "@/pages/help/HelpSalesPage";
import HelpVendorPage from "@/pages/help/HelpVendorPage";

// Navigation Audit
import NavigationAuditPage from "@/pages/system/NavigationAuditPage";

// Admin Settings Hub
import AdminSettingsHubPage from "@/pages/admin/AdminSettingsHubPage";
import DiscountAnalyticsPage from "@/pages/admin/DiscountAnalyticsPage";
import AdminPromotionsPage from "@/pages/admin/AdminPromotionsPage";

// Admin Control Center
import AdminControlCenterPage from "@/pages/admin/AdminControlCenterPage";

// Smart Partner Ecosystem
import PartnerEcosystemSmart from "@/pages/admin/PartnerEcosystemSmart";

// Unified Partner Ecosystem
import PartnerEcosystemUnifiedPage from "@/pages/admin/PartnerEcosystemUnifiedPage";

// Customer Experience Simplification Pack
import CustomerDashboardV2 from "@/pages/account/CustomerDashboardV2";
import AccountMarketplacePage from "@/pages/account/AccountMarketplacePage";
import AccountServicesPage from "@/pages/account/AccountServicesPage";
import AssistedQuoteRequestPage from "@/pages/account/AssistedQuoteRequestPage";
import MyOrdersUnifiedPage from "@/pages/account/MyOrdersUnifiedPage";

// Account Marketplace + Service Request Pack
import MarketplaceUnifiedPageV3 from "@/pages/account/MarketplaceUnifiedPageV3";
import AccountProductDetailPage from "@/pages/account/AccountProductDetailPage";
import AccountCartPage from "@/pages/account/AccountCartPage";
import AccountCheckoutPage from "@/pages/account/AccountCheckoutPage";
import AccountServiceRequestPage from "@/pages/account/AccountServiceRequestPage";
import AssistedSalesRequestFromCartPage from "@/pages/account/AssistedSalesRequestFromCartPage";

// Unified Commerce Pack - New Pages
import ExplorePageV2 from "@/pages/account/ExplorePageV2";
import AccountServicesPageV2 from "@/pages/account/AccountServicesPageV2";
import InvoiceDetailInAccountPage from "@/pages/account/InvoiceDetailInAccountPage";
import ProductSubgroupsManagerPage from "@/pages/admin/ProductSubgroupsManagerPage";
import VendorProductsManagerPage from "@/pages/vendor/VendorProductsManagerPage";
import VendorProductSubmissionsPage from "@/pages/vendor/VendorProductSubmissionsPage";
import VendorProductUploadPage from "@/pages/vendor/VendorProductUploadPage";
import VendorBulkImportPage from "@/pages/vendor/VendorBulkImportPage";
import AdminVendorSupplyReviewPage from "@/pages/admin/AdminVendorSupplyReviewPage";

// Launch Critical Pack - New Components
import OrderDetailPageV2 from "@/pages/account/OrderDetailPageV2";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import OrderDetailTimelineSection from "@/components/orders/OrderDetailTimelineSection";
import AppCommerceMounts from "@/components/app/AppCommerceMounts";

// PDF + Dashboard Metrics Pack
import CustomerDashboardMetricsWired from "@/pages/dashboard/CustomerDashboardMetricsWired";
import AdminDashboardMetricsWired from "@/pages/dashboard/AdminDashboardMetricsWired";
import RealPdfDownloadActions from "@/components/docs/RealPdfDownloadActions";
import useDashboardMetrics from "@/hooks/useDashboardMetrics";

// Sales Rating + Feedback Pack
import CustomerSalesRatingTasksPage from "@/pages/account/CustomerSalesRatingTasksPage";
import SalesDashboardQualityV3 from "@/pages/dashboard/SalesDashboardQualityV3";
import StarRatingInput from "@/components/ratings/StarRatingInput";
import SalesRatingModal from "@/components/ratings/SalesRatingModal";
import CompletedOrderRatingTaskCard from "@/components/ratings/CompletedOrderRatingTaskCard";
import SalespersonScoreCard from "@/components/ratings/SalespersonScoreCard";
import SalesRatingLeaderboardCard from "@/components/ratings/SalesRatingLeaderboardCard";

// Branding + Enterprise PDF Pack
import BrandingSettingsPage from "@/pages/admin/BrandingSettingsPage";
import BrandLogo from "@/components/branding/BrandLogo";
import AppLauncher from "@/components/branding/AppLauncher";
import AccountBrandHeader from "@/components/layout/AccountBrandHeader";
import EnterprisePdfActions from "@/components/docs/EnterprisePdfActions";
import useBrandingSettings from "@/hooks/useBrandingSettings";

// HelpMenuCard Component
import HelpMenuCard from "@/components/navigation/HelpMenuCard";

// Service Tasks
import AdminServiceTasksPage from "@/pages/admin/AdminServiceTasksPage";

// New Design Pack - V2 Pages
import LoginPageV2 from "@/pages/auth/LoginPageV2";
import RegisterPageV2 from "@/pages/auth/RegisterPageV2";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import HelpPageV3 from "@/pages/help/HelpPageV3";
import DashboardCommandCenter from "@/pages/dashboard/DashboardCommandCenter";
import CustomerDashboardV3 from "@/pages/dashboard/CustomerDashboardV3";
import QuoteDetailWithPayment from "@/pages/quotes/QuoteDetailWithPayment";
import EmptyState, { EmptyQuotes, EmptyOrders, EmptyInvoices } from "@/components/empty/EmptyState";

// Public Expansion Pages
import CountryLaunchPage from "@/pages/public/CountryLaunchPage";
import MarketplaceListingDetailPage from "@/pages/public/MarketplaceListingDetailPage";
import MarketplaceBrowsePage from "@/pages/public/MarketplaceBrowsePage";

// Premium UI Pages
import ExpansionPremiumPage from "@/pages/public/ExpansionPremiumPage";
import ServicesDiscoveryPage from "@/pages/public/ServicesDiscoveryPage";

// Customer Invoice Payment
import InvoicePaymentPage from "@/pages/customer/InvoicePaymentPage";
import InvoicePaymentPageV2 from "@/pages/customer/InvoicePaymentPageV2";

// P0 Pages - Checkout, Sales Queue, Service Detail
import CheckoutPageV2 from "@/pages/checkout/CheckoutPageV2";
import SalesQueuePage from "@/pages/staff/SalesQueuePage";
import ServiceDetailLeadAwarePage from "@/pages/services/ServiceDetailLeadAwarePage";

// Sales Intelligence & Performance Dashboards
import SalesQueueIntelligencePage from "@/pages/staff/SalesQueueIntelligencePage";
import StaffPerformanceDashboardPage from "@/pages/staff/StaffPerformanceDashboardPage";
import SupervisorPerformanceDashboardPage from "@/pages/admin/SupervisorPerformanceDashboardPage";

// Instant Quote Engine & Sales Command Center
import SalesCommandCenterV4 from "@/pages/dashboard/SalesCommandCenterV4";

// Services Pages (Improved)
import ServicesPageImproved from "@/pages/public/ServicesPageImproved";
import AccountServicesDiscoveryPage from "@/pages/customer/AccountServicesDiscoveryPage";

// Dynamic Service Pages Pack
import DynamicServiceDetailPage from "@/pages/public/DynamicServiceDetailPage";
import AccountServiceDetailPage from "@/pages/customer/AccountServiceDetailPage";

// Quote Request Page
import QuoteRequestPage from "@/pages/public/QuoteRequestPage";
import PublicOrderRequestPage from "@/pages/public/PublicOrderRequestPage";
import PublicCartPage from "@/pages/public/PublicCartPage";
import PublicCheckoutPage from "@/pages/public/PublicCheckoutPage";
import PublicPaymentProofPage from "@/pages/public/PublicPaymentProofPage";

// New Premium Layouts & Pages
import PublicSiteLayout from "@/layouts/PublicSiteLayout";
import CustomerPortalLayoutV2 from "@/layouts/CustomerPortalLayoutV2";
import HomepageV2Content from "@/pages/HomepageV2Content";
import MarketplaceBrowsePageContent from "@/pages/public/MarketplaceBrowsePageContent";
import MarketplaceListingDetailContent from "@/pages/public/MarketplaceListingDetailContent";
import ServicesPageContent from "@/pages/public/ServicesPageContent";
import ServiceGroupDetailContent from "@/pages/public/ServiceGroupDetailContent";
import ServiceDetailContent from "@/pages/public/ServiceDetailContent";
import TrackOrderPageContent from "@/pages/public/TrackOrderPageContent";
import ConfirmCompletionPage from "@/pages/public/ConfirmCompletionPage";
import AboutPageContent from "@/pages/public/AboutPageContent";
import ContactPageContent from "@/pages/public/ContactPageContent";
import PrivacyPolicyPage from "@/pages/public/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/public/TermsOfServicePage";
import PublicHelpPage from "@/pages/public/PublicHelpPage";

// New Premium Customer Pages
import DashboardOverviewPageV2 from "@/pages/customer/DashboardOverviewPageV2";
import OrdersPageV2 from "@/pages/customer/OrdersPageV2";
import QuotesPageV2 from "@/pages/customer/QuotesPageV2";
import InvoicesPageV2 from "@/pages/customer/InvoicesPageV2";
import ServiceRequestsPageV2 from "@/pages/customer/ServiceRequestsPageV2";
import PointsPageV2 from "@/pages/customer/PointsPageV2";
import ReferralsPage from "@/pages/customer/ReferralsPage";
import ProfileSettingsPage from "@/pages/customer/ProfileSettingsPage";
import MyStatementPageV2 from "@/pages/customer/MyStatementPageV2";
import BusinessPricingRequestPage from "@/pages/customer/BusinessPricingRequestPage";
import ClientProfilePage from "@/pages/customer/ClientProfilePage";

// Auth Pages
import StaffLoginPage from "@/pages/auth/StaffLoginPage";
import ActivateAccountPage from "@/pages/auth/ActivateAccountPage";
import LoginChooserPage from "@/pages/auth/LoginChooserPage";
import CustomerLoginPage from "@/pages/auth/CustomerLoginPage";
import AffiliateRegisterPage from "@/pages/auth/AffiliateRegisterPage";

// Affiliate Pages
import AffiliateProgramLandingPage from "@/pages/public/AffiliateLandingPage";
import AffiliateDashboardPageV2 from "@/pages/partner/AffiliateDashboardPage";

// Legacy Homepage
import HomepageV2 from "@/pages/HomepageV2";

// Partner Listing Editor
import PartnerListingEditorPage from "@/pages/partner/PartnerListingEditorPage";

// Inventory Operations Pages
import InventoryOperationsPage from "@/pages/admin/InventoryOperationsPage";
import DeliveryNotesPage from "@/pages/admin/DeliveryNotesPage";
import DeliveryNotePreviewPage from "@/pages/admin/DeliveryNotePreviewPage";
import GoodsReceivingPage from "@/pages/admin/GoodsReceivingPage";
import SuppliersPage from "@/pages/admin/SuppliersPage";
import PurchaseOrdersPage from "@/pages/admin/PurchaseOrdersPage";
import AdminProductsServicesPage from "@/pages/admin/AdminProductsServicesPage";
import AdminProductApprovalPage from "@/pages/admin/AdminProductApprovalPage";
import TeamOverviewPage from "@/pages/admin/TeamOverviewPage";
import TeamLeaderboardPage from "@/pages/admin/TeamLeaderboardPage";
import TeamAlertsPage from "@/pages/admin/TeamAlertsPage";

// Partnership Placeholder
import PartnershipComingSoonPage from "@/pages/admin/PartnershipComingSoonPage";

// Catalog Taxonomy + Vendor Capabilities
import CatalogTaxonomyPage from "@/pages/admin/CatalogTaxonomyPage";
import VendorCapabilityAssignmentPage from "@/pages/admin/VendorCapabilityAssignmentPage";
import VendorListPage from "@/pages/admin/VendorListPage";
import MarginAdminPage from "@/pages/admin/MarginAdminPage";
import SalesPerformancePage from "@/pages/admin/SalesPerformancePage";
import PerformanceGovernancePage from "@/pages/admin/PerformanceGovernancePage";
import ClientReassignmentPage from "@/pages/admin/ClientReassignmentPage";
import AdminPortfolioOverviewPage from "@/pages/admin/AdminPortfolioOverviewPage";
import DormantClientAlertsPage from "@/pages/admin/DormantClientAlertsPage";
import AssignmentDecisionHistoryPage from "@/pages/admin/AssignmentDecisionHistoryPage";
import VendorOnboardingPage from "@/pages/admin/VendorOnboardingPage";
import UnifiedCatalogWorkspacePage from "@/pages/admin/UnifiedCatalogWorkspacePage";

// Staff pages
import StaffWorkspaceHomePage from "@/pages/staff/StaffWorkspaceHomePage";
import SalesDashboardV2 from "@/pages/staff/SalesDashboardV2";
import ProductionJobsPage from "@/pages/staff/ProductionJobsPage";
import OpportunityDetailPage from "@/pages/staff/OpportunityDetailPage";
import SalesDiscountRequestsPage from "@/pages/staff/SalesDiscountRequestsPage";
import SalesContentHubPage from "@/pages/staff/SalesContentHubPage";

// Dashboard pages (customer) - New Portal
import CustomerDashboardHome from "@/pages/dashboard/CustomerDashboardHome";
import CustomerOrdersPage from "@/pages/dashboard/CustomerOrdersPage";
import CustomerQuotesPage from "@/pages/dashboard/CustomerQuotesPage";
import CustomerQuoteDetailPage from "@/pages/dashboard/CustomerQuoteDetailPage";
import CustomerInvoicesPage from "@/pages/dashboard/CustomerInvoicesPage";
import CustomerInvoiceDetailPage from "@/pages/dashboard/CustomerInvoiceDetailPage";
import MyDesignProjectsPage from "@/pages/dashboard/MyDesignProjectsPage";
import CreativeProjectDetailPage from "@/pages/dashboard/CreativeProjectDetailPage";
import MyStatementPage from "@/pages/dashboard/MyStatementPage";
import AddressesPage from "@/pages/dashboard/AddressesPage";
import MaintenanceDashboardPage from "@/pages/dashboard/MaintenanceDashboardPage";
import DashboardReferralsPage from "@/pages/dashboard/ReferralsPage";
import PointsPage from "@/pages/dashboard/PointsPage";
import DashboardAffiliatePage from "@/pages/dashboard/AffiliateDashboardPage";

// Affiliate pages
import AffiliateDashboardPage from "@/pages/affiliate/AffiliateDashboardPage";
import AffiliateDashboardV2 from "@/pages/affiliate/AffiliateDashboardV2";
import LogoPreviewPage from "@/pages/LogoPreviewPage";

// Admin Route Guard
function AdminRoute({ children }) {
  const { admin, loading } = useAdminAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!admin) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Admin Settings Placeholder
function AdminSettings() {
  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-100">
      <h1 className="text-2xl font-bold text-primary mb-4">Settings</h1>
      <p className="text-muted-foreground">System settings coming soon.</p>
    </div>
  );
}

// Customer Route Guard - Redirects to auth if not logged in
function CustomerRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <ProtectedRouteWithValidation tokenKey="konekt_token">{children}</ProtectedRouteWithValidation>;
}

// Staff Route Guard - Redirects to staff-login if not authenticated as staff
function StaffRoute({ children }) {
  const { staff, loading } = useStaffAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!staff) {
    return <Navigate to="/staff-login" replace />;
  }
  
  return children;
}

function App() {
  const [launcherDone, setLauncherDone] = useState(false);
  // Bootstrap affiliate attribution from URL/localStorage on app load
  useEffect(() => {
    bootstrapAffiliateAttribution();
  }, []);

  return (
    <BrandingProvider>
    <ConfirmModalProvider>
    {!launcherDone && <AppLauncher onComplete={() => setLauncherDone(true)} />}
    <BrowserRouter>
      <Routes>
        {/* Main Login Page - V2 Branded Design */}
        <Route path="/login" element={
          <AuthProvider>
            <LoginPageV2 />
          </AuthProvider>
        } />
        {/* Legacy Customer Login Route */}
        <Route path="/login/customer" element={
          <AuthProvider>
            <LoginPageV2 />
          </AuthProvider>
        } />
        {/* Register route - modern UI matching login */}
        <Route path="/register" element={
          <AuthProvider>
            <CartProvider>
              <RegisterPageV2 />
            </CartProvider>
          </AuthProvider>
        } />

        {/* Password Reset */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Staff Login (separate from admin) */}
        <Route path="/staff-login" element={
          <StaffAuthProvider>
            <StaffLoginPage />
          </StaffAuthProvider>
        } />

        {/* Account Activation (public, no auth) */}
        <Route path="/activate-account" element={<ActivateAccountPage />} />
        
        {/* Admin Routes — redirect /admin/login to unified /login */}
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/*" element={
          <AdminAuthProvider>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </AdminAuthProvider>
        }>
          <Route index element={<AdminDashboardV2 />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="product-approvals" element={<AdminProductApprovalPage />} />
          <Route path="team/overview" element={<TeamOverviewPage />} />
          <Route path="team/leaderboard" element={<TeamLeaderboardPage />} />
          <Route path="team/alerts" element={<TeamAlertsPage />} />
          <Route path="stock" element={<AdminStock />} />
          <Route path="maintenance" element={<AdminMaintenance />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="referrals" element={<AdminReferrals />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="crm" element={<CRMPageV2 />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/variants" element={<InventoryVariantsPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="raw-materials" element={<RawMaterialsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoicePreviewPage />} />
          <Route path="quotes" element={<QuotesRequestsPage />} />
          <Route path="quotes/:id" element={<QuotePreviewPage />} />
          <Route path="quotes/:id/edit" element={<QuoteEditorPage />} />
          <Route path="workflow" element={<DocumentWorkflowPage />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="production" element={<ProductionQueuePage />} />
          <Route path="customers" element={<CustomersPageMerged />} />
          <Route path="customers/:id" element={<CustomerProfilePage />} />
          <Route path="payments" element={<PaymentsQueuePage />} />
          <Route path="discount-requests" element={<AdminDiscountRequestsPage />} />
          <Route path="statements" element={<StatementPage />} />
          <Route path="hero-banners" element={<HeroBannersPage />} />
          <Route path="referral-settings" element={<ReferralSettingsPage />} />
          <Route path="affiliates" element={<AffiliatesPage />} />
          <Route path="affiliate-applications" element={<AffiliateApplicationsPage />} />
          <Route path="affiliate-commissions" element={<AffiliateCommissionsPage />} />
          <Route path="affiliate-payouts" element={<AffiliatePayoutsPage />} />
          <Route path="affiliate-settings" element={<AffiliateSettingsPage />} />
          <Route path="affiliate-campaigns" element={<AffiliateCampaignsPage />} />
          {/* Partnerships Routes */}
          <Route path="partnerships/affiliates" element={<AffiliatesPage />} />
          <Route path="partnerships/referrals" element={<PartnershipComingSoonPage title="Referrals" />} />
          <Route path="partnerships/commissions" element={<PartnershipComingSoonPage title="Commissions" />} />
          <Route path="payments/record" element={<RecordPaymentPage />} />
          <Route path="launch-readiness" element={<LaunchReadinessPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="inventory/transfers" element={<WarehouseTransfersPage />} />
          <Route path="inventory/movements" element={<StockMovementsPage />} />
          <Route path="service-forms" element={<ServiceFormsPage />} />
          <Route path="service-requests" element={<ServiceRequestsAdminPage />} />
          <Route path="service-requests/:requestId" element={<ServiceRequestAdminDetailPage />} />
          <Route path="business-settings" element={<BusinessSettingsPage />} />
          <Route path="documents" element={<AdminDocumentsPage />} />
          <Route path="payment-settings" element={<PaymentSettingsPage />} />
          <Route path="crm-intelligence" element={<CrmIntelligencePage />} />
          <Route path="crm-settings" element={<CrmSettingsPage />} />
          <Route path="crm/leads/:leadId" element={<LeadDetailPage />} />
          <Route path="control-panel" element={<SuperAdminControlPanelPage />} />
          <Route path="staff-performance" element={<StaffPerformancePage />} />
          <Route path="inventory-operations" element={<InventoryOperationsPage />} />
          <Route path="delivery-notes" element={<DeliveryNotesPage />} />
          <Route path="delivery-notes/:id" element={<DeliveryNotePreviewPage />} />
          <Route path="service-tasks" element={<AdminServiceTasksPage />} />
          <Route path="goods-receiving" element={<GoodsReceivingPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="procurement/purchase-orders" element={<PurchaseOrdersPage />} />
          {/* Retired routes → redirect to canonical pages */}
          <Route path="products-services" element={<Navigate to="/admin/catalog" replace />} />
          <Route path="catalog-taxonomy" element={<Navigate to="/admin/catalog" replace />} />
          <Route path="vendor-capabilities" element={<Navigate to="/admin/vendors" replace />} />
          <Route path="settings/company" element={<Navigate to="/admin/business-settings" replace />} />
          <Route path="configuration" element={<Navigate to="/admin/business-settings" replace />} />
          <Route path="vendors" element={<VendorListPage />} />
          <Route path="margins" element={<MarginAdminPage />} />
          <Route path="sales-performance" element={<SalesPerformancePage />} />
          <Route path="performance-governance" element={<PerformanceGovernancePage />} />
          <Route path="client-reassignment" element={<ClientReassignmentPage />} />
          <Route path="portfolio-overview" element={<AdminPortfolioOverviewPage />} />
          <Route path="dormant-clients" element={<DormantClientAlertsPage />} />
          <Route path="assignment-decisions" element={<AssignmentDecisionHistoryPage />} />
          <Route path="vendor-onboarding" element={<VendorOnboardingPage />} />
          <Route path="catalog" element={<UnifiedCatalogWorkspacePage />} />
          <Route path="vendor-supply-review" element={<AdminVendorSupplyReviewPage />} />
          {/* Partner Ecosystem Routes */}
          <Route path="partners" element={<PartnersPage />} />
          <Route path="partner-catalog" element={<PartnerCatalogPage />} />
          <Route path="country-pricing" element={<CountryPricingPage />} />
          <Route path="routing-rules" element={<RoutingRulesPage />} />
          <Route path="country-partner-applications" element={<CountryPartnerApplicationsPage />} />
          <Route path="country-launch-config" element={<CountryLaunchConfigPage />} />
          {/* Service Orchestration Routes */}
          <Route path="service-catalog" element={<ServiceCatalogPage />} />
          <Route path="blank-products" element={<BlankProductsPage />} />
          {/* SLA & Quality Routes */}
          <Route path="sla-alerts" element={<SlaAlertsPage />} />
          {/* Contract Clients + Billing Discipline Routes */}
          <Route path="contract-clients" element={<ContractClientsPage />} />
          <Route path="negotiated-pricing" element={<NegotiatedPricingPage />} />
          <Route path="contract-slas" element={<ContractSlasPage />} />
          <Route path="recurring-invoice-plans" element={<RecurringInvoicePlansPage />} />
          {/* Admin Performance & Insights Routes */}
          <Route path="partner-performance" element={<PartnerPerformancePage />} />
          <Route path="product-insights" element={<ProductInsightsPage />} />
          <Route path="sales-ratings" element={<AdminSalesRatingsPage />} />
          <Route path="service-insights" element={<ServiceInsightsPage />} />
          {/* Reports Hub */}
          <Route path="reports/business-health" element={<BusinessHealthReportPage />} />
          <Route path="reports/financial" element={<FinancialReportsPage />} />
          <Route path="reports/sales" element={<SalesReportsPage />} />
          <Route path="reports/inventory" element={<InventoryIntelligencePage />} />
          <Route path="reports/weekly-performance" element={<WeeklyPerformanceReportPage />} />
          <Route path="weekly-digest" element={<WeeklyDigestPage />} />
          <Route path="data-integrity" element={<DataIntegrityDashboardPage />} />
          <Route path="reports/alerts" element={<AlertDashboardPage />} />
          {/* Super Admin Ecosystem Dashboard */}
          <Route path="ecosystem-dashboard" element={<SuperAdminEcosystemDashboard />} />
          {/* Super Admin Commercial Controls */}
          <Route path="group-markups" element={<GroupMarkupsPage />} />
          <Route path="partner-settlements" element={<PartnerSettlementsAdminPage />} />
          {/* Service Leads CRM */}
          <Route path="service-leads" element={<ServiceLeadsCrmTable />} />
          {/* Requests Inbox */}
          <Route path="requests-inbox" element={<AdminRequestsInboxPage />} />
          {/* Affiliate Manager */}
          <Route path="affiliate-manager" element={<AdminAffiliateManagerSimple />} />
          {/* Distribution & Margin Management */}
          <Route path="distribution-margin" element={<DistributionMarginPage />} />
          {/* Service Taxonomy */}
          <Route path="service-taxonomy" element={<ServiceTaxonomyAdminSetup />} />
          {/* Staff Performance & Commission */}
          <Route path="supervisor-dashboard" element={<SupervisorDashboardPage />} />
          <Route path="commission-rules" element={<CommissionRulesPage />} />
          {/* Auto-Numbering Configuration */}
          <Route path="auto-numbering" element={<AutoNumberingPage />} />
          {/* Numbering Rules */}
          <Route path="numbering-rules" element={<NumberingRulesPage />} />
          {/* Launch QA Checklist */}
          <Route path="launch-qa" element={<LaunchQaChecklistPage />} />
          {/* Business Pricing Admin */}
          <Route path="business-pricing-requests" element={<BusinessPricingAdminPage />} />
          {/* Production Jobs Admin */}
          <Route path="production-jobs" element={<ProductionJobsAdminPage />} />
          {/* Supervisor Performance Dashboard */}
          <Route path="supervisor-performance" element={<SupervisorPerformanceDashboardPage />} />
          {/* Service Partner Capabilities */}
          <Route path="service-partner-capabilities" element={<ServicePartnerCapabilitiesPage />} />
          {/* Growth Engine Admin Pages */}
          <Route path="commission-engine" element={<CommissionEngineAdminPage />} />
          <Route path="promotion-engine" element={<Navigate to="/admin/promotions-manager" replace />} />
          <Route path="payout-engine" element={<PayoutEngineAdminPage />} />
          <Route path="content-center" element={<Navigate to="/admin/content-studio" replace />} />
          <Route path="content-studio" element={<AdminContentStudioPage />} />
          {/* Affiliate Performance Governance */}
          <Route path="affiliate-performance-governance" element={<AffiliatePerformanceGovernancePage />} />
          {/* GTM + Partner Management */}
          <Route path="go-to-market" element={<GoToMarketConfigPage />} />
          <Route path="affiliate-partners" element={<AffiliatePartnerManagerPage />} />
          <Route path="affiliate-partners/:affiliateId" element={<AffiliatePartnerDetailPage />} />
          {/* Admin Help */}
          <Route path="help" element={<HelpAdminPage />} />
          {/* Admin Settings Hub */}
          <Route path="settings-hub" element={<AdminSettingsHubPage />} />
          {/* Admin Promotions */}
          <Route path="promotions-manager" element={<AdminPromotionsPage />} />
          {/* Discount Analytics */}
          <Route path="discount-analytics" element={<DiscountAnalyticsPage />} />
          {/* Admin Control Center */}
          <Route path="control-center" element={<AdminControlCenterPage />} />
          {/* Admin Deliveries */}
          <Route path="deliveries" element={<AdminDeliveriesPage />} />
          {/* Smart Partner Ecosystem (Unified) */}
          <Route path="partner-ecosystem" element={<PartnerEcosystemUnifiedPage />} />
          {/* Product Sub-Groups Manager */}
          <Route path="product-subgroups" element={<ProductSubgroupsManagerPage />} />
          {/* Branding Settings */}
          <Route path="branding-settings" element={<BrandingSettingsPage />} />
          {/* Sales Rating Leaderboard */}
          <Route path="sales-quality" element={<SalesDashboardQualityV3 />} />
          {/* Notification Settings */}
          <Route path="notification-settings" element={<NotificationSettingsPage />} />
        </Route>
        
        {/* Partner Portal Routes — /partner-login redirects to unified /login */}
        <Route path="/partner-login" element={<Navigate to="/login" replace />} />
        <Route path="/partner" element={<PartnerLayout />}>
          <Route index element={<PartnerDashboardPage />} />
          <Route path="catalog" element={<PartnerCatalogPage2 />} />
          <Route path="catalog/new" element={<PartnerListingEditorPage />} />
          <Route path="catalog/:listingId/edit" element={<PartnerListingEditorPage />} />
          <Route path="stock" element={<PartnerStockTablePage />} />
          <Route path="bulk-upload" element={<PartnerBulkUploadPage />} />
          <Route path="orders" element={<MyOrdersPage />} />
          <Route path="fulfillment" element={<Navigate to="/partner/orders" replace />} />
          <Route path="settlements" element={<PartnerSettlementsPage />} />
          {/* Affiliate Dashboard Routes */}
          <Route path="affiliate-dashboard" element={<AffiliateDashboardHomePage />} />
          <Route path="affiliate-promotions" element={<AffiliatePromotionsPage />} />
          <Route path="affiliate-sales" element={<AffiliateSalesPage />} />
          <Route path="affiliate-earnings" element={<AffiliateEarningsPage />} />
          <Route path="affiliate-payouts" element={<PartnerAffiliatePayoutsPage />} />
          <Route path="affiliate-profile" element={<AffiliateProfilePage />} />
          {/* Affiliate Performance Page */}
          <Route path="affiliate-performance" element={<AffiliatePerformancePage />} />
          {/* Affiliate Help */}
          <Route path="affiliate-help" element={<HelpAffiliatePage />} />
          {/* Vendor Dashboard */}
          <Route path="vendor-dashboard" element={<VendorDashboardPage />} />
          <Route path="vendor-performance" element={<VendorMyPerformancePage />} />
          {/* Assigned Work (Service + Logistics Tasks) */}
          <Route path="assigned-work" element={<PartnerAssignedWorkPage />} />
          {/* Vendor Products */}
          <Route path="vendor-products" element={<VendorProductsManagerPage />} />
          <Route path="product-submissions" element={<VendorProductSubmissionsPage />} />
          <Route path="product-upload" element={<VendorProductUploadPage />} />
          <Route path="bulk-import" element={<VendorBulkImportPage />} />
          {/* Vendor Help */}
          <Route path="vendor-help" element={<HelpVendorPage />} />
        </Route>
        
        {/* Affiliate Public Routes */}
        <Route path="/earn" element={<AffiliateProgramLandingPage />} />
        <Route path="/register/affiliate" element={<AffiliateRegisterPage />} />
        
        {/* Public Expansion Page */}
        <Route path="/launch-country" element={<ExpansionPremiumPage />} />
        
        {/* Services Discovery Page */}
        <Route path="/services-discover" element={<ServicesDiscoveryPage />} />
        
        {/* Services Page (Improved) */}
        <Route path="/services" element={<ServicesPageImproved />} />
        
        {/* Service Detail Lead-Aware Page (Guest/Logged-in flow) */}
        <Route path="/service/:slug" element={<ServiceDetailLeadAwarePage />} />
        
        {/* Dynamic Service Detail Page (New Service Pages Pack) */}
        <Route path="/services/:slug" element={<DynamicServiceDetailPage />} />
        
        {/* Quote Request Page */}
        <Route path="/request-quote" element={<QuoteRequestPage />} />
        
        {/* Public Help Routes */}
        <Route path="/help/customer" element={<HelpCustomerPage />} />
        <Route path="/help/sales" element={<HelpSalesPage />} />
        <Route path="/help/affiliate" element={<HelpAffiliatePage />} />
        <Route path="/help/vendor" element={<HelpVendorPage />} />
        <Route path="/help/admin" element={<HelpAdminPage />} />
        
        {/* NEW: Premium Public Site Routes with unified layout */}
        <Route path="/" element={<PublicSiteLayout />}>
          <Route index element={<HomepageV2Content />} />
          <Route path="marketplace" element={<MarketplaceBrowsePageContent />} />
          <Route path="marketplace/:slug" element={<MarketplaceListingDetailContent />} />
          <Route path="cart" element={<PublicCartPage />} />
          <Route path="checkout" element={<PublicCheckoutPage />} />
          <Route path="payment-proof" element={<PublicPaymentProofPage />} />
          <Route path="order-request" element={<PublicOrderRequestPage />} />
          <Route path="services" element={<ServicesPageContent />} />
          <Route path="services/:groupSlug" element={<ServiceGroupDetailContent />} />
          <Route path="services/:groupSlug/:serviceSlug" element={<ServiceDetailContent />} />
          <Route path="track-order" element={<TrackOrderPageContent />} />
          <Route path="confirm-completion" element={<ConfirmCompletionPage />} />
          <Route path="about" element={<AboutPageContent />} />
          <Route path="contact" element={<ContactPageContent />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsOfServicePage />} />
          <Route path="help" element={<PublicHelpPage />} />
        </Route>
        
        {/* /dashboard/* — Redirect to canonical /account/* */}
        <Route path="/dashboard" element={<Navigate to="/account" replace />} />
        <Route path="/dashboard/*" element={<Navigate to="/account" replace />} />
        
        {/* Account shell routes - simplified customer experience */}
        <Route path="/account" element={
          <AuthProvider>
            <CartProvider>
              <CartDrawerProvider>
                <CustomerRoute>
                  <CustomerPortalLayoutV2 />
                  <CartDrawerCompleteFlow />
                </CustomerRoute>
              </CartDrawerProvider>
            </CartProvider>
          </AuthProvider>
        }>
          <Route index element={<CustomerDashboardV3 />} />
          <Route path="explore" element={<ExplorePageV2 />} />
          <Route path="marketplace" element={<MarketplaceUnifiedPageV3 />} />
          <Route path="marketplace/:productId" element={<AccountProductDetailPage />} />
          <Route path="cart" element={<AccountCartPage />} />
          <Route path="checkout" element={<AccountCheckoutPage />} />
          <Route path="services" element={<AccountServicesPageV2 />} />
          <Route path="services/:slug" element={<AccountServiceDetailPage />} />
          <Route path="assisted-quote" element={<AssistedQuoteRequestPage />} />
          <Route path="assisted-cart" element={<AssistedSalesRequestFromCartPage />} />
          <Route path="orders" element={<OrdersPageV2 />} />
          <Route path="orders/:orderId" element={<OrderDetailPageV2 />} />
          <Route path="quotes" element={<QuotesPageV2 />} />
          <Route path="quotes/:quoteId" element={<QuoteDetailWithPayment />} />
          <Route path="invoices" element={<InvoicesPageV2 />} />
          <Route path="invoices/:invoiceId" element={<InvoiceDetailInAccountPage />} />
          <Route path="invoices/:invoiceId/pay" element={<InvoicePaymentPageV2 />} />
          <Route path="service-requests" element={<ServiceRequestsPageV2 />} />
          <Route path="points" element={<PointsPageV2 />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="statement" element={<MyStatementPageV2 />} />
          <Route path="recurring-plans" element={<RecurringPlansPage />} />
          <Route path="business-pricing" element={<BusinessPricingRequestPage />} />
          <Route path="profile/business" element={<ClientProfilePage />} />
          <Route path="my-account" element={<MyAccountPageV2 />} />
          <Route path="settings" element={<ProfileSettingsPage />} />
          <Route path="help" element={<HelpPageV3 />} />
          <Route path="rate-sales" element={<CustomerSalesRatingTasksPage />} />
        </Route>
        
        {/* Staff Workspace Routes — uses StaffAuthProvider + StaffLayout */}
        <Route path="/staff" element={
          <StaffAuthProvider>
            <StaffRoute>
              <StaffLayout />
            </StaffRoute>
          </StaffAuthProvider>
        }>
          <Route index element={<SalesDashboardV2 />} />
          <Route path="home" element={<SalesDashboardV2 />} />
          <Route path="queue" element={<SalesQueuePage />} />
          <Route path="queue-intelligence" element={<SalesQueueIntelligencePage />} />
          <Route path="performance" element={<StaffPerformanceDashboardPage />} />
          <Route path="commission-dashboard" element={<SalesCommissionDashboardPage />} />
          <Route path="promotions" element={<SalesPromotionCenterPage />} />
          <Route path="portfolio" element={<PortfolioDashboardPage />} />
          <Route path="orders" element={<SalesOrdersPageV2 />} />
          <Route path="discount-requests" element={<SalesDiscountRequestsPage />} />
          <Route path="content-hub" element={<SalesContentHubPage />} />
          <Route path="production-jobs" element={<ProductionJobsPage />} />
          <Route path="command-center" element={<SalesCommandCenterV4 />} />
          <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="help" element={<HelpSalesPage />} />
        </Route>
        
        {/* System Pages - Navigation Audit */}
        <Route path="/system/navigation-audit" element={
          <AdminAuthProvider>
            <AdminRoute>
              <NavigationAuditPage />
            </AdminRoute>
          </AdminAuthProvider>
        } />
        
        {/* Legacy Customer Portal Routes - Redirects to canonical routes */}
        <Route path="/dashboard-legacy/*" element={<Navigate to="/account" replace />} />
        
        {/* Public Customer Routes - Legacy routes for backward compatibility */}
        <Route path="/*" element={
          <AuthProvider>
            <CartProvider>
              <div className="App min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 pb-16 md:pb-0">
                  <Routes>
                    <Route path="/products" element={<Products />} />
                    <Route path="/product/:productId" element={<ProductDetail />} />
                    <Route path="/customize/:productId" element={<Customize />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/orders/:orderId" element={<OrderTracking />} />
                    <Route path="/orders/:orderId/tracking" element={<OrderTrackingPage />} />
                    <Route path="/payment/select" element={<PaymentSelectionPage />} />
                    <Route path="/payment/bank-transfer" element={<BankTransferPage />} />
                    <Route path="/payment/pending" element={<PaymentPendingPage />} />
                    <Route path="/r/:code" element={<ReferralLandingPage />} />
                    <Route path="/a/:code" element={<AffiliateLandingPage />} />
                    <Route path="/partners/apply" element={<AffiliateApplyPage />} />
                    <Route path="/affiliate/portal" element={<AffiliatePortalPage />} />
                    <Route path="/affiliate/dashboard" element={<AffiliateDashboardV2 />} />
                    <Route path="/services/maintenance" element={<EquipmentMaintenance />} />
                    <Route path="/services" element={<ServicesHubPage />} />
                    <Route path="/services/:slug/request" element={<ServiceRequestPage />} />
                    <Route path="/creative-services" element={<CreativeServicesPage />} />
                    <Route path="/creative-services/checkout" element={<CreativeServiceCheckoutPage />} />
                    <Route path="/creative-services/:slug" element={<CreativeServiceDetailPage />} />
                    <Route path="/creative-services/:slug/brief" element={<Navigate to=".." replace />} />
                    <Route path="/services/:id" element={<ServiceDetail />} />
                    <Route path="/marketplace/:slug" element={<MarketplaceListingDetailPage />} />
                    <Route path="/logo-preview" element={<LogoPreviewPage />} />
                  </Routes>
                </main>
                <Footer />
                <ChatWidget />
              </div>
            </CartProvider>
          </AuthProvider>
        } />
      </Routes>
      <Toaster position="top-center" richColors />
      <AIChatWidget />
    </BrowserRouter>
    </ConfirmModalProvider>
    </BrandingProvider>
  );
}

export default App;
