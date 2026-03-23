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
    <div className="rounded-[2rem] border bg-white p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-2xl font-bold text-[#20364D]">Notifications</div>
        {items.filter(i => !i.read).length > 0 && (
          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
            {items.filter(i => !i.read).length} new
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-slate-500">No notifications.</div>
            <div className="text-sm text-slate-400 mt-1">You're all caught up!</div>
          </div>
        ) : (
          items.map((item, index) => (
            <div 
              key={index} 
              className={`rounded-xl p-4 ${item.read ? 'bg-slate-50' : 'bg-blue-50 border border-blue-100'}`}
            >
              <div className="flex items-start gap-3">
                {getIcon(item)}
                <div className="flex-1">
                  <div className={`font-medium ${item.read ? 'text-slate-700' : 'text-[#20364D]'}`}>
                    {item.title}
                  </div>
                  {item.text && (
                    <div className="text-sm text-slate-500 mt-1">{item.text}</div>
                  )}
                </div>
                {!item.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
