import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { bootstrapAffiliateAttribution } from "@/lib/attribution";

// Components
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import PromoBanner from "@/components/PromoBanner";
import CustomerPortalLayout from "@/components/customer/CustomerPortalLayout";

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
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminStock from "@/pages/admin/AdminStock";
import AdminMaintenance from "@/pages/admin/AdminMaintenance";
import AdminOffers from "@/pages/admin/AdminOffers";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminUsers from "@/pages/admin/AdminUsers";
import CRMPage from "@/pages/admin/CRMPage";
import CRMPageV2 from "@/pages/admin/CRMPageV2";
import InventoryPage from "@/pages/admin/InventoryPage";
import TasksPage from "@/pages/admin/TasksPage";
import InvoicesPage from "@/pages/admin/InvoicesPage";
import AdminQuotes from "@/pages/admin/AdminQuotes";
import QuotesPage from "@/pages/admin/QuotesPage";
import QuoteKanbanPage from "@/pages/admin/QuoteKanbanPage";
import CompanySettingsPage from "@/pages/admin/CompanySettingsPage";
import OrdersPageOps from "@/pages/admin/OrdersPageOps";
import ProductionQueuePage from "@/pages/admin/ProductionQueuePage";
import CustomersPage from "@/pages/admin/CustomersPage";
import CustomersPageV2 from "@/pages/admin/CustomersPageV2";
import PaymentsPage from "@/pages/admin/PaymentsPage";
import HeroBannersPage from "@/pages/admin/HeroBannersPage";
import ReferralSettingsPage from "@/pages/admin/ReferralSettingsPage";
import AffiliatesPage from "@/pages/admin/AffiliatesPage";
import AffiliateCommissionsPage from "@/pages/admin/AffiliateCommissionsPage";
import AffiliatePayoutsPage from "@/pages/admin/AffiliatePayoutsPage";
import AffiliateApplicationsPage from "@/pages/admin/AffiliateApplicationsPage";
import AffiliateSettingsPage from "@/pages/admin/AffiliateSettingsPage";
import AffiliateCampaignsPage from "@/pages/admin/AffiliateCampaignsPage";
import CentralPaymentsPage from "@/pages/admin/CentralPaymentsPage";
import StatementPage from "@/pages/admin/StatementPage";
import QuotePreviewPage from "@/pages/admin/QuotePreviewPage";
import InvoicePreviewPage from "@/pages/admin/InvoicePreviewPage";
import InventoryVariantsPage from "@/pages/admin/InventoryVariantsPage";
import WarehousesPage from "@/pages/admin/WarehousesPage";
import RawMaterialsPage from "@/pages/admin/RawMaterialsPage";
import DocumentWorkflowPage from "@/pages/admin/DocumentWorkflowPage";
import RecordPaymentPage from "@/pages/admin/RecordPaymentPage";
import SetupPage from "@/pages/admin/SetupPage";
import LaunchReadinessPage from "@/pages/admin/LaunchReadinessPage";
import AuditLogPage from "@/pages/admin/AuditLogPage";
import WarehouseTransfersPage from "@/pages/admin/WarehouseTransfersPage";
import StockMovementsPage from "@/pages/admin/StockMovementsPage";
import ServiceFormsPage from "@/pages/admin/ServiceFormsPage";
import ServiceRequestsAdminPage from "@/pages/admin/ServiceRequestsAdminPage";
import ServiceRequestAdminDetailPage from "@/pages/admin/ServiceRequestAdminDetailPage";
import ServiceRequestsPage from "@/pages/dashboard/ServiceRequestsPage";
import ServiceRequestDetailPage from "@/pages/dashboard/ServiceRequestDetailPage";
import BusinessSettingsPage from "@/pages/admin/BusinessSettingsPage";
import CrmIntelligencePage from "@/pages/admin/CrmIntelligencePage";
import CrmSettingsPage from "@/pages/admin/CrmSettingsPage";
import LeadDetailPage from "@/pages/admin/LeadDetailPage";
import CustomerAccountSummaryPage from "@/pages/admin/CustomerAccountSummaryPage";
import CustomerAccountsPage from "@/pages/admin/CustomerAccountsPage";
import SuperAdminControlPanelPage from "@/pages/admin/SuperAdminControlPanelPage";
import StaffPerformancePage from "@/pages/admin/StaffPerformancePage";
import PaymentSettingsPage from "@/pages/admin/PaymentSettingsPage";

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

// Contract Clients + Billing Discipline Pack
import ContractClientsPage from "@/pages/admin/ContractClientsPage";
import NegotiatedPricingPage from "@/pages/admin/NegotiatedPricingPage";
import ContractSlasPage from "@/pages/admin/ContractSlasPage";
import RecurringInvoicePlansPage from "@/pages/admin/RecurringInvoicePlansPage";

// Admin Performance & Insights Pack
import PartnerPerformancePage from "@/pages/admin/PartnerPerformancePage";
import ProductInsightsPage from "@/pages/admin/ProductInsightsPage";
import ServiceInsightsPage from "@/pages/admin/ServiceInsightsPage";

// Super Admin Ecosystem Dashboard
import SuperAdminEcosystemDashboard from "@/pages/admin/SuperAdminEcosystemDashboard";

// Super Admin Commercial Controls
import GroupMarkupsPage from "@/pages/admin/GroupMarkupsPage";
import PartnerSettlementsAdminPage from "@/pages/admin/PartnerSettlementsAdminPage";
import PaymentProofsAdminPage from "@/pages/admin/PaymentProofsAdminPage";

// Staff Performance & Supervisor
import SupervisorDashboardPage from "@/pages/admin/SupervisorDashboardPage";
import CommissionRulesPage from "@/pages/admin/CommissionRulesPage";

// Customer Recurring Plans
import RecurringPlansPage from "@/pages/dashboard/RecurringPlansPage";

// Partner Portal Pages
import PartnerLayout from "@/layouts/PartnerLayout";
import PartnerLoginPage from "@/pages/partner/PartnerLoginPage";
import PartnerDashboardPage from "@/pages/partner/PartnerDashboardPage";
import PartnerCatalogPage2 from "@/pages/partner/PartnerCatalogPage";
import PartnerStockTablePage from "@/pages/partner/PartnerStockTablePage";
import PartnerBulkUploadPage from "@/pages/partner/PartnerBulkUploadPage";
import PartnerFulfillmentPage from "@/pages/partner/PartnerFulfillmentPage";
import PartnerSettlementsPage from "@/pages/partner/PartnerSettlementsPage";

// Public Expansion Pages
import CountryLaunchPage from "@/pages/public/CountryLaunchPage";
import MarketplaceListingDetailPage from "@/pages/public/MarketplaceListingDetailPage";
import MarketplaceBrowsePage from "@/pages/public/MarketplaceBrowsePage";

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
import AboutPageContent from "@/pages/public/AboutPageContent";
import ContactPageContent from "@/pages/public/ContactPageContent";

// New Premium Customer Pages
import DashboardOverviewPageV2 from "@/pages/customer/DashboardOverviewPageV2";
import OrdersPageV2 from "@/pages/customer/OrdersPageV2";
import QuotesPageV2 from "@/pages/customer/QuotesPageV2";
import InvoicesPageV2 from "@/pages/customer/InvoicesPageV2";
import ServiceRequestsPageV2 from "@/pages/customer/ServiceRequestsPageV2";
import PointsPageV2 from "@/pages/customer/PointsPageV2";
import MyStatementPageV2 from "@/pages/customer/MyStatementPageV2";

// Auth Pages
import StaffLoginPage from "@/pages/auth/StaffLoginPage";
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
import GoodsReceivingPage from "@/pages/admin/GoodsReceivingPage";
import SuppliersPage from "@/pages/admin/SuppliersPage";
import PurchaseOrdersPage from "@/pages/admin/PurchaseOrdersPage";

// Staff pages
import StaffWorkspaceHomePage from "@/pages/staff/StaffWorkspaceHomePage";

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
import ReferralsPage from "@/pages/dashboard/ReferralsPage";
import PointsPage from "@/pages/dashboard/PointsPage";
import DashboardAffiliatePage from "@/pages/dashboard/AffiliateDashboardPage";

// Affiliate pages
import AffiliateDashboardPage from "@/pages/affiliate/AffiliateDashboardPage";

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
    return <Navigate to="/admin/login" replace />;
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
    return <Navigate to="/auth" replace />;
  }
  
  return children;
}

function App() {
  // Bootstrap affiliate attribution from URL/localStorage on app load
  useEffect(() => {
    bootstrapAffiliateAttribution();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Chooser and Customer Login */}
        <Route path="/login" element={<LoginChooserPage />} />
        <Route path="/login/customer" element={
          <AuthProvider>
            <CustomerLoginPage />
          </AuthProvider>
        } />
        {/* Register route - redirects to Auth page with register tab */}
        <Route path="/register" element={
          <AuthProvider>
            <CartProvider>
              <Auth defaultTab="register" />
            </CartProvider>
          </AuthProvider>
        } />
        
        {/* Staff Login (separate from admin) */}
        <Route path="/staff-login" element={
          <AdminAuthProvider>
            <StaffLoginPage />
          </AdminAuthProvider>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={
          <AdminAuthProvider>
            <AdminLogin />
          </AdminAuthProvider>
        } />
        <Route path="/admin/*" element={
          <AdminAuthProvider>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </AdminAuthProvider>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="stock" element={<AdminStock />} />
          <Route path="maintenance" element={<AdminMaintenance />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="referrals" element={<AdminReferrals />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="crm" element={<CRMPageV2 />} />
          <Route path="crm-old" element={<CRMPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/variants" element={<InventoryVariantsPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="raw-materials" element={<RawMaterialsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoicePreviewPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="quotes/:id" element={<QuotePreviewPage />} />
          <Route path="quotes/kanban" element={<QuoteKanbanPage />} />
          <Route path="quotes-old" element={<AdminQuotes />} />
          <Route path="workflow" element={<DocumentWorkflowPage />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="settings/company" element={<CompanySettingsPage />} />
          <Route path="orders-ops" element={<OrdersPageOps />} />
          <Route path="production" element={<ProductionQueuePage />} />
          <Route path="customers" element={<CustomersPageV2 />} />
          <Route path="customers-old" element={<CustomersPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="central-payments" element={<CentralPaymentsPage />} />
          <Route path="statements" element={<StatementPage />} />
          <Route path="hero-banners" element={<HeroBannersPage />} />
          <Route path="referral-settings" element={<ReferralSettingsPage />} />
          <Route path="affiliates" element={<AffiliatesPage />} />
          <Route path="affiliate-applications" element={<AffiliateApplicationsPage />} />
          <Route path="affiliate-commissions" element={<AffiliateCommissionsPage />} />
          <Route path="affiliate-payouts" element={<AffiliatePayoutsPage />} />
          <Route path="affiliate-settings" element={<AffiliateSettingsPage />} />
          <Route path="affiliate-campaigns" element={<AffiliateCampaignsPage />} />
          <Route path="payments/record" element={<RecordPaymentPage />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="launch-readiness" element={<LaunchReadinessPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="inventory/transfers" element={<WarehouseTransfersPage />} />
          <Route path="inventory/movements" element={<StockMovementsPage />} />
          <Route path="service-forms" element={<ServiceFormsPage />} />
          <Route path="service-requests" element={<ServiceRequestsAdminPage />} />
          <Route path="service-requests/:requestId" element={<ServiceRequestAdminDetailPage />} />
          <Route path="business-settings" element={<BusinessSettingsPage />} />
          <Route path="payment-settings" element={<PaymentSettingsPage />} />
          <Route path="crm-intelligence" element={<CrmIntelligencePage />} />
          <Route path="crm-settings" element={<CrmSettingsPage />} />
          <Route path="crm/leads/:leadId" element={<LeadDetailPage />} />
          <Route path="customer-accounts" element={<CustomerAccountsPage />} />
          <Route path="customer-accounts/:customerEmail" element={<CustomerAccountSummaryPage />} />
          <Route path="control-panel" element={<SuperAdminControlPanelPage />} />
          <Route path="staff-performance" element={<StaffPerformancePage />} />
          <Route path="inventory-operations" element={<InventoryOperationsPage />} />
          <Route path="delivery-notes" element={<DeliveryNotesPage />} />
          <Route path="goods-receiving" element={<GoodsReceivingPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="procurement/purchase-orders" element={<PurchaseOrdersPage />} />
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
          <Route path="service-insights" element={<ServiceInsightsPage />} />
          {/* Super Admin Ecosystem Dashboard */}
          <Route path="ecosystem-dashboard" element={<SuperAdminEcosystemDashboard />} />
          {/* Super Admin Commercial Controls */}
          <Route path="group-markups" element={<GroupMarkupsPage />} />
          <Route path="partner-settlements" element={<PartnerSettlementsAdminPage />} />
          <Route path="payment-proofs" element={<PaymentProofsAdminPage />} />
          {/* Staff Performance & Commission */}
          <Route path="supervisor-dashboard" element={<SupervisorDashboardPage />} />
          <Route path="commission-rules" element={<CommissionRulesPage />} />
        </Route>
        
        {/* Partner Portal Routes */}
        <Route path="/partner-login" element={<PartnerLoginPage />} />
        <Route path="/partner" element={<PartnerLayout />}>
          <Route index element={<PartnerDashboardPage />} />
          <Route path="catalog" element={<PartnerCatalogPage2 />} />
          <Route path="catalog/new" element={<PartnerListingEditorPage />} />
          <Route path="catalog/:listingId/edit" element={<PartnerListingEditorPage />} />
          <Route path="stock" element={<PartnerStockTablePage />} />
          <Route path="bulk-upload" element={<PartnerBulkUploadPage />} />
          <Route path="fulfillment" element={<PartnerFulfillmentPage />} />
          <Route path="settlements" element={<PartnerSettlementsPage />} />
          <Route path="affiliate-dashboard" element={<AffiliateDashboardPageV2 />} />
        </Route>
        
        {/* Affiliate Public Routes */}
        <Route path="/earn" element={<AffiliateProgramLandingPage />} />
        <Route path="/register/affiliate" element={<AffiliateRegisterPage />} />
        
        {/* Public Expansion Page */}
        <Route path="/launch-country" element={<CountryLaunchPage />} />
        
        {/* NEW: Premium Public Site Routes with unified layout */}
        <Route path="/" element={<PublicSiteLayout />}>
          <Route index element={<HomepageV2Content />} />
          <Route path="marketplace" element={<MarketplaceBrowsePageContent />} />
          <Route path="marketplace/:slug" element={<MarketplaceListingDetailContent />} />
          <Route path="services" element={<ServicesPageContent />} />
          <Route path="services/:groupSlug" element={<ServiceGroupDetailContent />} />
          <Route path="services/:groupSlug/:serviceSlug" element={<ServiceDetailContent />} />
          <Route path="track-order" element={<TrackOrderPageContent />} />
          <Route path="about" element={<AboutPageContent />} />
          <Route path="contact" element={<ContactPageContent />} />
        </Route>
        
        {/* NEW: Premium Customer Portal with unified layout */}
        <Route path="/dashboard" element={
          <AuthProvider>
            <CartProvider>
              <CustomerRoute>
                <CustomerPortalLayoutV2 />
              </CustomerRoute>
            </CartProvider>
          </AuthProvider>
        }>
          <Route index element={<DashboardOverviewPageV2 />} />
          <Route path="orders" element={<OrdersPageV2 />} />
          <Route path="quotes" element={<QuotesPageV2 />} />
          <Route path="invoices" element={<InvoicesPageV2 />} />
          <Route path="service-requests" element={<ServiceRequestsPageV2 />} />
          <Route path="points" element={<PointsPageV2 />} />
          <Route path="referrals" element={<PointsPageV2 />} />
          <Route path="statement" element={<MyStatementPageV2 />} />
          <Route path="recurring-plans" element={<RecurringPlansPage />} />
        </Route>
        
        {/* Staff Workspace Route */}
        <Route path="/staff" element={
          <AdminAuthProvider>
            <AdminRoute>
              <StaffWorkspaceHomePage />
            </AdminRoute>
          </AdminAuthProvider>
        } />
        
        {/* Legacy Customer Portal Routes - Keep for detailed pages */}
        <Route path="/dashboard-legacy/*" element={
          <AuthProvider>
            <CartProvider>
              <CustomerRoute>
                <CustomerPortalLayout />
              </CustomerRoute>
            </CartProvider>
          </AuthProvider>
        }>
          <Route path="orders/:orderId" element={<CustomerOrdersPage />} />
          <Route path="quotes/:quoteId" element={<CustomerQuoteDetailPage />} />
          <Route path="invoices/:invoiceId" element={<CustomerInvoiceDetailPage />} />
          <Route path="designs" element={<MyDesignProjectsPage />} />
          <Route path="designs/:projectId" element={<CreativeProjectDetailPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="maintenance" element={<MaintenanceDashboardPage />} />
          <Route path="service-requests/:requestId" element={<ServiceRequestDetailPage />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="affiliate" element={<DashboardAffiliatePage />} />
        </Route>
        
        {/* Public Customer Routes - Legacy routes for backward compatibility */}
        <Route path="/*" element={
          <AuthProvider>
            <CartProvider>
              <div className="App min-h-screen flex flex-col">
                <PromoBanner />
                <Navbar />
                <main className="flex-1 pb-16 md:pb-0">
                  <Routes>
                    <Route path="/old-home" element={<Landing />} />
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
                    <Route path="/affiliate/dashboard" element={<AffiliateDashboardPage />} />
                    <Route path="/services/maintenance" element={<EquipmentMaintenance />} />
                    <Route path="/services" element={<ServicesHubPage />} />
                    <Route path="/services/:slug/request" element={<ServiceRequestPage />} />
                    <Route path="/creative-services" element={<CreativeServicesPage />} />
                    <Route path="/creative-services/checkout" element={<CreativeServiceCheckoutPage />} />
                    <Route path="/creative-services/:slug" element={<CreativeServiceDetailPage />} />
                    <Route path="/creative-services/:slug/brief" element={<Navigate to=".." replace />} />
                    <Route path="/services/:id" element={<ServiceDetail />} />
                    <Route path="/marketplace/:slug" element={<MarketplaceListingDetailPage />} />
                  </Routes>
                </main>
                <Footer />
                <ChatWidget />
                <ExitIntentPopup />
              </div>
            </CartProvider>
          </AuthProvider>
        } />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}

export default App;
