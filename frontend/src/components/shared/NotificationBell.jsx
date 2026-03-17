import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Check, ExternalLink, AlertCircle, AlertTriangle, Info } from "lucide-react";
import api from "../../lib/api";

/**
 * Universal NotificationBell Component
 * Works for admin, staff, customer, partner, and affiliate roles
 * Supports priority-based styling (urgent, high, normal)
 * 
 * @param {string} tokenKey - localStorage key for auth token (default: "token")
 * @param {string} defaultRedirect - fallback URL when no target_url (default: "/")
 */
export default function NotificationBell({ 
  tokenKey = "token", 
  defaultRedirect = "/",
}) {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Get token from correct localStorage key
  const getToken = useCallback(() => {
    // Try multiple token keys for backward compatibility
    return localStorage.getItem(tokenKey) || 
           localStorage.getItem("admin_token") || 
           localStorage.getItem("konekt_token") ||
           localStorage.getItem("partner_token");
  }, [tokenKey]);

  const load = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      
      const [countRes, itemsRes] = await Promise.all([
        api.get("/api/notifications/unread-count", { headers }),
        api.get("/api/notifications?unread_only=true", { headers }),
      ]);

      setCount(countRes.data?.count || 0);
      setItems((itemsRes.data || []).slice(0, 10));
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [getToken]);

  useEffect(() => {
    load();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const openNotification = async (item) => {
    try {
      const token = getToken();
      await api.put(`/api/notifications/${item.id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOpen(false);
      navigate(item.target_url || defaultRedirect);
      load();
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      const token = getToken();
      await api.put("/api/notifications/mark-all-read", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch (err) {
      console.error("Failed to mark all read:", err);
    } finally {
      setLoading(false);
    }
  };

  // Priority styling
  const getPriorityStyles = (priority) => {
    switch (priority) {
      case "urgent":
        return {
          border: "border-l-4 border-red-500",
          icon: AlertCircle,
          iconColor: "text-red-500",
          badge: "bg-red-100 text-red-700",
        };
      case "high":
        return {
          border: "border-l-4 border-amber-500",
          icon: AlertTriangle,
          iconColor: "text-amber-500",
          badge: "bg-amber-100 text-amber-700",
        };
      default:
        return {
          border: "border-l-4 border-slate-200",
          icon: Info,
          iconColor: "text-slate-400",
          badge: "bg-slate-100 text-slate-600",
        };
    }
  };

  return (
    <div className="relative" data-testid="notification-bell">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border bg-white px-3 py-2 hover:bg-slate-50 transition"
        data-testid="notification-bell-btn"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 h-5 min-w-[20px] rounded-full bg-red-600 text-white text-xs flex items-center justify-center px-1 font-bold">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
            data-testid="notification-backdrop"
          />
          
          {/* Dropdown */}
          <div 
            className="absolute right-0 mt-2 w-[380px] rounded-2xl border bg-white shadow-xl z-50 overflow-hidden"
            data-testid="notification-dropdown"
          >
            <div className="px-4 py-4 border-b flex items-center justify-between bg-slate-50">
              <div className="font-bold text-[#20364D]">Notifications</div>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    disabled={loading}
                    className="text-sm text-[#20364D] font-medium hover:underline disabled:opacity-50 flex items-center gap-1"
                    data-testid="mark-all-read-btn"
                  >
                    <Check className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-slate-200 transition"
                  data-testid="close-notifications-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {items.length > 0 ? (
                items.map((item) => {
                  const priorityStyle = getPriorityStyles(item.priority);
                  const PriorityIcon = priorityStyle.icon;
                  
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openNotification(item)}
                      className={`block w-full text-left px-4 py-4 border-b hover:bg-slate-50 transition group ${priorityStyle.border}`}
                      data-testid={`notification-item-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#20364D] group-hover:text-[#D4A843] transition">
                              {item.title}
                            </span>
                            {item.priority && item.priority !== "normal" && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityStyle.badge}`}>
                                {item.priority}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {item.message}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-slate-400">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                            {item.action_key && (
                              <span className="text-[10px] text-slate-300 uppercase">
                                {item.action_key.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-slate-500" data-testid="empty-notifications">
                  <Bell className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <div className="font-medium">No unread notifications</div>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-4 py-3 border-t bg-slate-50">
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate(defaultRedirect.includes("admin") ? "/admin" : "/dashboard");
                  }}
                  className="w-full text-center text-sm font-medium text-[#20364D] hover:underline"
                  data-testid="view-all-notifications-btn"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
