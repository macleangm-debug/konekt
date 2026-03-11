import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Plus, Search, Filter, Clock, CheckCircle, AlertCircle,
  Calendar, User, MoreVertical, MessageSquare, X, Target, FileText,
  ShoppingCart, Sparkles
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

const TASK_TYPES = [
  { key: 'lead_follow_up', label: 'Lead Follow-up', icon: Target },
  { key: 'quote_follow_up', label: 'Quote Follow-up', icon: FileText },
  { key: 'customer_relationship', label: 'Customer Relationship', icon: User },
  { key: 'order_issue', label: 'Order Issue', icon: ShoppingCart },
  { key: 'upsell_opportunity', label: 'Upsell Opportunity', icon: Sparkles },
  { key: 'abandoned_cart', label: 'Abandoned Cart', icon: ShoppingCart },
  { key: 'custom', label: 'Custom', icon: Zap },
];

const PRIORITIES = [
  { key: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
  { key: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { key: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
];

const STATUSES = [
  { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Zap },
  { key: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: X },
];

export default function AdminSalesTasks() {
  const { token } = useAdminAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'custom',
    priority: 'medium',
    due_date: '',
    reminder_date: ''
  });

  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, priorityFilter, typeFilter, page]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (typeFilter) params.append('task_type', typeFilter);

      const response = await axios.get(`${API_URL}/api/sales/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data.tasks);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    try {
      await axios.post(`${API_URL}/api/sales/tasks`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Task created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/sales/tasks/${taskId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Task status updated');
      fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      await axios.post(`${API_URL}/api/sales/tasks/${selectedTask.id}/notes`, { note: noteText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Note added');
      setNoteText('');
      // Refresh task details
      const response = await axios.get(`${API_URL}/api/sales/tasks/${selectedTask.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTask(response.data.task);
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'custom',
      priority: 'medium',
      due_date: '',
      reminder_date: ''
    });
  };

  const getStatusBadge = (status) => {
    const config = STATUSES.find(s => s.key === status);
    return config ? (
      <Badge className={config.color}>{config.label}</Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = PRIORITIES.find(p => p.key === priority);
    return config ? (
      <Badge className={config.color}>{config.label}</Badge>
    ) : (
      <Badge variant="secondary">{priority}</Badge>
    );
  };

  const getTaskTypeIcon = (type) => {
    const config = TASK_TYPES.find(t => t.key === type);
    return config ? config.icon : Zap;
  };

  const isOverdue = (task) => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-sales-tasks">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Sales Tasks</h1>
          <p className="text-muted-foreground">Manage your team's sales activities</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="create-task-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATUSES.slice(0, 3).map((status) => {
          const count = tasks.filter(t => t.status === status.key).length;
          const StatusIcon = status.icon;
          return (
            <Card 
              key={status.key}
              className={`cursor-pointer transition-all ${statusFilter === status.key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status.key ? '' : status.key)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.color}`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{status.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'overdue' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? '' : 'overdue')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-100 text-red-700">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks.filter(t => isOverdue(t)).length}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg min-w-[150px]"
            >
              <option value="">All Types</option>
              {TASK_TYPES.map(type => (
                <option key={type.key} value={type.key}>{type.label}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg min-w-[120px]"
            >
              <option value="">All Priority</option>
              {PRIORITIES.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            {(statusFilter || priorityFilter || typeFilter || search) && (
              <Button variant="ghost" onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setTypeFilter('');
                setSearch('');
              }}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => {
            const TaskIcon = getTaskTypeIcon(task.task_type);
            const overdue = isOverdue(task);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`hover:shadow-md transition-shadow ${overdue ? 'border-l-4 border-l-red-500' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          task.status === 'completed' ? 'bg-green-100' : 
                          overdue ? 'bg-red-100' : 'bg-primary/10'
                        }`}>
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : overdue ? (
                            <AlertCircle className="w-6 h-6 text-red-600" />
                          ) : (
                            <TaskIcon className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{task.title}</h3>
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                            {task.is_automated && (
                              <Badge variant="outline" className="text-xs">Automated</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="capitalize">{task.task_type?.replace(/_/g, ' ')}</span>
                            {task.due_date && (
                              <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
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
                            {task.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'completed')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            {task.status === 'pending' && (
                              <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'in_progress')}>
                                <Zap className="w-4 h-4 mr-2" />
                                Start Working
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'cancelled')}>
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No tasks found</h3>
              <p className="text-muted-foreground mt-1">Create a task to get started</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
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

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Follow up with lead..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Task details..."
                className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Task Type</label>
                <select
                  value={formData.task_type}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {TASK_TYPES.map(type => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reminder</label>
                <Input
                  type="date"
                  value={formData.reminder_date}
                  onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={createTask} disabled={!formData.title}>Create Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-6 mt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedTask.title}</h2>
                  <p className="text-muted-foreground capitalize">{selectedTask.task_type?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedTask.status)}
                  {getPriorityBadge(selectedTask.priority)}
                </div>
              </div>

              {selectedTask.description && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p>{selectedTask.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Status Update */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((status) => (
                    <Button
                      key={status.key}
                      variant={selectedTask.status === status.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateTaskStatus(selectedTask.id, status.key)}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                    {selectedTask.notes?.length > 0 ? (
                      selectedTask.notes.map((note) => (
                        <div key={note.id} className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm">{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {note.added_by_name} • {new Date(note.added_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNote()}
                    />
                    <Button onClick={addNote} disabled={!noteText.trim()}>Add</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
