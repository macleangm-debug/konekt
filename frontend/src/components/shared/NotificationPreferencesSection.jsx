import React, { useEffect, useState, useCallback } from "react";
import {
  Bell, Mail, MessageSquare, ToggleLeft, ToggleRight,
  Loader2, CheckCircle, AlertCircle, Smartphone
} from "lucide-react";
import { toast } from "sonner";

/**
 * Reusable Notification Preferences section.
 * Embeds inside existing account/settings pages for any role.
 * @param {Object} props
 * @param {Function} props.apiClient — The role's API client (api, partnerApi, etc.)
 */
export default function NotificationPreferencesSection({ apiClient }) {
  const [groups, setGroups] = useState({});
  const [channels, setChannels] = useState({});
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/notifications/preferences");
      setGroups(res.data?.groups || {});
      setChannels(res.data?.channels || {});
      setRole(res.data?.role || "");
    } catch {
      // Fail silently — section is non-critical
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const togglePref = async (eventKey, channel, currentValue) => {
    // Optimistic update
    setGroups(prev => {
      const updated = { ...prev };
      for (const [gk, items] of Object.entries(updated)) {
        updated[gk] = items.map(item =>
          item.event_key === eventKey ? { ...item, [channel]: !currentValue } : item
        );
      }
      return updated;
    });

    setSaving(true);
    try {
      await apiClient.put("/api/notifications/preferences", {
        preferences: {
          [eventKey]: { [channel]: !currentValue },
        },
      });
    } catch {
      // Revert on failure
      setGroups(prev => {
        const reverted = { ...prev };
        for (const [gk, items] of Object.entries(reverted)) {
          reverted[gk] = items.map(item =>
            item.event_key === eventKey ? { ...item, [channel]: currentValue } : item
          );
        }
        return reverted;
      });
      toast.error("Failed to save preference");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="notif-prefs-loading">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const groupKeys = Object.keys(groups);
  if (groupKeys.length === 0) {
    return null; // No events for this role
  }

  return (
    <div className="space-y-4" data-testid="notification-preferences-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#20364D]" />
          <h2 className="text-base font-bold text-[#20364D]">Notification Preferences</h2>
        </div>
        {saving && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
          </span>
        )}
      </div>

      {/* Channel header legend */}
      <div className="flex items-center justify-end gap-6 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        <span className="flex items-center gap-1 w-14 justify-center">
          <Smartphone className="w-3 h-3" /> App
        </span>
        <span className={`flex items-center gap-1 w-14 justify-center ${channels.email ? "" : "opacity-40"}`}>
          <Mail className="w-3 h-3" /> Email
        </span>
        <span className={`flex items-center gap-1 w-16 justify-center ${channels.whatsapp ? "" : "opacity-40"}`}>
          <MessageSquare className="w-3 h-3" /> WA
        </span>
      </div>

      {/* Groups */}
      {groupKeys.map(groupName => (
        <div key={groupName} className="bg-white border rounded-xl overflow-hidden" data-testid={`pref-group-${groupName.toLowerCase().replace(/\s+/g, "-")}`}>
          <div className="px-5 py-3 bg-slate-50 border-b">
            <h3 className="text-sm font-semibold text-[#20364D]">{groupName}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {(groups[groupName] || []).map(item => (
              <div key={item.event_key} className="flex items-center justify-between px-5 py-3.5" data-testid={`pref-row-${item.event_key}`}>
                <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                <div className="flex items-center gap-6">
                  {/* In-app toggle */}
                  <ToggleButton
                    enabled={item.in_app}
                    available={true}
                    onClick={() => togglePref(item.event_key, "in_app", item.in_app)}
                    testId={`toggle-${item.event_key}-in_app`}
                  />
                  {/* Email toggle */}
                  <ToggleButton
                    enabled={item.email}
                    available={channels.email}
                    onClick={() => togglePref(item.event_key, "email", item.email)}
                    testId={`toggle-${item.event_key}-email`}
                  />
                  {/* WhatsApp toggle */}
                  <ToggleButton
                    enabled={item.whatsapp}
                    available={channels.whatsapp}
                    onClick={() => togglePref(item.event_key, "whatsapp", item.whatsapp)}
                    testId={`toggle-${item.event_key}-whatsapp`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Channel availability notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed">
          {channels.email ? (
            <span className="flex items-center gap-1 mb-1"><CheckCircle className="w-3 h-3 text-green-500" /> Email delivery is active.</span>
          ) : (
            <span className="flex items-center gap-1 mb-1"><AlertCircle className="w-3 h-3 text-amber-400" /> Email delivery not configured yet.</span>
          )}
          {channels.whatsapp ? (
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> WhatsApp delivery is active.</span>
          ) : (
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-400" /> WhatsApp delivery not configured yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ enabled, available, onClick, testId }) {
  if (!available) {
    return (
      <div className="w-14 flex justify-center opacity-30 cursor-not-allowed" data-testid={testId} title="Channel not configured">
        <ToggleLeft className="w-7 h-7 text-slate-300" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-14 flex justify-center transition"
      data-testid={testId}
    >
      {enabled ? (
        <ToggleRight className="w-7 h-7 text-green-500 hover:text-green-600 transition" />
      ) : (
        <ToggleLeft className="w-7 h-7 text-slate-300 hover:text-slate-400 transition" />
      )}
    </button>
  );
}
