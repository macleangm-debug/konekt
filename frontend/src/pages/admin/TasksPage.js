import React, { useEffect, useState } from "react";
import { CheckSquare, Plus, Search, Calendar, User, Clock } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const taskStatuses = ["todo", "in_progress", "done", "blocked"];
const priorities = ["low", "medium", "high", "urgent"];

const statusColors = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
};

const priorityColors = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    department: "",
    related_type: "",
    related_id: "",
    due_date: "",
    priority: "medium",
    status: "todo",
  });

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const res = await adminApi.getTasks(params);
      setTasks(res.data);
    } catch (error) {
      console.error("Failed to load tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filterStatus, filterPriority]);

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (payload.due_date) {
        payload.due_date = new Date(payload.due_date).toISOString();
      } else {
        delete payload.due_date;
      }
      await adminApi.createTask(payload);
      setForm({
        title: "",
        description: "",
        assigned_to: "",
        department: "",
        related_type: "",
        related_id: "",
        due_date: "",
        priority: "medium",
        status: "todo",
      });
      setShowForm(false);
      loadTasks();
    } catch (error) {
      console.error("Failed to create task", error);
    }
  };

  const changeStatus = async (taskId, status) => {
    try {
      await adminApi.updateTaskStatus(taskId, status);
      loadTasks();
    } catch (error) {
      console.error("Failed to update task status", error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await adminApi.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      task.title?.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term) ||
      task.assigned_to?.toLowerCase().includes(term)
    );
  });

  // Group tasks by status for Kanban view
  const groupedTasks = taskStatuses.reduce((acc, status) => {
    acc[status] = filteredTasks.filter((t) => t.status === status);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="tasks-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-[#D4A843]" />
              Task Management
            </h1>
            <p className="text-slate-600 mt-1">Track and manage team tasks</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-[#2D3E50] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
            data-testid="add-task-btn"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
              data-testid="search-tasks-input"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            data-testid="filter-status-select"
          >
            <option value="">All Statuses</option>
            {taskStatuses.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            data-testid="filter-priority-select"
          >
            <option value="">All Priorities</option>
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Create Task Form */}
        {showForm && (
          <div className="rounded-2xl border bg-white p-6 mb-6 shadow-lg" data-testid="task-form">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            <form onSubmit={createTask} className="grid md:grid-cols-2 gap-4">
              <input
                className="border border-slate-300 rounded-xl px-4 py-3 md:col-span-2"
                placeholder="Task title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                data-testid="task-title-input"
              />
              <textarea
                className="border border-slate-300 rounded-xl px-4 py-3 md:col-span-2"
                placeholder="Description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="task-description-input"
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Assigned to"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                data-testid="task-assigned-input"
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                placeholder="Department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                data-testid="task-department-input"
              />
              <input
                className="border border-slate-300 rounded-xl px-4 py-3"
                type="date"
                placeholder="Due date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                data-testid="task-duedate-input"
              />
              <select
                className="border border-slate-300 rounded-xl px-4 py-3"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                data-testid="task-priority-select"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="bg-[#2D3E50] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3d5166] transition-all"
                  data-testid="save-task-btn"
                >
                  Save Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Kanban Board */}
        <div className="grid md:grid-cols-4 gap-4">
          {taskStatuses.map((status) => (
            <div key={status} className="bg-white rounded-2xl border p-4" data-testid={`task-column-${status}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold capitalize px-3 py-1 rounded-lg ${statusColors[status]}`}>
                  {status.replace("_", " ")}
                </h3>
                <span className="text-sm text-slate-500">{groupedTasks[status]?.length || 0}</span>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-400">Loading...</p>
                ) : groupedTasks[status]?.length === 0 ? (
                  <p className="text-sm text-slate-400">No tasks</p>
                ) : (
                  groupedTasks[status]?.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border p-4 bg-slate-50 hover:shadow-md transition-shadow"
                      data-testid={`task-card-${task.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{task.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        {task.assigned_to && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assigned_to}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => changeStatus(task.id, e.target.value)}
                          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                          data-testid={`task-status-select-${task.id}`}
                        >
                          {taskStatuses.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                          data-testid={`delete-task-${task.id}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {taskStatuses.map((status) => {
            const count = tasks.filter((t) => t.status === status).length;
            return (
              <div key={status} className={`rounded-xl p-4 ${statusColors[status]}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm capitalize">{status.replace("_", " ")}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
