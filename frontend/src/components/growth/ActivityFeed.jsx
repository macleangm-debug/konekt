import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { 
  Bell, CheckCircle, Clock, DollarSign, FileText, 
  Package, ShoppingCart, AlertTriangle, Truck, X
} from "lucide-react";

const NOTIFICATION_ICONS = {
  quote_created: FileText,
  quote_approved: CheckCircle,
  payment_received: DollarSign,
  order_confirmed: ShoppingCart,
  order_in_progress: Clock,
  order_completed: CheckCircle,
  order_shipped: Truck,
  order_delivered: Package,
  alert: AlertTriangle,
  default: Bell,
};

const NOTIFICATION_COLORS = {
  quote_created: "bg-blue-100 text-blue-600",
  quote_approved: "bg-green-100 text-green-600",
  payment_received: "bg-emerald-100 text-emerald-600",
  order_confirmed: "bg-purple-100 text-purple-600",
  order_in_progress: "bg-yellow-100 text-yellow-600",
  order_completed: "bg-green-100 text-green-600",
  order_shipped: "bg-indigo-100 text-indigo-600",
  order_delivered: "bg-teal-100 text-teal-600",
  alert: "bg-red-100 text-red-600",
  default: "bg-slate-100 text-slate-600",
};

/**
 * Activity Feed - Shows recent system activity
 */
export function ActivityFeed({ limit = 10, showHeader = true, compact = false }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const res = await api.get("/api/customer/activity-feed", { params: { limit } });
      setActivities(res.data || []);
    } catch (err) {
      // Fallback to mock data if API not available
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    const IconComponent = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
    return IconComponent;
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/4 mt-2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No recent activity</p>
        <p className="text-sm text-slate-400 mt-1">Your updates will appear here</p>
      </div>
    );
  }

  return (
    <div className={showHeader ? "border rounded-2xl bg-white p-6" : ""}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#20364D]">Recent Activity</h3>
          <Link to="/dashboard/activity" className="text-sm text-[#20364D] hover:underline">
            View All
          </Link>
        </div>
      )}
      
      <div className="space-y-3">
        {activities.map((activity) => {
          const IconComponent = getIcon(activity.type);
          const colorClass = NOTIFICATION_COLORS[activity.type] || NOTIFICATION_COLORS.default;
          
          return (
            <div 
              key={activity.id}
              className={`flex items-start gap-3 ${compact ? "p-2" : "p-3"} bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">{activity.message}</p>
                {activity.reference && (
                  <p className="text-xs text-slate-500 truncate">{activity.reference}</p>
                )}
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatTime(activity.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Notifications Panel - Bell dropdown with notifications
 */
export function NotificationsPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.get("/api/customer/notifications");
      const notifs = res.data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/customer/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/api/customer/notifications/mark-all-read");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border z-50">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#20364D]" />
          <span className="font-bold text-[#20364D]">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No notifications</p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notif) => {
            const IconComponent = NOTIFICATION_ICONS[notif.type] || Bell;
            const colorClass = NOTIFICATION_COLORS[notif.type] || NOTIFICATION_COLORS.default;
            
            return (
              <div 
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`p-3 border-b hover:bg-slate-50 cursor-pointer ${!notif.read ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${!notif.read ? 'font-medium' : 'text-slate-600'}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-3 border-t">
          <button 
            onClick={markAllAsRead}
            className="w-full text-sm text-[#20364D] hover:underline"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Notification Bell Button with unread count
 */
export function NotificationBell() {
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const res = await api.get("/api/customer/notifications/count");
        setUnreadCount(res.data?.unread || 0);
      } catch (err) {
        setUnreadCount(0);
      }
    };
    loadCount();
    
    // Poll for new notifications every 30s
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button 
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {showPanel && <NotificationsPanel onClose={() => setShowPanel(false)} />}
    </div>
  );
}

export default ActivityFeed;
