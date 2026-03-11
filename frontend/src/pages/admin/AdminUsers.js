import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Plus, Edit, UserX, Users, Shield, Briefcase, 
  Palette, Factory, ChevronLeft, ChevronRight, Mail, Phone
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const roleConfig = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-700', desc: 'Full access' },
  sales: { label: 'Sales', icon: Briefcase, color: 'bg-blue-100 text-blue-700', desc: 'Orders & customers' },
  marketing: { label: 'Marketing', icon: Palette, color: 'bg-purple-100 text-purple-700', desc: 'Products & analytics' },
  production: { label: 'Production', icon: Factory, color: 'bg-green-100 text-green-700', desc: 'Order status' },
  customer: { label: 'Customer', icon: Users, color: 'bg-slate-100 text-slate-700', desc: 'Regular user' },
};

export default function AdminUsers() {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'customer'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 15);
      if (roleFilter) params.append('role', roleFilter);
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API_URL}/api/admin/users?${params}`);
      setUsers(response.data.users || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openAddModal = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role: 'sales'
    });
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setFormData({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.email) {
      toast.error('Please fill in required fields');
      return;
    }
    
    if (!editMode && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }
    
    setSaving(true);
    try {
      if (editMode) {
        await axios.put(`${API_URL}/api/admin/users/${formData.id}`, {
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: formData.role,
          is_active: formData.is_active
        });
        toast.success('User updated');
      } else {
        await axios.post(`${API_URL}/api/admin/users`, formData);
        toast.success('User created');
      }
      
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error(error.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`);
      toast.success('User deactivated');
      fetchUsers();
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      toast.error(error.response?.data?.detail || 'Failed to deactivate user');
    }
  };

  const isAdmin = admin?.role === 'admin';

  return (
    <div className="space-y-6" data-testid="admin-users">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Users</h1>
          <p className="text-muted-foreground">Manage staff and customers</p>
        </div>
        {isAdmin && (
          <Button onClick={openAddModal} className="rounded-full" data-testid="add-user-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Staff User
          </Button>
        )}
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Object.entries(roleConfig).map(([role, config]) => {
          const count = users.filter(u => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => { setRoleFilter(roleFilter === role ? '' : role); setPage(1); }}
              className={`p-4 rounded-xl border transition-colors ${
                roleFilter === role ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <config.icon className={`w-6 h-6 mb-2 ${roleFilter === role ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="font-medium text-sm">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="search-users"
            />
          </div>
          <Button type="submit">Search</Button>
          {(search || roleFilter) && (
            <Button variant="outline" onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}>
              Clear
            </Button>
          )}
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">User</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Role</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Points</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-12 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleInfo = roleConfig[user.role] || roleConfig.customer;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50" data-testid={`user-row-${user.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="font-bold text-primary">{user.full_name?.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            {user.company && (
                              <p className="text-xs text-muted-foreground">{user.company}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" /> {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Phone className="w-3 h-3" /> {user.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={roleInfo.color}>
                          <roleInfo.icon className="w-3 h-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_active !== false ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{user.points || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin && user.id !== admin?.id && (
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditModal(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.is_active !== false && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeactivate(user.id)}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} users
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-3">Page {page} of {pages}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit User' : 'Add Staff User'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="John Doe"
                className="mt-1"
                data-testid="user-name-input"
              />
            </div>
            
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@konekt.co.tz"
                className="mt-1"
                disabled={editMode}
              />
            </div>
            
            {!editMode && (
              <div>
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>
            )}
            
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+255 XXX XXX XXX"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(v) => setFormData({...formData, role: v})}
              >
                <SelectTrigger className="mt-1" data-testid="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="sales">Sales - Orders & customers</SelectItem>
                  <SelectItem value="marketing">Marketing - Products & analytics</SelectItem>
                  <SelectItem value="production">Production - Order status updates</SelectItem>
                  <SelectItem value="customer">Customer - Regular user</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {editMode && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">User can access the system</p>
                </div>
                <Switch
                  checked={formData.is_active !== false}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1" data-testid="save-user-btn">
                {saving ? 'Saving...' : (editMode ? 'Update User' : 'Create User')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
