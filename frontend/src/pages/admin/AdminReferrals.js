import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Gift, DollarSign, Percent, Settings, Save, 
  TrendingUp, UserPlus, Award, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const defaultSettings = {
  is_active: true,
  referrer_reward_type: 'percentage',
  referrer_reward_value: 10,
  referee_discount_type: 'percentage',
  referee_discount_value: 10,
  reward_trigger: 'first_purchase',
  min_order_amount: 0,
  max_reward_amount: 100000
};

export default function AdminReferrals() {
  const [settings, setSettings] = useState(defaultSettings);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalRewarded: 0,
    pendingRewards: 0,
    totalCredited: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch settings
      const settingsRes = await axios.get(`${API_URL}/api/admin/referral/settings`);
      setSettings(settingsRes.data || defaultSettings);
      
      // Fetch transactions
      const transactionsRes = await axios.get(`${API_URL}/api/admin/referral/transactions`);
      const txns = transactionsRes.data.transactions || [];
      setTransactions(txns);
      
      // Calculate stats
      const totalCredited = txns.filter(t => t.status === 'credited').reduce((sum, t) => sum + (t.reward_amount || 0), 0);
      const pendingRewards = txns.filter(t => t.status === 'pending').length;
      
      setStats({
        totalReferrals: transactionsRes.data.total || 0,
        totalRewarded: txns.filter(t => t.status === 'credited').length,
        pendingRewards,
        totalCredited
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/admin/referral/settings`, settings);
      toast.success('Referral settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-referrals">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Referral Program</h1>
          <p className="text-muted-foreground">Configure rewards and view referral performance</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="rounded-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-3xl font-bold text-primary">{stats.totalReferrals}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rewarded</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalRewarded}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingRewards}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Credited</p>
              <p className="text-2xl font-bold text-secondary">TZS {stats.totalCredited.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-primary">Program Settings</h2>
              <p className="text-sm text-muted-foreground">Configure how the referral program works</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Label>Program Active</Label>
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
            />
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Referrer Reward */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Referrer Reward (Person who refers)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reward Type</Label>
                <Select
                  value={settings.referrer_reward_type}
                  onValueChange={(v) => setSettings({ ...settings, referrer_reward_type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage of Order</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {settings.referrer_reward_type === 'percentage' ? 'Percentage (%)' : 'Amount (TZS)'}
                </Label>
                <Input
                  type="number"
                  value={settings.referrer_reward_value}
                  onChange={(e) => setSettings({ ...settings, referrer_reward_value: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label>Max Reward Cap (TZS)</Label>
              <Input
                type="number"
                value={settings.max_reward_amount}
                onChange={(e) => setSettings({ ...settings, max_reward_amount: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum reward per referral (0 = no limit)</p>
            </div>
          </div>
          
          {/* Referee Discount */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Percent className="w-4 h-4 text-secondary" />
              Referee Discount (New customer)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={settings.referee_discount_type}
                  onValueChange={(v) => setSettings({ ...settings, referee_discount_type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {settings.referee_discount_type === 'percentage' ? 'Percentage (%)' : 'Amount (TZS)'}
                </Label>
                <Input
                  type="number"
                  value={settings.referee_discount_value}
                  onChange={(e) => setSettings({ ...settings, referee_discount_value: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Reward Trigger */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <Label>When to Credit Reward</Label>
          <Select
            value={settings.reward_trigger}
            onValueChange={(v) => setSettings({ ...settings, reward_trigger: v })}
          >
            <SelectTrigger className="mt-1 max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="signup">When referee signs up</SelectItem>
              <SelectItem value="first_purchase">When referee makes first purchase</SelectItem>
              <SelectItem value="order_delivered">When referee's order is delivered</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Current setting: Referrer gets {settings.referrer_reward_value}% of referee's first order as store credit
          </p>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg text-primary">Recent Referral Transactions</h2>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No referrals yet</h3>
            <p className="text-muted-foreground">Referral transactions will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Referrer</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Referee</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Order Amount</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Reward</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice(0, 10).map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-primary">{txn.referrer_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{txn.referrer_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{txn.referee_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {txn.order_amount > 0 ? `TZS ${txn.order_amount.toLocaleString()}` : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-secondary">
                        TZS {(txn.reward_amount || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={
                        txn.status === 'credited' ? 'bg-green-100 text-green-700' :
                        txn.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {txn.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
