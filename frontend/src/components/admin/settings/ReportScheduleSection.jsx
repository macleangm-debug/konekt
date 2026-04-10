import React, { useEffect, useState, useCallback } from "react";
import { CalendarClock, Clock, Globe2, Users, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "../../../lib/api";
import { toast } from "sonner";
import SettingsSectionCard from "./SettingsSectionCard";
import { useConfirmModal } from "../../../contexts/ConfirmModalContext";

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const TIMEZONES = [
  { value: "Africa/Dar_es_Salaam", label: "East Africa (UTC+3)" },
  { value: "Africa/Nairobi", label: "Nairobi (UTC+3)" },
  { value: "Africa/Lagos", label: "West Africa (UTC+1)" },
  { value: "Africa/Johannesburg", label: "South Africa (UTC+2)" },
  { value: "Africa/Cairo", label: "Cairo (UTC+2)" },
  { value: "UTC", label: "UTC (GMT)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  const label = i < 12 ? `${i === 0 ? 12 : i}:00 AM` : `${i === 12 ? 12 : i - 12}:00 PM`;
  return { value: `${h}:00`, label };
});

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "finance_manager", label: "Finance Manager" },
];

export default function ReportScheduleSection() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [lastDelivery, setLastDelivery] = useState(null);
  const { confirmAction } = useConfirmModal();

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/settings-hub/report-schedule");
      setConfig({
        enabled: res.data.enabled ?? true,
        day: res.data.day || "monday",
        time: res.data.time || "08:00",
        timezone: res.data.timezone || "Africa/Dar_es_Salaam",
        recipient_roles: res.data.recipient_roles || ["admin", "sales_manager", "finance_manager"],
      });
      setLastDelivery(res.data.last_delivery || null);
    } catch {
      toast.error("Failed to load report schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/admin/settings-hub/report-schedule", config);
      toast.success("Report schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const deliverNow = () => {
    confirmAction({
      title: "Deliver Report Now?",
      message: "This will immediately generate and send the weekly performance report to all eligible recipients.",
      confirmLabel: "Send Now",
      tone: "success",
      onConfirm: async () => {
        setDelivering(true);
        try {
          const res = await api.post("/api/admin/settings-hub/report-schedule/deliver-now");
          if (res.data.status === "delivered") {
            toast.success(`Report delivered to ${res.data.recipients_count} recipients`);
            load();
          } else {
            toast.error("Delivery failed: " + (res.data.error || "Unknown error"));
          }
        } catch {
          toast.error("Failed to deliver report");
        } finally {
          setDelivering(false);
        }
      },
    });
  };

  const toggleRole = (role) => {
    setConfig((prev) => {
      const roles = prev.recipient_roles || [];
      return {
        ...prev,
        recipient_roles: roles.includes(role)
          ? roles.filter((r) => r !== role)
          : [...roles, role],
      };
    });
  };

  if (loading) return <div className="flex items-center justify-center py-16" data-testid="report-schedule-loading"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!config) return null;

  return (
    <div className="space-y-6" data-testid="report-schedule-section">
      <SettingsSectionCard
        title="Scheduled Report Delivery"
        description="Automatically deliver the Weekly Performance Report to selected managers. Reports are generated from the same data visible in the Weekly Report page."
      >
        {/* Enable/Disable */}
        <div className="flex items-center justify-between py-3 border-b">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-[#20364D]" />
            <div>
              <p className="font-semibold text-sm text-[#20364D]">Enable Scheduled Delivery</p>
              <p className="text-xs text-slate-500">When enabled, reports are sent automatically on schedule</p>
            </div>
          </div>
          <button
            onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
            data-testid="report-schedule-toggle"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${config.enabled ? "translate-x-6" : ""}`} />
          </button>
        </div>

        {config.enabled && (
          <div className="space-y-5 pt-4">
            {/* Day & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />Day of Week
                </label>
                <select
                  value={config.day}
                  onChange={(e) => setConfig((p) => ({ ...p, day: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#20364D]/30 focus:border-[#20364D]"
                  data-testid="report-schedule-day"
                >
                  {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />Delivery Time
                </label>
                <select
                  value={config.time}
                  onChange={(e) => setConfig((p) => ({ ...p, time: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#20364D]/30 focus:border-[#20364D]"
                  data-testid="report-schedule-time"
                >
                  {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                <Globe2 className="w-3.5 h-3.5 inline mr-1" />Timezone
              </label>
              <select
                value={config.timezone}
                onChange={(e) => setConfig((p) => ({ ...p, timezone: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#20364D]/30 focus:border-[#20364D]"
                data-testid="report-schedule-timezone"
              >
                {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>

            {/* Recipient Roles */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                <Users className="w-3.5 h-3.5 inline mr-1" />Recipients
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const active = (config.recipient_roles || []).includes(role.value);
                  return (
                    <button
                      key={role.value}
                      onClick={() => toggleRole(role.value)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        active
                          ? "bg-[#20364D] text-white border-[#20364D]"
                          : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                      }`}
                      data-testid={`report-recipient-${role.value}`}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Only users who haven't opted out of "Weekly Performance Report" in their notification preferences will receive it.
              </p>
            </div>
          </div>
        )}

        {/* Save */}
        <div className="pt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50 flex items-center gap-2"
            data-testid="report-schedule-save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </SettingsSectionCard>

      {/* Manual Delivery & Status */}
      <SettingsSectionCard
        title="Manual Delivery & Status"
        description="Manually trigger the weekly report or view the last delivery status."
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            onClick={deliverNow}
            disabled={delivering}
            className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            data-testid="report-deliver-now"
          >
            {delivering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {delivering ? "Delivering..." : "Deliver Report Now"}
          </button>

          {lastDelivery && lastDelivery.delivered_at && (
            <div className="flex items-center gap-2 text-sm text-slate-600" data-testid="report-last-delivery">
              {lastDelivery.status === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>
                Last delivery: {new Date(lastDelivery.delivered_at).toLocaleString()} — {lastDelivery.recipients_count || 0} recipients
              </span>
            </div>
          )}
        </div>
      </SettingsSectionCard>
    </div>
  );
}
