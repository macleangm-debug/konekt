import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wrench, Search, Filter, Phone, Mail, Building, Calendar,
  CheckCircle, Clock, XCircle, MessageSquare, ChevronDown,
  Eye, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700', icon: Phone },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-700', icon: Wrench },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle }
};

export default function AdminMaintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, typeFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await axios.get(`${API_URL}/api/admin/maintenance-requests?${params}`);
      let reqs = response.data.requests || [];
      
      // Filter by type if needed
      if (typeFilter !== 'all') {
        reqs = reqs.filter(r => r.request_type === typeFilter);
      }
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        reqs = reqs.filter(r => 
          r.name?.toLowerCase().includes(searchLower) ||
          r.email?.toLowerCase().includes(searchLower) ||
          r.company?.toLowerCase().includes(searchLower)
        );
      }
      
      setRequests(reqs);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedRequest) return;
    
    setUpdating(true);
    try {
      await axios.put(
        `${API_URL}/api/admin/maintenance-requests/${selectedRequest.id}?status=${newStatus}&notes=${encodeURIComponent(adminNotes)}`
      );
      toast.success('Request updated successfully');
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Failed to update request:', error);
      toast.error('Failed to update request');
    } finally {
      setUpdating(false);
    }
  };

  const stats = {
    total: total,
    pending: requests.filter(r => r.status === 'pending').length,
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    completed: requests.filter(r => r.status === 'completed').length
  };

  return (
    <div className="space-y-6" data-testid="admin-maintenance">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Maintenance Requests</h1>
          <p className="text-muted-foreground">Manage service requests and consultations</p>
        </div>
        <Button onClick={fetchRequests} variant="outline" className="rounded-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <p className="text-sm text-muted-foreground">Total Requests</p>
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <p className="text-sm text-muted-foreground">Scheduled</p>
          <p className="text-2xl font-bold text-purple-600">{stats.scheduled}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && fetchRequests()}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="service">Service Request</SelectItem>
              <SelectItem value="consultation">Consultation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No requests found</h3>
            <p className="text-muted-foreground">Maintenance requests will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-primary">{request.name}</h3>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        <Badge variant="outline">
                          {request.request_type === 'consultation' ? 'Consultation' : 'Service'}
                        </Badge>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {request.email}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {request.phone}
                        </div>
                        {request.company && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building className="w-4 h-4" />
                            {request.company}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {request.service_type && (
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Service:</span> {request.service_type}
                        </p>
                      )}
                      
                      {request.consultation_type && (
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Consultation:</span> {request.consultation_type}
                          {request.preferred_date && ` on ${request.preferred_date}`}
                          {request.preferred_time && ` (${request.preferred_time})`}
                        </p>
                      )}
                      
                      {request.equipment_details && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                          {request.equipment_details}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setAdminNotes(request.admin_notes || '');
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View & Update
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Request Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 mt-4">
              {/* Contact Info */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Company</Label>
                  <p className="font-medium">{selectedRequest.company || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedRequest.phone}</p>
                </div>
              </div>
              
              {/* Request Info */}
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Request Type</Label>
                  <p className="font-medium capitalize">{selectedRequest.request_type}</p>
                </div>
                
                {selectedRequest.service_type && (
                  <div>
                    <Label className="text-muted-foreground">Service Type</Label>
                    <p className="font-medium">{selectedRequest.service_type}</p>
                  </div>
                )}
                
                {selectedRequest.consultation_type && (
                  <div>
                    <Label className="text-muted-foreground">Consultation Type</Label>
                    <p className="font-medium">{selectedRequest.consultation_type}</p>
                  </div>
                )}
                
                {selectedRequest.preferred_date && (
                  <div>
                    <Label className="text-muted-foreground">Preferred Schedule</Label>
                    <p className="font-medium">
                      {selectedRequest.preferred_date} ({selectedRequest.preferred_time || 'Any time'})
                    </p>
                  </div>
                )}
                
                {selectedRequest.equipment_details && (
                  <div>
                    <Label className="text-muted-foreground">Equipment Details</Label>
                    <p>{selectedRequest.equipment_details}</p>
                  </div>
                )}
                
                {(selectedRequest.message || selectedRequest.notes) && (
                  <div>
                    <Label className="text-muted-foreground">Message</Label>
                    <p>{selectedRequest.message || selectedRequest.notes}</p>
                  </div>
                )}
              </div>
              
              {/* Status Update */}
              <div className="border-t border-slate-200 pt-4">
                <Label>Update Status</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {Object.entries(statusConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => handleUpdateStatus(key)}
                        disabled={updating || selectedRequest.status === key}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          selectedRequest.status === key 
                            ? 'border-primary bg-primary/5' 
                            : 'border-slate-200 hover:border-primary/50'
                        } ${updating ? 'opacity-50' : ''}`}
                      >
                        <Icon className={`w-5 h-5 ${selectedRequest.status === key ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-medium">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Admin Notes */}
              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => window.open(`tel:${selectedRequest.phone}`)}
                  className="flex-1"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`mailto:${selectedRequest.email}`)}
                  className="flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://wa.me/${selectedRequest.phone?.replace(/\D/g, '')}`)}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
