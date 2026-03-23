import React from "react";
import { Bell, CheckCircle, AlertCircle, Info } from "lucide-react";

export default function QuickNotificationsPanel({ items = [] }) {
  const getIcon = (item) => {
    if (item.title?.toLowerCase().includes("received") || item.title?.toLowerCase().includes("confirmed")) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (item.title?.toLowerCase().includes("alert") || item.title?.toLowerCase().includes("urgent")) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold text-[#0f172a]">Notifications</div>
        {items.filter(i => !i.read).length > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
            {items.filter(i => !i.read).length} new
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <div className="text-sm text-[#64748b]">No notifications.</div>
            <div className="text-xs text-[#94a3b8] mt-1">You're all caught up!</div>
          </div>
        ) : (
          items.map((item, index) => (
            <div 
              key={index} 
              className={`rounded-lg p-3 ${item.read ? 'bg-[#f8fafc]' : 'bg-blue-50 border border-blue-100'}`}
            >
              <div className="flex items-start gap-3">
                {getIcon(item)}
                <div className="flex-1">
                  <div className={`text-sm font-medium ${item.read ? 'text-[#64748b]' : 'text-[#0f172a]'}`}>
                    {item.title}
                  </div>
                  {item.text && (
                    <div className="text-xs text-[#94a3b8] mt-0.5">{item.text}</div>
                  )}
                </div>
                {!item.read && (
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
