import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Settings, 
  LogOut, ChevronRight, Bell, Search, Menu, X, Boxes, Wrench, Gift, UserPlus,
  TrendingUp, Target, FileText, Zap, UsersRound, Briefcase, Receipt, CheckSquare, Building2, Factory, ClipboardList, Columns3, Contact, CreditCard, Image, Coins, Percent, Warehouse, Layers, GitBranch, DollarSign, Megaphone, PanelTop, BarChart3, Globe, Network, Map, Route, Rocket, Award, Wallet, Shield, HelpCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { ROLE_MODULE_ACCESS } from '../../config/roleModuleAccess';
import NotificationBell from '../../components/admin/NotificationBell';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_konekt-promo/artifacts/ul37fyug_Konekt%20Logo-04.jpg";

// Navigation items with moduleKey for filtering
const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, moduleKey: 'overview' },
  { path: '/admin/control-panel', label: 'Control Panel', icon: PanelTop, moduleKey: 'settings' },
  { path: '/staff', label: 'Staff Workspace', icon: Briefcase, moduleKey: 'overview' },
  { path: '/admin/staff-performance', label: 'Staff Performance', icon: BarChart3, moduleKey: 'reports' },
  { path: '/admin/launch-readiness', label: 'Launch Readiness', icon: Zap, moduleKey: 'settings' },
  { type: 'divider', label: 'Sales', moduleKey: 'crm' },
  { path: '/admin/crm', label: 'CRM Pipeline', icon: Target, moduleKey: 'crm' },
  { path: '/admin/crm-intelligence', label: 'CRM Intelligence', icon: TrendingUp, moduleKey: 'crm' },
  { path: '/admin/quotes', label: 'Quotes', icon: FileText, moduleKey: 'quotes' },
  { path: '/admin/customers', label: 'Customers', icon: Contact, moduleKey: 'crm' },
  { path: '/admin/customer-accounts', label: 'Customer Accounts', icon: UsersRound, moduleKey: 'crm' },
  { type: 'divider', label: 'Operations', moduleKey: 'tasks' },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart, moduleKey: 'orders' },
  { path: '/admin/orders-ops', label: 'Order Operations', icon: ClipboardList, moduleKey: 'orders' },
  { path: '/admin/service-requests', label: 'Service Requests', icon: Briefcase, moduleKey: 'support' },
  { path: '/admin/production', label: 'Production Queue', icon: Factory, moduleKey: 'tasks' },
  { path: '/admin/tasks', label: 'Tasks', icon: CheckSquare, moduleKey: 'tasks' },
  { type: 'divider', label: 'Inventory & Procurement', moduleKey: 'inventory' },
  { path: '/admin/inventory-operations', label: 'Inventory Workspace', icon: Package, moduleKey: 'inventory' },
  { path: '/admin/products', label: 'Products', icon: Package, moduleKey: 'inventory' },
  { path: '/admin/inventory', label: 'Stock Items', icon: Boxes, moduleKey: 'inventory' },
  { path: '/admin/delivery-notes', label: 'Delivery Notes', icon: Briefcase, moduleKey: 'inventory' },
  { path: '/admin/goods-receiving', label: 'Goods Receiving', icon: Package, moduleKey: 'inventory' },
  { path: '/admin/suppliers', label: 'Suppliers', icon: Building2, moduleKey: 'inventory' },
  { path: '/admin/procurement/purchase-orders', label: 'Purchase Orders', icon: FileText, moduleKey: 'inventory' },
  { path: '/admin/warehouses', label: 'Warehouses', icon: Warehouse, moduleKey: 'inventory' },
  { path: '/admin/raw-materials', label: 'Raw Materials', icon: Layers, moduleKey: 'inventory' },
  { path: '/admin/inventory/movements', label: 'Stock Movements', icon: TrendingUp, moduleKey: 'inventory' },
  { path: '/admin/inventory/transfers', label: 'Transfers', icon: GitBranch, moduleKey: 'inventory' },
  { type: 'divider', label: 'Partner Ecosystem', moduleKey: 'partners' },
  { path: '/admin/partners', label: 'Partners', icon: Network, moduleKey: 'partners' },
  { path: '/admin/partner-catalog', label: 'Partner Catalog', icon: Package, moduleKey: 'partners' },
  { path: '/admin/country-pricing', label: 'Country Pricing', icon: Globe, moduleKey: 'partners' },
  { path: '/admin/routing-rules', label: 'Routing Rules', icon: Route, moduleKey: 'partners' },
  { type: 'divider', label: 'Expansion', moduleKey: 'marketing' },
  { path: '/admin/country-launch-config', label: 'Country Launch', icon: Globe, moduleKey: 'marketing' },
  { path: '/admin/country-partner-applications', label: 'Partner Applications', icon: Building2, moduleKey: 'marketing' },
  { type: 'divider', label: 'Finance', moduleKey: 'finance' },
  { path: '/admin/invoices', label: 'Invoices', icon: Receipt, moduleKey: 'invoices' },
  { path: '/admin/central-payments', label: 'Central Payments', icon: CreditCard, moduleKey: 'finance' },
  { path: '/admin/payments/record', label: 'Record Payment', icon: Coins, moduleKey: 'finance' },
  { path: '/admin/statements', label: 'Statements', icon: FileText, moduleKey: 'finance' },
  { path: '/admin/workflow', label: 'Document Flow', icon: Columns3, moduleKey: 'finance' },
  { type: 'divider', label: 'Growth Engine', moduleKey: 'marketing' },
  { path: '/admin/go-to-market', label: 'Go-To-Market Config', icon: Rocket, moduleKey: 'settings' },
  { path: '/admin/commission-engine', label: 'Commission Engine', icon: Coins, moduleKey: 'finance' },
  { path: '/admin/promotion-engine', label: 'Promotion Engine', icon: Megaphone, moduleKey: 'marketing' },
  { path: '/admin/payout-engine', label: 'Payout Engine', icon: Wallet, moduleKey: 'finance' },
  { path: '/admin/affiliate-partners', label: 'Affiliate Partners', icon: UsersRound, moduleKey: 'marketing' },
  { path: '/admin/affiliate-performance-governance', label: 'Affiliate Governance', icon: Shield, moduleKey: 'marketing' },
  { path: '/admin/service-partner-capabilities', label: 'Service Capabilities', icon: Network, moduleKey: 'partners' },
  { type: 'divider', label: 'Marketing', moduleKey: 'marketing' },
  { path: '/admin/hero-banners', label: 'Hero Banners', icon: Image, moduleKey: 'marketing' },
  { path: '/admin/creative-services', label: 'Creative Services', icon: Briefcase, moduleKey: 'marketing' },
  { path: '/admin/service-forms', label: 'Service Forms', icon: ClipboardList, moduleKey: 'marketing' },
  { path: '/admin/referral-settings', label: 'Referral Settings', icon: Gift, moduleKey: 'marketing' },
  { path: '/admin/affiliates', label: 'Affiliates', icon: Percent, moduleKey: 'marketing' },
  { path: '/admin/affiliate-applications', label: 'Applications', icon: UserPlus, moduleKey: 'marketing' },
  { path: '/admin/affiliate-settings', label: 'Affiliate Settings', icon: Settings, moduleKey: 'marketing' },
  { path: '/admin/affiliate-payouts', label: 'Affiliate Payouts', icon: DollarSign, moduleKey: 'finance' },
  { path: '/admin/affiliate-campaigns', label: 'Promo Campaigns', icon: Megaphone, moduleKey: 'marketing' },
  { type: 'divider', label: 'Settings', moduleKey: 'settings' },
  { path: '/admin/business-settings', label: 'Business Settings', icon: Building2, moduleKey: 'settings' },
  { path: '/admin/crm-settings', label: 'CRM Settings', icon: Target, moduleKey: 'crm' },
  { path: '/admin/settings/company', label: 'Company Settings', icon: Building2, moduleKey: 'settings' },
  { path: '/admin/setup', label: 'Setup Lists', icon: Settings, moduleKey: 'settings' },
  { path: '/admin/users', label: 'Users', icon: Users, moduleKey: 'settings' },
  { path: '/admin/audit', label: 'Audit Log', icon: ClipboardList, moduleKey: 'settings' },
  { path: '/admin/settings-hub', label: 'Settings Hub', icon: Settings, moduleKey: 'settings' },
  { path: '/admin/help', label: 'Help', icon: HelpCircle, moduleKey: 'settings' },
];

// Filter nav items based on user role
function getFilteredNavItems(role) {
  const normalizedRole = role === 'admin' ? 'super_admin' : (role || 'sales');
  const allowedModules = ROLE_MODULE_ACCESS[normalizedRole] || ROLE_MODULE_ACCESS['sales'];
  
  const filtered = [];
  let lastDivider = null;
  
  for (const item of navItems) {
    if (item.type === 'divider') {
      // Store divider, only add it if there are visible items in the section
      lastDivider = item;
    } else if (allowedModules.includes(item.moduleKey)) {
      // Add pending divider if we're about to add an item
      if (lastDivider && !filtered.find(f => f === lastDivider)) {
        filtered.push(lastDivider);
      }
      filtered.push(item);
    }
  }
  
  return filtered;
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  // Get filtered navigation based on user role
  const filteredNavItems = React.useMemo(() => {
    return getFilteredNavItems(admin?.role);
  }, [admin?.role]);

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
            {filteredNavItems.map((item, index) => (
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
              <NotificationBell />
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
