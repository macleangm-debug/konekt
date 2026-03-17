import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, Building, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { getStoredAffiliateCode } from '../lib/attribution';

export default function Auth({ defaultTab = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    company: ''
  });

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password || !registerData.full_name) {
      toast.error('Please fill in required fields');
      return;
    }
    
    if (registerData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      // Include affiliate code from localStorage
      const affiliateCode = getStoredAffiliateCode();
      await register({
        ...registerData,
        affiliate_code: affiliateCode || null
      });
      toast.success('Welcome to Konekt! You earned 100 bonus points!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4" data-testid="auth-page">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Konekt</h1>
          <p className="text-muted-foreground">Brand your business the smart way</p>
        </div>

        {/* Auth Card */}
        <div className="card-brutalist p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10"
                      data-testid="login-email"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      data-testid="login-password"
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full btn-gamified"
                  disabled={loading}
                  data-testid="login-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Login <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="reg-name">Full Name *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      type="text"
                      value={registerData.full_name}
                      onChange={(e) => setRegisterData({...registerData, full_name: e.target.value})}
                      placeholder="John Doe"
                      className="pl-10"
                      data-testid="register-name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="reg-email">Email *</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      placeholder="you@example.com"
                      className="pl-10"
                      data-testid="register-email"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="reg-password">Password *</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      placeholder="••••••••"
                      className="pl-10"
                      data-testid="register-password"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="reg-phone">Phone (optional)</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="reg-phone"
                      type="tel"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                      placeholder="+255 7XX XXX XXX"
                      className="pl-10"
                      data-testid="register-phone"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="reg-company">Company (optional)</Label>
                  <div className="relative mt-1">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="reg-company"
                      type="text"
                      value={registerData.company}
                      onChange={(e) => setRegisterData({...registerData, company: e.target.value})}
                      placeholder="Your Company Ltd"
                      className="pl-10"
                      data-testid="register-company"
                    />
                  </div>
                </div>
                
                {/* Bonus Badge */}
                <div className="bg-secondary/10 p-3 rounded-lg flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-secondary" />
                  <div>
                    <div className="font-bold text-sm">100 Bonus Points!</div>
                    <div className="text-xs text-muted-foreground">Sign up now and get free points</div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full btn-gamified"
                  disabled={loading}
                  data-testid="register-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Back Link */}
        <div className="text-center mt-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-muted-foreground"
          >
            ← Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
