import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Check, ExternalLink } from "lucide-react";
import api from "../../lib/api";

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
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
  }, []);

  useEffect(() => {
    load();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const openNotification = async (item) => {
    try {
      const token = localStorage.getItem("admin_token");
      await api.put(`/api/notifications/${item.id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOpen(false);
      navigate(item.target_url || "/admin");
      load();
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
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
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-[380px] rounded-2xl border bg-white shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-4 border-b flex items-center justify-between bg-slate-50">
              <div className="font-bold text-[#20364D]">Notifications</div>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    disabled={loading}
                    className="text-sm text-[#20364D] font-medium hover:underline disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {items.length > 0 ? (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className="block w-full text-left px-4 py-4 border-b hover:bg-slate-50 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-[#20364D] group-hover:text-[#D4A843] transition">
                          {item.title}
                        </div>
                        <div className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {item.message}
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0 mt-1" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-slate-500">
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
                    navigate("/admin/notifications");
                  }}
                  className="w-full text-center text-sm font-medium text-[#20364D] hover:underline"
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
