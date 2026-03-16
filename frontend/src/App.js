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
          <Route path="crm-intelligence" element={<CrmIntelligencePage />} />
          <Route path="crm-settings" element={<CrmSettingsPage />} />
          <Route path="crm/leads/:leadId" element={<LeadDetailPage />} />
          <Route path="customer-accounts" element={<CustomerAccountsPage />} />
          <Route path="customer-accounts/:customerEmail" element={<CustomerAccountSummaryPage />} />
        </Route>
        
        {/* Customer Portal Routes - Must be before catch-all */}
        <Route path="/dashboard/*" element={
          <AuthProvider>
            <CartProvider>
              <CustomerRoute>
                <CustomerPortalLayout />
              </CustomerRoute>
            </CartProvider>
          </AuthProvider>
        }>
          <Route index element={<CustomerDashboardHome />} />
          <Route path="orders" element={<CustomerOrdersPage />} />
          <Route path="quotes" element={<CustomerQuotesPage />} />
          <Route path="quotes/:quoteId" element={<CustomerQuoteDetailPage />} />
          <Route path="invoices" element={<CustomerInvoicesPage />} />
          <Route path="invoices/:invoiceId" element={<CustomerInvoiceDetailPage />} />
          <Route path="designs" element={<MyDesignProjectsPage />} />
          <Route path="designs/:projectId" element={<CreativeProjectDetailPage />} />
          <Route path="statement" element={<MyStatementPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="maintenance" element={<MaintenanceDashboardPage />} />
          <Route path="service-requests" element={<ServiceRequestsPage />} />
          <Route path="service-requests/:requestId" element={<ServiceRequestDetailPage />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="points" element={<PointsPage />} />
          <Route path="affiliate" element={<DashboardAffiliatePage />} />
        </Route>
        
        {/* Public Customer Routes - Catch-all at the end */}
        <Route path="/*" element={
          <AuthProvider>
            <CartProvider>
              <div className="App min-h-screen flex flex-col">
                <PromoBanner />
                <Navbar />
                <main className="flex-1 pb-16 md:pb-0">
                  <Routes>
                    <Route path="/" element={<Landing />} />
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
