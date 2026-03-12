import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";

// Components
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import PromoBanner from "@/components/PromoBanner";

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
import ServiceDetail from "@/pages/ServiceDetail";
import CheckoutPage from "@/pages/CheckoutPage";
import CustomerDashboard from "@/pages/CustomerDashboard";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import OrderTrackingPage from "@/pages/OrderTrackingPage";
import PaymentSelectionPage from "@/pages/PaymentSelectionPage";
import BankTransferPage from "@/pages/BankTransferPage";
import PaymentPendingPage from "@/pages/PaymentPendingPage";
import ReferralLandingPage from "@/pages/ReferralLandingPage";
import MyReferralsPage from "@/pages/MyReferralsPage";
import MyPointsPage from "@/pages/MyPointsPage";
import AffiliateLandingPage from "@/pages/AffiliateLandingPage";

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
import PaymentsPage from "@/pages/admin/PaymentsPage";
import HeroBannersPage from "@/pages/admin/HeroBannersPage";
import ReferralSettingsPage from "@/pages/admin/ReferralSettingsPage";
import AffiliatesPage from "@/pages/admin/AffiliatesPage";
import AffiliateCommissionsPage from "@/pages/admin/AffiliateCommissionsPage";
import AffiliatePayoutsPage from "@/pages/admin/AffiliatePayoutsPage";
import CentralPaymentsPage from "@/pages/admin/CentralPaymentsPage";
import StatementPage from "@/pages/admin/StatementPage";

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

function App() {
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
          <Route path="crm" element={<CRMPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="quotes/kanban" element={<QuoteKanbanPage />} />
          <Route path="quotes-old" element={<AdminQuotes />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="settings/company" element={<CompanySettingsPage />} />
          <Route path="orders-ops" element={<OrdersPageOps />} />
          <Route path="production" element={<ProductionQueuePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="central-payments" element={<CentralPaymentsPage />} />
          <Route path="statements" element={<StatementPage />} />
          <Route path="hero-banners" element={<HeroBannersPage />} />
          <Route path="referral-settings" element={<ReferralSettingsPage />} />
          <Route path="affiliates" element={<AffiliatesPage />} />
          <Route path="affiliate-commissions" element={<AffiliateCommissionsPage />} />
          <Route path="affiliate-payouts" element={<AffiliatePayoutsPage />} />
        </Route>
        
        {/* Customer Routes */}
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
                    <Route path="/dashboard" element={<CustomerDashboard />} />
                    <Route path="/dashboard/orders" element={<CustomerDashboard />} />
                    <Route path="/dashboard/quotes" element={<CustomerDashboard />} />
                    <Route path="/dashboard/designs" element={<CustomerDashboard />} />
                    <Route path="/dashboard/invoices" element={<CustomerDashboard />} />
                    <Route path="/orders/:orderId" element={<OrderTracking />} />
                    <Route path="/orders/:orderId/tracking" element={<OrderTrackingPage />} />
                    <Route path="/payment/select" element={<PaymentSelectionPage />} />
                    <Route path="/payment/bank-transfer" element={<BankTransferPage />} />
                    <Route path="/payment/pending" element={<PaymentPendingPage />} />
                    <Route path="/r/:code" element={<ReferralLandingPage />} />
                    <Route path="/a/:code" element={<AffiliateLandingPage />} />
                    <Route path="/dashboard/referrals" element={<MyReferralsPage />} />
                    <Route path="/dashboard/points" element={<MyPointsPage />} />
                    <Route path="/services/maintenance" element={<EquipmentMaintenance />} />
                    <Route path="/creative-services" element={<CreativeServicesPage />} />
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
