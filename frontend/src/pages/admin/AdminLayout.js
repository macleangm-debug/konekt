import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import OnboardingGate from "../../components/onboarding/OnboardingGate";
import {
  LogOut, ChevronRight, ChevronDown, Menu, X, Settings,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import NotificationBell from '../../components/admin/NotificationBell';
import BrandLogo from '../../components/branding/BrandLogo';
import { adminNavigation } from '../../config/adminNavigation';
import { useConfirmModal } from '../../contexts/ConfirmModalContext';
import OpsOnboardingModal, { isOnboardingDismissed } from '../../components/admin/OpsOnboardingModal';
import { HelpCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ───── Country Switcher ───── */
function CountrySwitcher() {
  const [countries, setCountries] = React.useState([]);
  const [active, setActive] = React.useState("TZ");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("konekt_token");
    if (!token) return;
    fetch(`${API}/api/admin/active-country-config`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setActive(d.code || "TZ"))
      .catch(() => {});
    // Also fetch all countries
    fetch(`${API}/api/admin/settings-hub`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        // Countries can be at root level or nested under value
        const cs = d?.countries?.available_countries || d?.value?.countries?.available_countries || [];
        if (cs.length > 0) setCountries(cs);
      })
      .catch(() => {});
  }, []);

  const FLAGS = { TZ: "\u{1F1F9}\u{1F1FF}", KE: "\u{1F1F0}\u{1F1EA}", UG: "\u{1F1FA}\u{1F1EC}" };
  const activeName = countries.find(c => c.code === active)?.name || active;

  if (countries.length <= 1) return null;

  return (
    <div className="relative" data-testid="country-switcher">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
        <span>{FLAGS[active] || "\u{1F30D}"}</span>
        <span>{active}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border rounded-xl shadow-lg py-1 min-w-[160px] z-50">
          {countries.map(c => (
            <button
              key={c.code}
              onClick={() => { setActive(c.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${c.code === active ? "bg-slate-50 font-bold" : ""}`}
              data-testid={`switch-country-${c.code}`}
            >
              <span>{FLAGS[c.code] || "\u{1F30D}"}</span>
              <span>{c.name} ({c.currency})</span>
              {c.code === active && <span className="ml-auto text-emerald-500 text-[10px] font-bold">Active</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Profile Dropdown ───── */
function ProfileDropdown({ name, role, onLogout }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const isAdmin = role === 'admin';

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayRole = (() => {
    switch (role) {
      case 'sales_manager': return 'Sales Manager';
      case 'finance_manager': return 'Finance Manager';
      default: return role;
    }
  })();

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
            <div className="text-xs text-slate-400 capitalize">{displayRole || "admin"}</div>
          </div>
          {isAdmin && (
            <a href="/admin/settings-hub" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition" onClick={() => setOpen(false)} data-testid="admin-profile-settings">
              <Settings className="w-4 h-4" /> Settings
            </a>
          )}
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

/* ───── Collapsible Nav Section ───── */
function NavSection({ section, isActive, badgeCounts, onNavigate }) {
  const [expanded, setExpanded] = React.useState(false);

  // Auto-expand if any child is active
  const anyChildActive = section.children?.some((c) => isActive(c.href));
  const showExpanded = expanded || anyChildActive;

  // Top-level link (no children = direct link like Dashboard)
  if (!section.children) {
    const Icon = section.icon;
    const active = isActive(section.href, section.exact);
    return (
      <Link
        to={section.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          active
            ? 'bg-[#1f3a5f] text-white shadow-sm'
            : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
        }`}
        data-testid={`nav-${section.key}`}
      >
        {Icon && <Icon className="w-5 h-5" />}
        {section.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!showExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
          anyChildActive ? 'text-[#20364D]' : 'text-slate-400 hover:text-slate-600'
        }`}
        data-testid={`nav-section-${section.key}`}
      >
        {section.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExpanded ? 'rotate-180' : ''}`} />
      </button>

      {showExpanded && (
        <div className="mt-0.5 space-y-0.5 mb-1">
          {section.children.map((child) => {
            const Icon = child.icon;
            const active = isActive(child.href);
            return (
              <Link
                key={child.href}
                to={child.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#1f3a5f] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
                }`}
                data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {child.label}
                {child.badgeKey && badgeCounts[child.badgeKey] > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white" data-testid={`badge-${child.badgeKey}`}>
                    {badgeCounts[child.badgeKey] > 99 ? "99+" : badgeCounts[child.badgeKey]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───── Main Layout ───── */
export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [badgeCounts, setBadgeCounts] = React.useState({});
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);

  // First-login onboarding — auto-open once for admin + ops roles
  React.useEffect(() => {
    if (!admin) return;
    if (!["admin", "vendor_ops", "ops"].includes(admin.role)) return;
    if (isOnboardingDismissed()) return;
    const t = setTimeout(() => setOnboardingOpen(true), 600);
    return () => clearTimeout(t);
  }, [admin]);

  // Poll sidebar counts every 30 seconds
  React.useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("konekt_token") || localStorage.getItem("admin_token") || localStorage.getItem("konekt_admin_token");
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

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    confirmAction({
      title: "Sign Out?",
      message: "You will be logged out of the admin workspace. Any unsaved changes will be lost.",
      confirmLabel: "Sign Out",
      tone: "danger",
      onConfirm: async () => {
        logout();
        navigate('/login');
      },
    });
  };

  const { confirmAction } = useConfirmModal();

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'sales': return 'bg-blue-100 text-blue-700';
      case 'sales_manager': return 'bg-teal-100 text-teal-700';
      case 'finance_manager': return 'bg-amber-100 text-amber-700';
      case 'marketing': return 'bg-purple-100 text-purple-700';
      case 'production': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'sales_manager': return 'Sales Manager';
      case 'finance_manager': return 'Finance Manager';
      default: return role;
    }
  };

  // Role-based sidebar filtering: admin sees everything, others see only permitted sections
  const filteredNavigation = React.useMemo(() => {
    const userRole = admin?.role || 'admin';
    if (userRole === 'admin') return adminNavigation;

    return adminNavigation
      .filter((section) => {
        // Top-level items without roles array → admin-only
        if (!section.roles) return false;
        return section.roles.includes(userRole);
      })
      .map((section) => {
        // If section has children, filter them too
        if (!section.children) return section;
        const filteredChildren = section.children.filter((child) => {
          if (!child.roles) return true; // child inherits section visibility
          return child.roles.includes(userRole);
        });
        if (filteredChildren.length === 0) return null; // remove empty groups
        return { ...section, children: filteredChildren };
      })
      .filter(Boolean); // remove nulls (empty groups)
  }, [admin?.role]);

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="admin-layout">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-6 border-b border-gray-100">
            <BrandLogo size="md" />
            <p className="text-slate-400 text-xs mt-2 tracking-wide">Admin Portal</p>
          </div>

          {/* Navigation — role-filtered from adminNavigation.js */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" data-testid="admin-nav">
            {filteredNavigation.map((section) => (
              <NavSection
                key={section.key}
                section={section}
                isActive={isActive}
                badgeCounts={badgeCounts}
                onNavigate={() => setSidebarOpen(false)}
              />
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
                  {getRoleDisplayName(admin?.role)}
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
                  {location.pathname === '/admin' ? 'Dashboard' : location.pathname.split('/').pop()?.replace(/-/g, ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Country Switcher */}
              <CountrySwitcher />

              {/* Help / Onboarding */}
              <button
                onClick={() => setOnboardingOpen(true)}
                className="h-10 w-10 rounded-full border bg-white flex items-center justify-center text-[#20364D] hover:bg-slate-50 transition relative"
                title="Open Ops onboarding"
                data-testid="open-ops-onboarding-btn"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

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
        <main className="px-6 pt-3 pb-6">
          <OnboardingGate>
            <div key={location.pathname} className="k-page-fade-in">
              <Outlet />
            </div>
          </OnboardingGate>
        </main>
      </div>

      <OpsOnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onCta={(path) => { setOnboardingOpen(false); navigate(path); }}
      />
    </div>
  );
}
