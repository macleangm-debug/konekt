import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Plus, Search, Filter, Phone, Mail, Building2, User,
  ChevronRight, MoreVertical, Edit, Trash2, MessageSquare, Calendar,
  DollarSign, Tag, Clock, CheckCircle, X, ArrowRight
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
import PhoneNumberField from '../../components/forms/PhoneNumberField';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LEAD_STATUSES = [
  { key: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { key: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-700' },
  { key: 'proposal', label: 'Proposal', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700' },
  { key: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { key: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

const LEAD_SOURCES = [
  'website', 'referral', 'social_media', 'cold_call', 'event', 'partner', 'other'
];

export default function AdminLeads() {
  const { token } = useAdminAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'website',
    estimated_value: 0,
    notes: '',
    tags: []
  });

  const [contactForm, setContactForm] = useState({
    contact_type: 'call',
    notes: '',
    outcome: '',
    next_follow_up: ''
  });

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, sourceFilter, page]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (sourceFilter) params.append('source', sourceFilter);

      const response = await axios.get(`${API_URL}/api/sales/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(response.data.leads);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const createLead = async () => {
    try {
      await axios.post(`${API_URL}/api/sales/leads`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lead created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchLeads();
    } catch (error) {
      toast.error('Failed to create lead');
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/sales/leads/${leadId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lead status updated');
      fetchLeads();
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const logContact = async () => {
    try {
      await axios.post(`${API_URL}/api/sales/leads/${selectedLead.id}/contact`, contactForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Contact logged successfully');
      setShowContactModal(false);
      setContactForm({ contact_type: 'call', notes: '', outcome: '', next_follow_up: '' });
      fetchLeads();
    } catch (error) {
      toast.error('Failed to log contact');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      source: 'website',
      estimated_value: 0,
      notes: '',
      tags: []
    });
  };

  const formatCurrency = (amount) => `TZS ${(amount || 0).toLocaleString()}`;

  const getStatusBadge = (status) => {
    const config = LEAD_STATUSES.find(s => s.key === status);
    return config ? (
      <Badge className={config.color}>{config.label}</Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-leads">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Leads Management</h1>
          <p className="text-muted-foreground">Track and manage your sales pipeline</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="create-lead-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {LEAD_STATUSES.map((status) => {
          const count = leads.filter(l => l.status === status.key).length;
          return (
            <Card 
              key={status.key} 
              className={`cursor-pointer transition-all ${statusFilter === status.key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status.key ? '' : status.key)}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <Badge className={`${status.color} mt-1`}>{status.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg min-w-[150px]"
            >
              <option value="">All Sources</option>
              {LEAD_SOURCES.map(source => (
                <option key={source} value={source}>{source.replace('_', ' ')}</option>
              ))}
            </select>
            {(statusFilter || sourceFilter || search) && (
              <Button variant="ghost" onClick={() => {
                setStatusFilter('');
                setSourceFilter('');
                setSearch('');
              }}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="space-y-3">
        {leads.length > 0 ? (
          leads.map((lead) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary text-lg">{lead.name?.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg truncate">{lead.name}</h3>
                          {getStatusBadge(lead.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          {lead.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {lead.company}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-lg">{formatCurrency(lead.estimated_value)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{lead.source?.replace('_', ' ')}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowDetailModal(true);
                          }}
                        >
                          View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedLead(lead);
                              setShowContactModal(true);
                            }}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Log Contact
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `tel:${lead.phone}`}>
                              <Phone className="w-4 h-4 mr-2" />
                              Call
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `mailto:${lead.email}`}>
                              <Mail className="w-4 h-4 mr-2" />
                              Email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No leads found</h3>
              <p className="text-muted-foreground mt-1">Create your first lead to get started</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Lead Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <PhoneNumberField
                  label=""
                  prefix={formData.phone_prefix || "+255"}
                  number={formData.phone}
                  onPrefixChange={(v) => setFormData({ ...formData, phone_prefix: v })}
                  onNumberChange={(v) => setFormData({ ...formData, phone: v })}
                  testIdPrefix="lead-phone"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Company Ltd"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Position</label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Marketing Manager"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {LEAD_SOURCES.map(source => (
                    <option key={source} value={source}>{source.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Estimated Value (TZS)</label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                placeholder="500000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this lead..."
                className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={createLead} disabled={!formData.name || !formData.email}>
                Create Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6 mt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-bold text-primary text-2xl">{selectedLead.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedLead.name}</h2>
                    <p className="text-muted-foreground">{selectedLead.company}</p>
                    {selectedLead.position && (
                      <p className="text-sm text-muted-foreground">{selectedLead.position}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(selectedLead.estimated_value)}</p>
                  {getStatusBadge(selectedLead.status)}
                </div>
              </div>

              {/* Status Pipeline */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {LEAD_STATUSES.map((status) => (
                    <Button
                      key={status.key}
                      variant={selectedLead.status === status.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateLeadStatus(selectedLead.id, status.key)}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <div className="space-y-2 mt-2">
                      <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-primary hover:underline">
                        <Mail className="w-4 h-4" />
                        {selectedLead.email}
                      </a>
                      {selectedLead.phone && (
                        <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Phone className="w-4 h-4" />
                          {selectedLead.phone}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Details</p>
                    <div className="space-y-2 mt-2">
                      <p className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        Source: <span className="capitalize">{selectedLead.source?.replace('_', ' ')}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Created: {new Date(selectedLead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedLead.notes && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                    <p>{selectedLead.notes}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowContactModal(true);
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Log Contact
                </Button>
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Log Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Contact with {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Contact Type</label>
              <select
                value={contactForm.contact_type}
                onChange={(e) => setContactForm({ ...contactForm, contact_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes *</label>
              <textarea
                value={contactForm.notes}
                onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                placeholder="What was discussed..."
                className="w-full px-3 py-2 border rounded-lg min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Outcome</label>
              <Input
                value={contactForm.outcome}
                onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })}
                placeholder="e.g., Interested, Need more info, etc."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Next Follow-up Date</label>
              <Input
                type="date"
                value={contactForm.next_follow_up}
                onChange={(e) => setContactForm({ ...contactForm, next_follow_up: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowContactModal(false)}>Cancel</Button>
              <Button onClick={logContact} disabled={!contactForm.notes}>
                Log Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
