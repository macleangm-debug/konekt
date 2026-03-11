import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UsersRound, Plus, Search, User, Mail, Phone, Award,
  Target, FileText, DollarSign, MoreVertical, Settings, X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ROLES = [
  { key: 'sales_rep', label: 'Sales Rep', color: 'bg-blue-100 text-blue-700' },
  { key: 'team_lead', label: 'Team Lead', color: 'bg-purple-100 text-purple-700' },
  { key: 'sales_manager', label: 'Sales Manager', color: 'bg-orange-100 text-orange-700' },
];

export default function AdminSalesTeam() {
  const { token } = useAdminAuth();
  const [team, setTeam] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [formData, setFormData] = useState({
    user_id: '',
    role: 'sales_rep',
    max_active_leads: 50
  });

  useEffect(() => {
    fetchTeam();
    fetchUsers();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sales/team`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeam(response.data.team);
    } catch (error) {
      console.error('Failed to fetch team:', error);
      toast.error('Failed to load sales team');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const addTeamMember = async () => {
    try {
      await axios.post(`${API_URL}/api/sales/team`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Team member added successfully');
      setShowAddModal(false);
      resetForm();
      fetchTeam();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add team member');
    }
  };

  const updateTeamMember = async () => {
    try {
      await axios.put(`${API_URL}/api/sales/team/${selectedMember.id}`, {
        role: formData.role,
        is_active: formData.is_active,
        max_active_leads: formData.max_active_leads
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Team member updated');
      setShowEditModal(false);
      fetchTeam();
    } catch (error) {
      toast.error('Failed to update team member');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      role: 'sales_rep',
      max_active_leads: 50
    });
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      role: member.role,
      is_active: member.is_active,
      max_active_leads: member.max_active_leads
    });
    setShowEditModal(true);
  };

  const formatCurrency = (amount) => `TZS ${(amount || 0).toLocaleString()}`;

  const getRoleBadge = (role) => {
    const config = ROLES.find(r => r.key === role);
    return config ? (
      <Badge className={config.color}>{config.label}</Badge>
    ) : (
      <Badge variant="secondary">{role}</Badge>
    );
  };

  // Filter out users already in the sales team
  const availableUsers = users.filter(user => 
    !team.some(member => member.user_id === user.id)
  );

  // Calculate team totals
  const teamTotals = team.reduce((acc, member) => ({
    leads: acc.leads + (member.total_leads || 0),
    conversions: acc.conversions + (member.total_conversions || 0),
    quotes: acc.quotes + (member.total_quotes || 0),
    revenue: acc.revenue + (member.total_revenue || 0)
  }), { leads: 0, conversions: 0, quotes: 0, revenue: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-sales-team">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Sales Team</h1>
          <p className="text-muted-foreground">Manage your sales team members</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} data-testid="add-member-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <UsersRound className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.length}</p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teamTotals.leads}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teamTotals.conversions}</p>
              <p className="text-sm text-muted-foreground">Conversions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatCurrency(teamTotals.revenue)}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.length > 0 ? (
          team.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary text-xl">
                          {member.full_name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{member.full_name}</h3>
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(member)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {member.email}
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {member.phone}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{member.total_leads}</p>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{member.total_conversions}</p>
                      <p className="text-xs text-muted-foreground">Converted</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{member.total_quotes}</p>
                      <p className="text-xs text-muted-foreground">Quotes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{formatCurrency(member.total_revenue)}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Active Leads</span>
                      <span className="font-medium">
                        {member.current_active_leads} / {member.max_active_leads}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${Math.min(100, (member.current_active_leads / member.max_active_leads) * 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <UsersRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No team members yet</h3>
              <p className="text-muted-foreground mt-1">Add your first sales team member</p>
              <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Member Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Select User *</label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Choose a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No available users. Create a user account first.
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {ROLES.map(role => (
                  <option key={role.key} value={role.key}>{role.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Max Active Leads</label>
              <Input
                type="number"
                min="1"
                value={formData.max_active_leads}
                onChange={(e) => setFormData({ ...formData, max_active_leads: parseInt(e.target.value) || 50 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum number of leads this member can handle at once
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={addTeamMember} disabled={!formData.user_id}>
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="font-bold text-primary">{selectedMember.full_name?.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold">{selectedMember.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {ROLES.map(role => (
                    <option key={role.key} value={role.key}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Max Active Leads</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_active_leads}
                  onChange={(e) => setFormData({ ...formData, max_active_leads: parseInt(e.target.value) || 50 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium">Active</label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button onClick={updateTeamMember}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
