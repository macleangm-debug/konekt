import React, { useEffect, useState, useRef } from "react";
import { Bell, X, Check, Clock, AlertCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const token = localStorage.getItem("token") || localStorage.getItem("staff_token") || localStorage.getItem("partner_token");

  useEffect(() => {
    if (token) {
      loadNotifications();
    }
  }, [token]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.is_read && n.is_read !== undefined ? !n.is_read : n.status === "unread").length);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "success": return <Check className="w-4 h-4 text-green-500" />;
      case "warning": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "info": return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border overflow-hidden z-50"
          data-testid="notification-dropdown"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <span className="font-semibold text-[#20364D]">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-slate-500">{unreadCount} unread</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <div>No notifications yet</div>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif._id || notif.id}
                  className={`px-4 py-3 border-b hover:bg-slate-50 cursor-pointer transition ${
                    !notif.is_read ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => {
                    markAsRead(notif._id || notif.id);
                    if (notif.target_url) {
                      window.location.href = notif.target_url;
                      setIsOpen(false);
                    }
                  }}
                  data-testid={`notification-item-${notif.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[#20364D] truncate">
                        {notif.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {notif.message}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">
                          {formatTime(notif.created_at)}
                        </span>
                        {notif.cta_label && (
                          <span className="text-[10px] font-semibold text-[#D4A843] uppercase tracking-wider">
                            {notif.cta_label} →
                          </span>
                        )}
                      </div>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <button 
                className="text-sm text-[#20364D] font-medium hover:underline"
                onClick={async () => {
                  try {
                    await fetch(`${API_URL}/api/notifications/mark-all-read`, {
                      method: "PUT",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    loadNotifications();
                  } catch {}
                }}
                data-testid="mark-all-read-btn"
              >
                Mark all read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
