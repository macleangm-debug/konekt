import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Settings, 
  LogOut, ChevronRight, Bell, Search, Menu, X, Boxes, Wrench, Gift, UserPlus,
  TrendingUp, Target, FileText, Zap, UsersRound, Briefcase, Receipt, CheckSquare, Building2, Factory, ClipboardList, Columns3, Contact, CreditCard, Image, Coins, Percent, Warehouse, Layers, GitBranch, DollarSign, Megaphone
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_konekt-promo/artifacts/ul37fyug_Konekt%20Logo-04.jpg";

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/launch-readiness', label: 'Launch Readiness', icon: Zap },
  { type: 'divider', label: 'Sales' },
  { path: '/admin/crm', label: 'CRM Pipeline', icon: Target },
  { path: '/admin/crm-intelligence', label: 'CRM Intelligence', icon: TrendingUp },
  { path: '/admin/quotes', label: 'Quotes', icon: FileText },
  { path: '/admin/customers', label: 'Customers', icon: Contact },
  { path: '/admin/customer-accounts', label: 'Customer Accounts', icon: UsersRound },
  { type: 'divider', label: 'Operations' },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/admin/orders-ops', label: 'Order Operations', icon: ClipboardList },
  { path: '/admin/service-requests', label: 'Service Requests', icon: Briefcase },
  { path: '/admin/production', label: 'Production Queue', icon: Factory },
  { path: '/admin/tasks', label: 'Tasks', icon: CheckSquare },
  { type: 'divider', label: 'Inventory' },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/inventory', label: 'Stock Items', icon: Boxes },
  { path: '/admin/inventory/movements', label: 'Stock Movements', icon: TrendingUp },
  { path: '/admin/inventory/transfers', label: 'Transfers', icon: GitBranch },
  { path: '/admin/warehouses', label: 'Warehouses', icon: Warehouse },
  { path: '/admin/raw-materials', label: 'Raw Materials', icon: Layers },
  { type: 'divider', label: 'Finance' },
  { path: '/admin/invoices', label: 'Invoices', icon: Receipt },
  { path: '/admin/central-payments', label: 'Central Payments', icon: CreditCard },
  { path: '/admin/payments/record', label: 'Record Payment', icon: Coins },
  { path: '/admin/statements', label: 'Statements', icon: FileText },
  { path: '/admin/workflow', label: 'Document Flow', icon: Columns3 },
  { type: 'divider', label: 'Marketing' },
  { path: '/admin/hero-banners', label: 'Hero Banners', icon: Image },
  { path: '/admin/creative-services', label: 'Creative Services', icon: Briefcase },
  { path: '/admin/service-forms', label: 'Service Forms', icon: ClipboardList },
  { path: '/admin/referral-settings', label: 'Referral Settings', icon: Gift },
  { path: '/admin/affiliates', label: 'Affiliates', icon: Percent },
  { path: '/admin/affiliate-applications', label: 'Applications', icon: UserPlus },
  { path: '/admin/affiliate-settings', label: 'Affiliate Settings', icon: Settings },
  { path: '/admin/affiliate-payouts', label: 'Affiliate Payouts', icon: DollarSign },
  { path: '/admin/affiliate-campaigns', label: 'Promo Campaigns', icon: Megaphone },
  { type: 'divider', label: 'Settings' },
  { path: '/admin/business-settings', label: 'Business Settings', icon: Building2 },
  { path: '/admin/crm-settings', label: 'CRM Settings', icon: Target },
  { path: '/admin/settings/company', label: 'Company Settings', icon: Building2 },
  { path: '/admin/setup', label: 'Setup Lists', icon: Settings },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'sales': return 'bg-blue-100 text-blue-700';
      case 'marketing': return 'bg-purple-100 text-purple-700';
      case 'production': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="admin-layout">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <img src={LOGO_URL} alt="Konekt" className="h-10 brightness-0 invert" />
            <p className="text-white/50 text-xs mt-2">Admin Portal</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item, index) => (
              item.type === 'divider' ? (
                <div key={index} className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider">{item.label}</p>
                </div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive(item.path, item.exact) 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            ))}
          </nav>
          
          {/* User Info */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{admin?.full_name?.charAt(0) || 'A'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{admin?.full_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getRoleBadgeColor(admin?.role)}`}>
                  {admin?.role}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              
              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Admin</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium capitalize">
                  {location.pathname === '/admin' ? 'Dashboard' : location.pathname.split('/').pop()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-64 h-9 bg-slate-50 border-slate-200"
                />
              </div>
              
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
