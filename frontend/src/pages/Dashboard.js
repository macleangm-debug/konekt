import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, Star, Gift, Copy, Share2, TrendingUp, 
  Clock, Check, ChevronRight, Loader2, FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, logout, fetchUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [applyingReferral, setApplyingReferral] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, draftsRes] = await Promise.all([
        axios.get(`${API_URL}/api/orders`),
        axios.get(`${API_URL}/api/drafts`)
      ]);
      setOrders(ordersRes.data.orders || []);
      setDrafts(draftsRes.data.drafts || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user?.referral_code || '');
    toast.success('Referral code copied!');
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Konekt!',
        text: `Use my referral code ${user?.referral_code} to get 150 bonus points on Konekt!`,
        url: window.location.origin
      });
    } else {
      copyReferralCode();
    }
  };

  const applyReferralCode = async () => {
    if (!referralCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }
    
    setApplyingReferral(true);
    try {
      await axios.post(`${API_URL}/api/referrals/use`, { referral_code: referralCode });
      toast.success('Referral code applied! You earned 150 points!');
      fetchUser();
      setReferralCode('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply referral code');
    } finally {
      setApplyingReferral(false);
    }
  };

  const deleteDraft = async (draftId) => {
    try {
      await axios.delete(`${API_URL}/api/drafts/${draftId}`);
      toast.success('Draft deleted');
      setDrafts(drafts.filter(d => d.id !== draftId));
    } catch (error) {
      toast.error('Failed to delete draft');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'deposit_paid':
      case 'design_review': return 'bg-blue-100 text-blue-800';
      case 'printing':
      case 'quality_check': return 'bg-purple-100 text-purple-800';
      case 'ready':
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background py-8" data-testid="dashboard-page">
      <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-6xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {user.full_name}!</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" onClick={logout} data-testid="logout-btn">
              Logout
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid sm:grid-cols-3 gap-4 mb-8"
        >
          {/* Points Card */}
          <div className="card-brutalist p-6 bg-secondary/10">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-secondary" />
              <span className="text-xs bg-secondary/20 px-2 py-1 rounded-full">Points</span>
            </div>
            <div className="text-3xl font-bold" data-testid="user-points">{user.points}</div>
            <p className="text-sm text-muted-foreground">Available points</p>
          </div>
          
          {/* Orders Card */}
          <div className="card-brutalist p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-primary" />
              <span className="text-xs bg-primary/20 px-2 py-1 rounded-full">Orders</span>
            </div>
            <div className="text-3xl font-bold">{orders.length}</div>
            <p className="text-sm text-muted-foreground">Total orders</p>
          </div>
          
          {/* Referrals Card */}
          <div className="card-brutalist p-6 bg-accent/10">
            <div className="flex items-center justify-between mb-2">
              <Gift className="w-8 h-8 text-accent" />
              <span className="text-xs bg-accent/20 px-2 py-1 rounded-full">Referrals</span>
            </div>
            <div className="text-3xl font-bold">{user.total_referrals || 0}</div>
            <p className="text-sm text-muted-foreground">Friends invited</p>
          </div>
        </motion.div>

        {/* Referral Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-brutalist p-6 mb-8"
        >
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5" /> Referral Program
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Your Code */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Your Referral Code</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted px-4 py-3 rounded font-mono font-bold">
                  {user.referral_code}
                </div>
                <Button variant="outline" onClick={copyReferralCode} data-testid="copy-code-btn">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button onClick={shareReferral} data-testid="share-code-btn">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this code and earn 200 points per referral!
              </p>
            </div>
            
            {/* Apply Code */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Have a referral code?</label>
              <div className="flex gap-2">
                <Input 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="font-mono"
                  data-testid="referral-input"
                />
                <Button 
                  onClick={applyReferralCode}
                  disabled={applyingReferral}
                  data-testid="apply-code-btn"
                >
                  {applyingReferral ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Get 150 bonus points when you apply a referral code!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="drafts">Saved Drafts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders" className="mt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-4">Start customizing products to place your first order</p>
                <Button onClick={() => navigate('/products')} className="rounded-full" data-testid="browse-products-btn">
                  Browse Products
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {orders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link 
                      to={`/orders/${order.id}`}
                      className="card-brutalist p-4 flex items-center gap-4 group"
                      data-testid={`order-${order.id}`}
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{order.order_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.current_status)}`}>
                            {order.current_status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} item(s) • TZS {order.total_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="drafts" className="mt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : drafts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">No saved drafts</h3>
                <p className="text-muted-foreground mb-4">Save your customizations to continue later</p>
                <Button onClick={() => navigate('/products')} className="rounded-full">
                  Start Customizing
                </Button>
              </motion.div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drafts.map((draft, index) => (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card-brutalist p-4"
                    data-testid={`draft-${draft.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{draft.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(draft.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/customize/${draft.product_id}`)}
                      >
                        Continue
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteDraft(draft.id)}
                        className="text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
