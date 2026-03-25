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
import BrandLogoFinal from '../../components/branding/BrandLogoFinal';

// Navigation items with moduleKey for filtering
const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, moduleKey: 'overview' },
  { type: 'divider', label: 'Sales', moduleKey: 'crm' },
  { path: '/admin/crm', label: 'Sales CRM', icon: Target, moduleKey: 'crm' },
  { path: '/admin/quotes', label: 'Quotes & Requests', icon: FileText, moduleKey: 'quotes' },
  { path: '/admin/customers', label: 'Customers', icon: Contact, moduleKey: 'crm' },
  { path: '/admin/vendors', label: 'Vendors', icon: Network, moduleKey: 'orders' },
  { type: 'divider', label: 'Operations', moduleKey: 'orders' },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart, moduleKey: 'orders' },
  { path: '/admin/service-leads', label: 'Service Leads', icon: Briefcase, moduleKey: 'support' },
  { path: '/admin/deliveries', label: 'Deliveries', icon: Route, moduleKey: 'orders' },
  { type: 'divider', label: 'Finance', moduleKey: 'finance' },
  { path: '/admin/finance-queue', label: 'Payments Queue', icon: CreditCard, moduleKey: 'finance' },
  { path: '/admin/invoices', label: 'Invoices', icon: Receipt, moduleKey: 'invoices' },
  { type: 'divider', label: 'Marketing', moduleKey: 'crm' },
  { path: '/admin/affiliates', label: 'Affiliates & Referrals', icon: Megaphone, moduleKey: 'crm' },
  { type: 'divider', label: 'Catalog', moduleKey: 'inventory' },
  { path: '/admin/products-services', label: 'Products & Services', icon: Package, moduleKey: 'inventory' },
  { path: '/admin/inventory', label: 'Stock Items', icon: Boxes, moduleKey: 'inventory' },
  { type: 'divider', label: 'Settings', moduleKey: 'settings' },
  { path: '/admin/business-settings', label: 'Business Settings', icon: Building2, moduleKey: 'settings' },
  { path: '/admin/users-roles', label: 'Users & Roles', icon: Shield, moduleKey: 'settings' },
  { path: '/admin/audit', label: 'Audit Log', icon: ClipboardList, moduleKey: 'settings' },
  { path: '/admin/service-taxonomy', label: 'Service Taxonomy', icon: Layers, moduleKey: 'settings' },
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-6 border-b border-slate-100">
            <BrandLogoFinal size="lg" />
            <p className="text-slate-400 text-xs mt-2 tracking-wide">Admin Portal</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item, index) => (
              item.type === 'divider' ? (
                <div key={index} className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                </div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive(item.path, item.exact) 
                      ? 'bg-[#20364D] text-white' 
                      : item.highlight
                      ? 'bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#20364D]'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.highlight && !isActive(item.path, item.exact) && (
                    <span className="ml-auto text-[10px] bg-[#D4A843] text-white px-2 py-0.5 rounded-full">NEW</span>
                  )}
                </Link>
              )
            ))}
          </nav>
          
          {/* User Info */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#20364D] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{admin?.full_name?.charAt(0) || 'A'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#20364D] font-medium truncate">{admin?.full_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getRoleBadgeColor(admin?.role)}`}>
                  {admin?.role}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-slate-500 hover:text-[#20364D] hover:bg-slate-100"
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
