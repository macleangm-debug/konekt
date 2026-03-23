import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { toast } from 'sonner';
import BrandLogoFinal from '../../components/branding/BrandLogoFinal';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome to Admin Dashboard');
      navigate('/admin');
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'Invalid credentials or insufficient permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex items-center justify-center p-4" data-testid="admin-login-page">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <BrandLogoFinal size="lg" light className="mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-4 py-2 rounded-full text-sm">
            <Shield className="w-4 h-4" />
            Admin Portal
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-center mb-6 text-[#0f172a]">Sign In</h1>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-[#0f172a]">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@konekt.co.tz"
                  className="pl-10 h-11 border-gray-200"
                  data-testid="admin-email"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-[#0f172a]">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10 h-11 border-gray-200"
                  data-testid="admin-password"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-[#0f172a] hover:bg-[#1e293b] text-sm font-semibold"
              disabled={loading}
              data-testid="admin-login-btn"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors">
              Back to Website
            </a>
          </div>
        </div>
        
        <p className="text-center mt-6 text-white/40 text-xs">
          {new Date().getFullYear()} Konekt Limited. Admin Portal.
        </p>
      </motion.div>
    </div>
  );
}
