import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Target, FileText, Zap, Users, DollarSign,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle,
  ChevronRight, Phone, Mail, Calendar, BarChart3, PieChart
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminSales() {
  const { token } = useAdminAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sales/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `TZS ${(amount || 0).toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-purple-100 text-purple-700',
      proposal: 'bg-indigo-100 text-indigo-700',
      won: 'bg-green-100 text-green-700',
      lost: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-sales-dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Sales Dashboard</h1>
          <p className="text-muted-foreground">Track your sales performance and team activity</p>
        </div>
        <div className="flex items-center gap-2">
          {['7d', '30d', '90d', 'all'].map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p === 'all' ? 'All Time' : p}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-3xl font-bold">{dashboard?.leads?.total || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboard?.leads?.new || 0} new this period
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-3xl font-bold">{dashboard?.leads?.conversion_rate || 0}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboard?.leads?.won || 0} won / {dashboard?.leads?.total || 0} total
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(dashboard?.pipeline_value)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active opportunities
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Tasks</p>
                  <p className="text-3xl font-bold">{dashboard?.tasks?.pending || 0}</p>
                  <p className="text-xs text-red-500 mt-1">
                    {dashboard?.tasks?.overdue || 0} overdue
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-bold">{dashboard?.quotes?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Sent</span>
                <span className="font-bold">{dashboard?.quotes?.sent || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Accepted</span>
                <span className="font-bold text-green-600">{dashboard?.quotes?.accepted || 0}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Acceptance Rate</span>
                <span>{dashboard?.quotes?.acceptance_rate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lead Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>New</span>
                <Badge variant="secondary">{dashboard?.leads?.new || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Qualified</span>
                <Badge className="bg-purple-100 text-purple-700">{dashboard?.leads?.qualified || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Won</span>
                <Badge className="bg-green-100 text-green-700">{dashboard?.leads?.won || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Lost</span>
                <Badge className="bg-red-100 text-red-700">{dashboard?.leads?.lost || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-bold">{dashboard?.tasks?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending</span>
                <Badge className="bg-yellow-100 text-yellow-700">{dashboard?.tasks?.pending || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Completed</span>
                <Badge className="bg-green-100 text-green-700">{dashboard?.tasks?.completed || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Overdue</span>
                <Badge className="bg-red-100 text-red-700">{dashboard?.tasks?.overdue || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/sales/leads">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Manage Leads
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin/sales/quotes">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Create Quote
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin/sales/tasks">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  View Tasks
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin/sales/team">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Sales Team
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Leads</CardTitle>
            <Link to="/admin/sales/leads">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboard?.recent_leads?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recent_leads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary">{lead.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.company || lead.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(lead.estimated_value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No recent leads</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Tasks</CardTitle>
          <Link to="/admin/sales/tasks">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {dashboard?.recent_tasks?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recent_tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      task.status === 'completed' ? 'bg-green-100' : 
                      task.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      {task.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : task.status === 'overdue' ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.task_type?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No recent tasks</p>
          )}
        </CardContent>
      </Card>

      {/* Team Performance */}
      {dashboard?.team_performance?.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Team Performance</CardTitle>
            <Link to="/admin/sales/team">
              <Button variant="ghost" size="sm">Manage Team</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Team Member</th>
                    <th className="text-center py-3 px-4 font-medium">Leads</th>
                    <th className="text-center py-3 px-4 font-medium">Conversions</th>
                    <th className="text-center py-3 px-4 font-medium">Quotes</th>
                    <th className="text-right py-3 px-4 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.team_performance.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="font-bold text-primary text-sm">
                              {member.full_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role?.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">{member.total_leads}</td>
                      <td className="text-center py-3 px-4">
                        <span className="text-green-600 font-medium">{member.total_conversions}</span>
                      </td>
                      <td className="text-center py-3 px-4">{member.total_quotes}</td>
                      <td className="text-right py-3 px-4 font-medium">
                        {formatCurrency(member.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
