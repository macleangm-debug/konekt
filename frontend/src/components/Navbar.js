import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, ShoppingCart, User, Star, Menu, X, ChevronDown,
  Shirt, Coffee, BookOpen, Flag, Monitor, Briefcase, Crown, Wrench
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_konekt-promo/artifacts/ul37fyug_Konekt%20Logo-04.jpg";

// Main product branches with their sub-categories
const productBranches = [
  {
    name: 'Promotional Materials',
    path: '/products?branch=Promotional Materials',
    icon: Shirt,
    subCategories: ['Apparel', 'Drinkware', 'Stationery', 'Signage']
  },
  {
    name: 'Office Equipment',
    path: '/products?branch=Office Equipment',
    icon: Briefcase,
    subCategories: ['Tech Accessories', 'Desk Organizers', 'Office Supplies']
  },
  {
    name: 'KonektSeries',
    path: '/products?branch=KonektSeries',
    icon: Crown,
    subCategories: ['Caps', 'Hats', 'Shorts'],
    isExclusive: true
  },
  {
    name: 'Service & Maintenance',
    path: '/services/maintenance',
    icon: Wrench,
    subCategories: ['Equipment Repair', 'Printer Maintenance', 'Consultation'],
    isService: true
  }
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const isActive = (path) => location.pathname === path;

  const handleBranchClick = (branch, subCategory = null) => {
    const branchData = productBranches.find(b => b.name === branch);
    
    // Handle service branch differently
    if (branchData?.isService) {
      navigate('/services/maintenance');
      setActiveDropdown(null);
      setMobileMenuOpen(false);
      return;
    }
    
    if (subCategory) {
      navigate(`/products?branch=${encodeURIComponent(branch)}&category=${encodeURIComponent(subCategory)}`);
    } else {
      navigate(`/products?branch=${encodeURIComponent(branch)}`);
    }
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100" data-testid="navbar">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3" data-testid="logo">
              <img 
                src={LOGO_URL} 
                alt="Konekt Limited" 
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className={`font-medium transition-colors ${
                  isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
                data-testid="nav-home"
              >
                Home
              </Link>
              
              {productBranches.map((branch) => (
                <div 
                  key={branch.name}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(branch.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      (branch.isService && location.pathname.includes('/services')) ||
                      (!branch.isService && location.search.includes(encodeURIComponent(branch.name)))
                        ? 'text-primary' 
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                    onClick={() => handleBranchClick(branch.name)}
                    data-testid={`nav-${branch.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {branch.isExclusive && <Crown className="w-4 h-4 text-secondary" />}
                    {branch.isService && <Wrench className="w-4 h-4 text-primary" />}
                    {branch.name}
                    <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === branch.name ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown */}
                  <AnimatePresence>
                    {activeDropdown === branch.name && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50"
                      >
                        <button
                          onClick={() => handleBranchClick(branch.name)}
                          className="w-full px-4 py-2 text-left hover:bg-slate-50 font-medium text-primary flex items-center gap-2"
                        >
                          <branch.icon className="w-4 h-4" />
                          {branch.isService ? 'View Services' : `View All ${branch.name}`}
                        </button>
                        <div className="border-t border-slate-100 my-1" />
                        {branch.subCategories.map((sub) => (
                          <button
                            key={sub}
                            onClick={() => branch.isService ? navigate('/services/maintenance') : handleBranchClick(branch.name, sub)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 text-muted-foreground hover:text-primary"
                          >
                            {sub}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Points Badge */}
              {user && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="hidden sm:flex points-badge"
                  data-testid="points-badge"
                >
                  <Star className="w-4 h-4" />
                  <span>{user.points} pts</span>
                </motion.div>
              )}

              {/* Cart */}
              <Button 
                variant="ghost" 
                size="icon"
                className="relative"
                onClick={() => navigate('/cart')}
                data-testid="cart-btn"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>

              {/* Auth */}
              {user ? (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:flex items-center gap-2 rounded-full border-primary/20 hover:bg-primary/5"
                  data-testid="dashboard-btn"
                >
                  <User className="w-4 h-4" />
                  Dashboard
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/auth')}
                  className="btn-primary-pill"
                  data-testid="login-nav-btn"
                >
                  Login
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button 
                variant="ghost" 
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-100 bg-white overflow-hidden"
            >
              <div className="container mx-auto px-6 py-4 space-y-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isActive('/') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  Home
                </Link>
                
                {productBranches.map((branch) => (
                  <div key={branch.name} className="space-y-1">
                    <button
                      onClick={() => handleBranchClick(branch.name)}
                      className={`flex items-center gap-3 p-3 rounded-xl w-full text-left ${
                        location.search.includes(encodeURIComponent(branch.name))
                          ? 'bg-primary/10 text-primary' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <branch.icon className="w-5 h-5" />
                      {branch.name}
                      {branch.isExclusive && (
                        <span className="text-xs bg-secondary text-white px-2 py-0.5 rounded-full ml-auto">Exclusive</span>
                      )}
                    </button>
                    <div className="pl-12 space-y-1">
                      {branch.subCategories.map((sub) => (
                        <button
                          key={sub}
                          onClick={() => handleBranchClick(branch.name, sub)}
                          className="block w-full text-left p-2 text-sm text-muted-foreground hover:text-primary rounded-lg hover:bg-slate-50"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50"
                    >
                      <User className="w-5 h-5" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 w-full text-left text-destructive"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-primary text-primary-foreground"
                  >
                    Login / Register
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav" data-testid="mobile-nav">
        <Link 
          to="/" 
          className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </Link>
        <Link 
          to="/products" 
          className={`mobile-nav-item ${location.pathname === '/products' ? 'active' : ''}`}
        >
          <Shirt className="w-5 h-5" />
          <span className="text-xs">Shop</span>
        </Link>
        <Link 
          to="/cart" 
          className={`mobile-nav-item ${isActive('/cart') ? 'active' : ''} relative`}
        >
          <ShoppingCart className="w-5 h-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 right-2 w-4 h-4 bg-secondary text-white text-xs font-bold rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
          <span className="text-xs">Cart</span>
        </Link>
        <Link 
          to={user ? '/dashboard' : '/auth'} 
          className={`mobile-nav-item ${isActive('/dashboard') || isActive('/auth') ? 'active' : ''}`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs">{user ? 'Account' : 'Login'}</span>
        </Link>
      </div>
    </>
  );
}
