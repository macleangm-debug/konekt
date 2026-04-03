import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Settings, 
  LogOut, ChevronRight, Bell, Search, Menu, X, Boxes, Wrench, Gift, UserPlus,
  TrendingUp, Target, FileText, Zap, Briefcase, Receipt, CheckSquare, Building2, Factory, ClipboardList, Columns3, Contact, CreditCard, Image, Coins, Percent, Warehouse, Layers, GitBranch, DollarSign, Megaphone, PanelTop, BarChart3, Globe, Network, Map, Route, Rocket, Award, Wallet, Shield, HelpCircle, Inbox, UserCheck, Truck, AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { ROLE_MODULE_ACCESS } from '../../config/roleModuleAccess';
import NotificationBell from '../../components/admin/NotificationBell';
import BrandLogo from '../../components/branding/BrandLogo';

function ProfileDropdown({ name, role, onLogout }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref} data-testid="admin-profile-dropdown">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-10 w-10 rounded-full border bg-white flex items-center justify-center text-[#20364D] font-bold text-sm hover:bg-slate-50 transition"
        data-testid="admin-profile-trigger"
      >
        {String(name || "A").charAt(0).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg p-2 z-50" data-testid="admin-profile-menu">
          <div className="px-3 py-2 border-b mb-1">
            <div className="font-semibold text-[#20364D] text-sm truncate">{name}</div>
            <div className="text-xs text-slate-400 capitalize">{role || "admin"}</div>
          </div>
          <a href="/admin/settings-hub" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition" onClick={() => setOpen(false)} data-testid="admin-profile-settings">
            <Settings className="w-4 h-4" /> Settings
          </a>
          <button
            type="button"
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// Navigation items with moduleKey for filtering
const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, moduleKey: 'overview' },
  { path: '/admin/settings-hub', label: 'Settings Hub', icon: Settings, moduleKey: 'settings', highlight: true },
  { path: '/admin/control-center', label: 'Control Center', icon: PanelTop, moduleKey: 'settings' },
  { path: '/staff', label: 'Staff Workspace', icon: Briefcase, moduleKey: 'overview' },
  { path: '/admin/staff-performance', label: 'Staff Performance', icon: BarChart3, moduleKey: 'reports' },
  { path: '/admin/launch-readiness', label: 'Launch Readiness', icon: Zap, moduleKey: 'settings' },
  { type: 'divider', label: 'Sales', moduleKey: 'crm' },
  { path: '/admin/crm', label: 'CRM', icon: Target, moduleKey: 'crm' },
  { path: '/admin/quotes', label: 'Quotes', icon: FileText, moduleKey: 'quotes' },
  { path: '/admin/customers', label: 'Customers', icon: Contact, moduleKey: 'crm' },
  { path: '/admin/portfolio-overview', label: 'Portfolio Overview', icon: BarChart3, moduleKey: 'crm' },
  { path: '/admin/dormant-clients', label: 'Dormant Alerts', icon: AlertTriangle, moduleKey: 'crm' },
  { type: 'divider', label: 'Operations', moduleKey: 'orders' },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart, moduleKey: 'orders', badgeKey: 'orders' },
  { path: '/admin/requests-inbox', label: 'Requests Inbox', icon: Inbox, moduleKey: 'support', badgeKey: 'requests_inbox' },
  { path: '/admin/deliveries', label: 'Deliveries', icon: Route, moduleKey: 'orders', badgeKey: 'deliveries' },
  { path: '/admin/assignment-decisions', label: 'Assignment Decisions', icon: GitBranch, moduleKey: 'orders' },
  { type: 'divider', label: 'Finance', moduleKey: 'finance' },
  { path: '/admin/payments', label: 'Payments Queue', icon: CreditCard, moduleKey: 'finance', badgeKey: 'payments_queue' },
  { path: '/admin/invoices', label: 'Invoices', icon: Receipt, moduleKey: 'invoices' },
  { type: 'divider', label: 'Catalog', moduleKey: 'inventory' },
  { path: '/admin/catalog', label: 'Catalog Workspace', icon: Columns3, moduleKey: 'inventory' },
  { path: '/admin/vendor-supply-review', label: 'Supply Review', icon: CheckSquare, moduleKey: 'inventory' },
  { path: '/admin/vendors', label: 'Vendors', icon: Truck, moduleKey: 'inventory' },
  { path: '/admin/vendor-onboarding', label: 'Vendor Onboarding', icon: UserCheck, moduleKey: 'inventory' },
  { path: '/admin/margins', label: 'Margins', icon: Percent, moduleKey: 'inventory' },
  { type: 'divider', label: 'Partnerships', moduleKey: 'partners' },
  { path: '/admin/partnerships/affiliates', label: 'Affiliates', icon: Megaphone, moduleKey: 'partners' },
  { path: '/admin/partnerships/referrals', label: 'Referrals', icon: GitBranch, moduleKey: 'partners' },
  { path: '/admin/partnerships/commissions', label: 'Commissions', icon: Coins, moduleKey: 'partners' },
  { type: 'divider', label: 'Settings', moduleKey: 'settings' },
  { path: '/admin/sales-performance', label: 'Sales Performance', icon: TrendingUp, moduleKey: 'settings' },
  { path: '/admin/performance-governance', label: 'Performance Settings', icon: Settings, moduleKey: 'settings' },
  { path: '/admin/client-reassignment', label: 'Client Ownership', icon: Users, moduleKey: 'settings' },
  { path: '/admin/business-settings', label: 'Business Settings', icon: Building2, moduleKey: 'settings' },
  { path: '/admin/documents', label: 'Documents', icon: FileText, moduleKey: 'settings' },
  { path: '/admin/users', label: 'Users', icon: Users, moduleKey: 'settings' },
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
  const [badgeCounts, setBadgeCounts] = React.useState({});

  // Poll sidebar counts every 30 seconds
  React.useEffect(() => {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("konekt_admin_token");
    if (!token) return;
    const API = process.env.REACT_APP_BACKEND_URL || "";
    const fetchCounts = async () => {
      try {
        const res = await fetch(`${API}/api/admin/sidebar-counts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setBadgeCounts(await res.json());
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);
  
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
    navigate('/login');
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
      {/* Sidebar — matches customer/vendor shell */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-6 border-b border-gray-100">
            <BrandLogo size="md" />
            <p className="text-slate-400 text-xs mt-2 tracking-wide">Admin Portal</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item, index) => (
              item.type === 'divider' ? (
                <div key={index} className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                </div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive(item.path, item.exact) 
                      ? 'bg-[#1f3a5f] text-white shadow-sm' 
                      : item.highlight
                      ? 'text-[#D4A843] hover:bg-amber-50'
                      : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white" data-testid={`badge-${item.badgeKey}`}>
                      {badgeCounts[item.badgeKey] > 99 ? "99+" : badgeCounts[item.badgeKey]}
                    </span>
                  )}
                  {item.highlight && !isActive(item.path, item.exact) && !item.badgeKey && (
                    <span className="ml-auto text-[10px] bg-[#D4A843] text-white px-2 py-0.5 rounded-full">NEW</span>
                  )}
                </Link>
              )
            ))}
          </nav>
          
          {/* User Info */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="text-[#20364D] font-bold">{admin?.full_name?.charAt(0) || 'A'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#20364D] font-medium truncate">{admin?.full_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getRoleBadgeColor(admin?.role)}`}>
                  {admin?.role}
                </span>
              </div>
            </div>
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

              {/* Profile Dropdown */}
              <ProfileDropdown 
                name={admin?.full_name || "Admin"}
                role={admin?.role}
                onLogout={handleLogout}
              />
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
