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
import Landing from "@/pages/Landing";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Customize from "@/pages/Customize";
import Cart from "@/pages/Cart";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import OrderTracking from "@/pages/OrderTracking";
import EquipmentMaintenance from "@/pages/EquipmentMaintenance";

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
          <Route path="settings" element={<AdminSettings />} />
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
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/orders/:orderId" element={<OrderTracking />} />
                    <Route path="/services/maintenance" element={<EquipmentMaintenance />} />
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
