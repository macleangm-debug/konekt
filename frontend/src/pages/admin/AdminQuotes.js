import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Search, Send, Eye, Check, X, Clock,
  DollarSign, User, Building2, Mail, Phone, MoreVertical, Trash2
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

const QUOTE_STATUSES = [
  { key: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  { key: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  { key: 'viewed', label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: Eye },
  { key: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700', icon: Check },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700', icon: X },
  { key: 'expired', label: 'Expired', color: 'bg-orange-100 text-orange-700', icon: Clock },
];

export default function AdminQuotes() {
  const { token } = useAdminAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    company: '',
    items: [{ product_name: '', quantity: 1, unit_price: 0 }],
    discount: 0,
    tax: 0,
    valid_days: 30,
    notes: ''
  });

  useEffect(() => {
    fetchQuotes();
  }, [search, statusFilter, page]);

  const fetchQuotes = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await axios.get(`${API_URL}/api/sales/quotes?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuotes(response.data.quotes);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const createQuote = async () => {
    try {
      const validItems = formData.items.filter(item => item.product_name && item.quantity > 0);
      if (validItems.length === 0) {
        toast.error('Please add at least one item');
        return;
      }

      await axios.post(`${API_URL}/api/sales/quotes`, {
        ...formData,
        items: validItems
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Quote created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchQuotes();
    } catch (error) {
      toast.error('Failed to create quote');
    }
  };

  const updateQuoteStatus = async (quoteId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/sales/quotes/${quoteId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Quote status updated');
      fetchQuotes();
      if (selectedQuote?.id === quoteId) {
        setSelectedQuote({ ...selectedQuote, status: newStatus });
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const sendQuote = async (quoteId) => {
    try {
      await axios.post(`${API_URL}/api/sales/quotes/${quoteId}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Quote sent successfully');
      fetchQuotes();
    } catch (error) {
      toast.error('Failed to send quote');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      company: '',
      items: [{ product_name: '', quantity: 1, unit_price: 0 }],
      discount: 0,
      tax: 0,
      valid_days: 30,
      notes: ''
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_name: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const formatCurrency = (amount) => `TZS ${(amount || 0).toLocaleString()}`;

  const getStatusBadge = (status) => {
    const config = QUOTE_STATUSES.find(s => s.key === status);
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
    <div className="space-y-6" data-testid="admin-quotes">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Quotes Management</h1>
          <p className="text-muted-foreground">Create and manage customer quotes</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="create-quote-btn">
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUOTE_STATUSES.map((status) => {
          const count = quotes.filter(q => q.status === status.key).length;
          const StatusIcon = status.icon;
          return (
            <Card 
              key={status.key}
              className={`cursor-pointer transition-all ${statusFilter === status.key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status.key ? '' : status.key)}
            >
              <CardContent className="p-4 text-center">
                <StatusIcon className={`w-5 h-5 mx-auto mb-1 ${status.color.replace('bg-', 'text-').split(' ')[0]}`} />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{status.label}</p>
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
                placeholder="Search quotes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {(statusFilter || search) && (
              <Button variant="ghost" onClick={() => { setStatusFilter(''); setSearch(''); }}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <div className="space-y-3">
        {quotes.length > 0 ? (
          quotes.map((quote) => (
            <motion.div
              key={quote.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{quote.quote_number}</h3>
                          {getStatusBadge(quote.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {quote.customer_name}
                          </span>
                          {quote.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {quote.company}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-lg">{formatCurrency(quote.total)}</p>
                        <p className="text-xs text-muted-foreground">{quote.items?.length || 0} items</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote);
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
                            {quote.status === 'draft' && (
                              <DropdownMenuItem onClick={() => sendQuote(quote.id)}>
                                <Send className="w-4 h-4 mr-2" />
                                Send Quote
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateQuoteStatus(quote.id, 'accepted')}>
                              <Check className="w-4 h-4 mr-2" />
                              Mark Accepted
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateQuoteStatus(quote.id, 'rejected')}>
                              <X className="w-4 h-4 mr-2" />
                              Mark Rejected
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
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No quotes found</h3>
              <p className="text-muted-foreground mt-1">Create your first quote</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Quote
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="flex items-center px-4">Page {page} of {totalPages}</span>
          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Create Quote Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="customer@company.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <PhoneNumberField
                    label=""
                    prefix={formData.customer_phone_prefix || "+255"}
                    number={formData.customer_phone}
                    onPrefixChange={(v) => setFormData({ ...formData, customer_phone_prefix: v })}
                    onNumberChange={(v) => setFormData({ ...formData, customer_phone: v })}
                    testIdPrefix="quote-phone"
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
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Quote Items</h3>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Product</label>
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                        placeholder="Product name"
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-xs font-medium">Qty</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs font-medium">Unit Price</label>
                      <Input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-32 text-right">
                      <label className="text-xs font-medium">Subtotal</label>
                      <p className="font-bold py-2">{formatCurrency(item.quantity * item.unit_price)}</p>
                    </div>
                    {formData.items.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(calculateSubtotal(formData.items))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discount</span>
                <Input
                  type="number"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  className="w-32 text-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Tax</span>
                <Input
                  type="number"
                  min="0"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  className="w-32 text-right"
                />
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total</span>
                <span>{formatCurrency(calculateSubtotal(formData.items) - formData.discount + formData.tax)}</span>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Valid for (days)</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.valid_days}
                  onChange={(e) => setFormData({ ...formData, valid_days: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={createQuote} disabled={!formData.customer_name || !formData.customer_email}>
                Create Quote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6 mt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedQuote.quote_number}</h2>
                  <p className="text-muted-foreground">
                    Created {new Date(selectedQuote.created_at).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge(selectedQuote.status)}
              </div>

              {/* Customer Info */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Customer</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {selectedQuote.customer_name}
                    </div>
                    {selectedQuote.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {selectedQuote.company}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {selectedQuote.customer_email}
                    </div>
                    {selectedQuote.customer_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {selectedQuote.customer_phone}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Items</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Product</th>
                        <th className="text-center py-2">Qty</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuote.items?.map((item, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="py-2">{item.product_name}</td>
                          <td className="text-center py-2">{item.quantity}</td>
                          <td className="text-right py-2">{formatCurrency(item.unit_price)}</td>
                          <td className="text-right py-2">{formatCurrency(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t mt-4 pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedQuote.subtotal)}</span>
                    </div>
                    {selectedQuote.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedQuote.discount)}</span>
                      </div>
                    )}
                    {selectedQuote.tax > 0 && (
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{formatCurrency(selectedQuote.tax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(selectedQuote.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between">
                <div className="flex gap-2">
                  {selectedQuote.status === 'draft' && (
                    <Button onClick={() => { sendQuote(selectedQuote.id); setShowDetailModal(false); }}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Quote
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
